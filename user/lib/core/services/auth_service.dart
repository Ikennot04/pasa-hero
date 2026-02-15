import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:http/http.dart' as http;
import 'dart:convert';

class AuthService {
  final FirebaseAuth _auth = FirebaseAuth.instance;
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  
  // Lazy initialization of GoogleSignIn to avoid errors if clientId is not set
  GoogleSignIn? _googleSignIn;
  GoogleSignIn get googleSignIn {
    _googleSignIn ??= GoogleSignIn(
      // IMPORTANT: For web, serverClientId MUST be null (reads from index.html meta tag)
      // Setting serverClientId for web causes assertion error
      // For Android/iOS: Use the Web OAuth Client ID as serverClientId
      serverClientId: kIsWeb 
          ? null 
          : _getWebClientId(), // Use Web client ID for mobile platforms only
      scopes: ['email', 'profile', 'openid'], // 'openid' scope is required for idToken
    );
    return _googleSignIn!;
  }
  
  // Store the Google account from getGoogleUserEmail() to reuse in signUpWithGoogle()
  // Use static to persist across AuthService instances
  static GoogleSignInAccount? _cachedGoogleAccount;
  
  // Getter for cached account
  GoogleSignInAccount? get cachedGoogleAccount => _cachedGoogleAccount;
  
  // Setter for cached account
  void setCachedGoogleAccount(GoogleSignInAccount? account) {
    _cachedGoogleAccount = account;
  }

  // Get the Web OAuth Client ID from Firebase options
  // This is needed for Android/iOS Google Sign-In
  // IMPORTANT: Replace this with your actual Web OAuth Client ID from Firebase Console
  // Get it from: Firebase Console > Project Settings > Your apps > Web app > OAuth client ID
  String? _getWebClientId() {
    // Web OAuth Client ID from Firebase Console
    // This is required for Android/iOS Google Sign-In to work properly
    // The Web Client ID is used as serverClientId for mobile platforms
    const String? webClientId = '464857061623-ohoa4afqj73bka9l3mn4rv7mdrpe0ra0.apps.googleusercontent.com';
    
    return webClientId;
  }

  // Get current user
  User? get currentUser => _auth.currentUser;

  // Auth state changes stream
  Stream<User?> get authStateChanges => _auth.authStateChanges();

  // Sign in with email and password
  Future<UserCredential> signInWithEmailAndPassword({
    required String email,
    required String password,
  }) async {
    try {
      final credential = await _auth.signInWithEmailAndPassword(
        email: email.trim(),
        password: password,
      );
      return credential;
    } on FirebaseAuthException catch (e) {
      throw _handleAuthException(e);
    } catch (e) {
      throw Exception('An unexpected error occurred: $e');
    }
  }

  // Register with email and password
  Future<UserCredential> registerWithEmailAndPassword({
    required String email,
    required String password,
    required String firstName,
    required String lastName,
  }) async {
    try {
      final credential = await _auth.createUserWithEmailAndPassword(
        email: email.trim(),
        password: password,
      );

      // Update user display name and save to Firestore
      if (credential.user != null) {
        // Save additional user data to Firestore first
        await _firestore.collection('users').doc(credential.user!.uid).set({
          'firstName': firstName,
          'lastName': lastName,
          'email': email.trim(),
          'createdAt': FieldValue.serverTimestamp(),
        });
        
        // Update user display name
        await credential.user!.updateDisplayName('$firstName $lastName');
        
        // Reload user to get updated display name
        await credential.user!.reload();
        
        // Send email verification
        try {
          await credential.user!.sendEmailVerification();
        } catch (e) {
          // Don't throw - account creation succeeded, verification email is optional
        }
      }

      return credential;
    } on FirebaseAuthException catch (e) {
      throw _handleAuthException(e);
    } catch (e) {
      throw Exception('An unexpected error occurred: $e');
    }
  }

  // Sign in with Google (for login - checks if user exists in database)
  Future<UserCredential> signInWithGoogle() async {
    try {
      GoogleSignInAccount? googleUser;
      
      // For web, skip signInSilently to avoid FedCM errors and warnings
      // signInSilently always fails for first-time users and creates noise
      // Go straight to signIn() which shows the popup
      if (kIsWeb) {
        try {
          googleUser = await googleSignIn.signIn();
        } catch (signInError) {
          // Handle popup_closed error as cancellation
          final errorStr = signInError.toString().toLowerCase();
          if (errorStr.contains('popup_closed') || 
              errorStr.contains('popup closed') ||
              errorStr.contains('cancelled')) {
            throw Exception('Google Sign-In was cancelled.');
          }
          // Handle CORS/COOP errors
          if (errorStr.contains('cross-origin') ||
              errorStr.contains('crossorigin') ||
              errorStr.contains('opener-policy') ||
              errorStr.contains('coop')) {
            throw Exception(
              'Google Sign-In failed due to browser security settings. '
              'Please check your browser settings or try a different browser.'
            );
          }
          // Handle other FedCM/unknown errors
          if (errorStr.contains('unknown_reason') ||
              errorStr.contains('networkerror') ||
              errorStr.contains('not signed in')) {
            throw Exception('Google Sign-In failed. Please try again.');
          }
          rethrow;
        };
      } else {
        // For mobile platforms, use regular signIn
        googleUser = await googleSignIn.signIn();
      }
      
      // VALIDATION STEP 1: Check if googleUser is valid
      if (googleUser == null) {
        throw Exception('Google Sign-In was cancelled.');
      }

      // Obtain the auth details from the request
      // CRITICAL: The People API 403 error happens AFTER token retrieval
      // The idToken is in the OAuth response, not from People API
      // We need to get the tokens even if People API fails
      GoogleSignInAuthentication? googleAuth;
      
      try {
        // Try to get authentication - this may throw due to People API 403
        // but the tokens should still be available in the response
        googleAuth = await googleUser.authentication;
      } catch (e) {
        
        final errorStr = e.toString().toLowerCase();
        final errorMessage = e.toString();
        
        // Check if this is a People API error (403)
        // IMPORTANT: The tokens are retrieved BEFORE the People API call
        // So even if People API fails, the tokens should be available
        final isPeopleApiError = errorStr.contains('403') || 
            errorStr.contains('forbidden') ||
            errorStr.contains('people api') ||
            errorStr.contains('content-people.googleapis.com');
        
        // Also check for ClientException/PlatformException which might wrap People API errors
        final isClientException = errorStr.contains('clientexception') || 
            errorStr.contains('platformexception');
        
        if (isPeopleApiError || (isClientException && errorStr.contains('403'))) {
          // The error is from People API, not from token retrieval
          // Try to access authentication again - the tokens might be cached
          try {
            await Future.delayed(const Duration(milliseconds: 500));
            googleAuth = await googleUser.authentication;
          } catch (retryError) {
            // Try one more time with longer delay
            try {
              await Future.delayed(const Duration(milliseconds: 1500));
              googleAuth = await googleUser.authentication;
            } catch (finalError) {
              throw Exception(
                '🚫 CRITICAL: People API Not Enabled\n\n'
                'Google Sign-In cannot work because People API is not enabled.\n'
                'This is REQUIRED - there is no workaround.\n\n'
                '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'
                'STEP-BY-STEP FIX (Takes 2 minutes):\n'
                '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'
                '1. Open: https://console.cloud.google.com/\n'
                '2. Select project: pasahero-db\n'
                '3. Click "APIs & Services" (left menu)\n'
                '4. Click "Library"\n'
                '5. Search: "People API"\n'
                '6. Click "Google People API"\n'
                '7. Click "ENABLE" button\n'
                '8. Wait 1-2 minutes\n'
                '9. Refresh this page and try again\n'
                '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'
                'Error: ${errorMessage.substring(0, errorMessage.length > 200 ? 200 : errorMessage.length)}...'
              );
            }
          }
        } else if (isClientException) {
          // ClientException might be wrapping a People API error
          // Try retries even for ClientException - it might be People API related
          try {
            await Future.delayed(const Duration(milliseconds: 500));
            googleAuth = await googleUser.authentication;
          } catch (retryError) {
            // Try one more time
            try {
              await Future.delayed(const Duration(milliseconds: 1500));
              googleAuth = await googleUser.authentication;
            } catch (finalError) {
              throw Exception(
                '🚫 CRITICAL: People API Not Enabled\n\n'
                'Google Sign-In cannot work because People API is not enabled.\n'
                'This is REQUIRED - there is no workaround.\n\n'
                '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'
                'STEP-BY-STEP FIX (Takes 2 minutes):\n'
                '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'
                '1. Open: https://console.cloud.google.com/\n'
                '2. Select project: pasahero-db\n'
                '3. Click "APIs & Services" (left menu)\n'
                '4. Click "Library"\n'
                '5. Search: "People API"\n'
                '6. Click "Google People API"\n'
                '7. Click "ENABLE" button\n'
                '8. Wait 1-2 minutes\n'
                '9. Refresh this page and try again\n'
                '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'
                'Error Type: ${e.runtimeType}\n'
                'Error: ${errorMessage.substring(0, errorMessage.length > 150 ? 150 : errorMessage.length)}...'
              );
            }
          }
        } else {
          // Different error - rethrow with more details
          rethrow;
        }
      }

      // VALIDATION STEP 3: Ensure we have an idToken (required for Firebase Auth)
      // Note: googleAuth may be null if all retry attempts failed
      if (googleAuth == null) {
        throw Exception(
          '🚫 Google Sign-In Failed: Authentication object is null\n\n'
          'Unable to retrieve authentication tokens from Google.\n'
          'Please enable People API in Google Cloud Console.'
        );
      }
      
      // WORKAROUND: On web, google_sign_in doesn't return idToken when serverClientId is null
      // Try to proceed with just accessToken - Firebase Auth might accept it
      if (googleAuth.idToken == null) {
        if (kIsWeb) {
          // Try to create credential with just accessToken
          // Firebase Auth might accept it on web
          try {
            final credential = GoogleAuthProvider.credential(
              accessToken: googleAuth.accessToken,
              // idToken is null, but we'll try without it
            );
            
            final userCredential = await _auth.signInWithCredential(credential);
            
            // Check if user exists in Firestore
            if (userCredential.user != null) {
              final userDoc = await _firestore
                  .collection('users')
                  .doc(userCredential.user!.uid)
                  .get();

              if (!userDoc.exists) {
                await _auth.signOut();
                await googleSignIn.signOut();
                throw Exception(
                  'No account found. Please sign up first to create an account.',
                );
              }
            }

            return userCredential;
          } catch (e) {
            throw Exception(
              '🚫 Google Sign-In Failed: ID Token is Required\n\n'
              'The google_sign_in package on web cannot provide an idToken\n'
              'when serverClientId is null (setting it causes an assertion error).\n\n'
              'This is a known limitation of the google_sign_in package on web.\n\n'
              'SOLUTION: Use Firebase Auth directly for web Google Sign-In.\n'
              'The google_sign_in package works better on mobile platforms.'
            );
          }
        } else {
          // For mobile platforms, idToken should always be present
          throw Exception(
            '🚫 Google Sign-In Failed: ID Token is Missing\n\n'
            'The authentication object was retrieved but the ID token is null.\n'
            'This should not happen on mobile platforms.\n\n'
            'Please check your Google Sign-In configuration.'
          );
        }
      }
      
      if (googleAuth.accessToken == null) {
        throw Exception(
          '🚫 Google Sign-In Failed: Access Token is null\n\n'
          'The authentication object was retrieved but the access token is missing.\n'
          'Please try again or enable People API in Google Cloud Console.'
        );
      }

      // Create a new credential
      final credential = GoogleAuthProvider.credential(
        accessToken: googleAuth.accessToken,
        idToken: googleAuth.idToken,
      );

      // Sign in to Firebase with the Google credential
      final userCredential = await _auth.signInWithCredential(credential);

      // Check if user exists in Firestore
      if (userCredential.user != null) {
        final userDoc = await _firestore
            .collection('users')
            .doc(userCredential.user!.uid)
            .get();

        if (!userDoc.exists) {
          // User doesn't exist in database - sign them out and throw error
          await _auth.signOut();
          await googleSignIn.signOut();
          throw Exception(
            'No account found. Please sign up first to create an account.',
          );
        }
      }

      return userCredential;
    } on FirebaseAuthException catch (e) {
      throw _handleAuthException(e);
    } catch (e) {
      if (e.toString().contains('No account found') || 
          e.toString().contains('cancelled')) {
        rethrow;
      }
      // Handle popup_closed error
      if (e.toString().contains('popup_closed') || 
          e.toString().contains('popup closed')) {
        throw Exception('Google Sign-In was cancelled.');
      }
      // Handle CORS/COOP errors
      final errorStr = e.toString().toLowerCase();
      if (errorStr.contains('cross-origin') ||
          errorStr.contains('crossorigin') ||
          errorStr.contains('opener-policy') ||
          errorStr.contains('coop')) {
        throw Exception(
          'Google Sign-In failed due to browser security settings. '
          'Please check your browser settings or try a different browser.'
        );
      }
      throw Exception('Google Sign-In failed: ${e.toString()}');
    }
  }

  // Get Google user email without authenticating (for OTP verification first)
  Future<Map<String, String>> getGoogleUserEmail() async {
    try {
      GoogleSignInAccount? googleUser;
      
      // For web, skip signInSilently to avoid FedCM errors and warnings
      if (kIsWeb) {
        try {
          googleUser = await googleSignIn.signIn();
        } catch (signInError) {
          final errorStr = signInError.toString().toLowerCase();
          if (errorStr.contains('popup_closed') || 
              errorStr.contains('popup closed') ||
              errorStr.contains('cancelled')) {
            throw Exception('Google Sign-Up was cancelled.');
          }
          if (errorStr.contains('cross-origin') ||
              errorStr.contains('crossorigin') ||
              errorStr.contains('opener-policy') ||
              errorStr.contains('coop')) {
            throw Exception(
              'Google Sign-Up failed due to browser security settings. '
              'Please check your browser settings or try a different browser.'
            );
          }
          if (errorStr.contains('unknown_reason') ||
              errorStr.contains('networkerror') ||
              errorStr.contains('not signed in')) {
            throw Exception('Google Sign-Up failed. Please try again.');
          }
          rethrow;
        }
      } else {
        googleUser = await googleSignIn.signIn();
      }
      
      if (googleUser == null) {
        throw Exception('Google Sign-Up was cancelled.');
      }
      
      // Store the Google account for later use in signUpWithGoogle()
      // Use static setter to persist across instances
      setCachedGoogleAccount(googleUser);
      print('✅ Google account cached: ${googleUser.email}');
      
      // Return email and display name without authenticating
      return {
        'email': googleUser.email,
        'displayName': googleUser.displayName ?? '',
        'id': googleUser.id,
      };
    } catch (e) {
      if (e.toString().contains('cancelled')) {
        rethrow;
      }
      if (e.toString().contains('popup_closed') || 
          e.toString().contains('popup closed')) {
        throw Exception('Google Sign-Up was cancelled.');
      }
      rethrow;
    }
  }

  // Sign up with Google (for registration - creates user in database)
  // This is called AFTER OTP verification
  // Note: User should already be signed in to Google from getGoogleUserEmail()
  Future<UserCredential> signUpWithGoogle() async {
    try {
      GoogleSignInAccount? googleUser;
      
      print('🔐 signUpWithGoogle: Looking for cached Google account...');
      
      // First, try to use the cached Google account from getGoogleUserEmail()
      // Use static getter to access cached account across instances
      final cachedAccount = cachedGoogleAccount;
      if (cachedAccount != null) {
        print('   ✅ Using cached Google account: ${cachedAccount.email}');
        googleUser = cachedAccount;
      }
      
      // If no cached account, try to get the current user
      if (googleUser == null) {
        googleUser = googleSignIn.currentUser;
        if (googleUser != null) {
          print('   ✅ Found current user: ${googleUser.email}');
        }
      }
      
      // If still null, try signInSilently (works better on mobile)
      if (googleUser == null) {
        try {
          googleUser = await googleSignIn.signInSilently();
          if (googleUser != null) {
            print('   ✅ Retrieved via signInSilently: ${googleUser.email}');
            // Cache it for future use (static)
            setCachedGoogleAccount(googleUser);
          }
        } catch (e) {
          // signInSilently may fail, that's okay - we'll try other methods
          print('   ⚠️ signInSilently failed (expected on web): $e');
        }
      }
      
      // If still null, check if we're on web and try to get it without popup
      if (googleUser == null && kIsWeb) {
        // On web, try to check if there's a cached session
        // Wait a bit for the session to be established
        await Future.delayed(const Duration(milliseconds: 200));
        googleUser = googleSignIn.currentUser;
        if (googleUser != null) {
          print('   ✅ Found current user after delay: ${googleUser.email}');
          setCachedGoogleAccount(googleUser);
        }
      }
      
      // If still null, only then show the popup (shouldn't happen if getGoogleUserEmail worked)
      if (googleUser == null) {
        print('   ❌ ERROR: No existing Google sign-in found!');
        print('   ❌ Cached account: ${cachedGoogleAccount?.email ?? "null"}');
        print('   ❌ Current user: ${googleSignIn.currentUser?.email ?? "null"}');
        print('   ❌ This should not happen if getGoogleUserEmail() was called first');
        print('   ❌ Throwing error instead of showing popup to prevent unexpected behavior');
        
        // Instead of showing popup, throw an error
        // This prevents the unexpected popup and gives a clear error message
        throw Exception(
          'Google sign-in session expired. Please try signing up with Google again from the beginning.'
        );
      }
      
      // VALIDATION STEP 1: Check if googleUser is valid
      if (googleUser == null) {
        // Clear cached account if sign-in failed
        setCachedGoogleAccount(null);
        throw Exception('Google Sign-Up was cancelled.');
      }
      
      // Update cached account if we got a new one (static)
      setCachedGoogleAccount(googleUser);
      print('   ✅ Using Google account: ${googleUser.email}');
      
      // Obtain the auth details from the request
      // CRITICAL: The People API 403 error happens AFTER token retrieval
      // The idToken is in the OAuth response, not from People API
      // We need to get the tokens even if People API fails
      GoogleSignInAuthentication? googleAuth;
      
      print('   🔑 Getting authentication tokens from Google account...');
      print('   ⚠️ Note: This should NOT trigger a popup if account is already signed in');
      try {
        // Try to get authentication - this may throw due to People API 403
        // but the tokens should still be available in the response
        // This should NOT trigger a popup if the account is already signed in
        googleAuth = await googleUser.authentication;
        print('   ✅ Authentication tokens retrieved successfully');
      } catch (e) {
        
        final errorStr = e.toString().toLowerCase();
        final errorMessage = e.toString();
        
        // Check if this is a People API error (403)
        // IMPORTANT: The tokens are retrieved BEFORE the People API call
        // So even if People API fails, the tokens should be available
        final isPeopleApiError = errorStr.contains('403') || 
            errorStr.contains('forbidden') ||
            errorStr.contains('people api') ||
            errorStr.contains('content-people.googleapis.com');
        
        // Also check for ClientException/PlatformException which might wrap People API errors
        final isClientException = errorStr.contains('clientexception') || 
            errorStr.contains('platformexception');
        
        if (isPeopleApiError || (isClientException && errorStr.contains('403'))) {
          // The error is from People API, not from token retrieval
          // Try to access authentication again - the tokens might be cached
          try {
            await Future.delayed(const Duration(milliseconds: 500));
            googleAuth = await googleUser.authentication;
          } catch (retryError) {
            // Try one more time with longer delay
            try {
              await Future.delayed(const Duration(milliseconds: 1500));
              googleAuth = await googleUser.authentication;
            } catch (finalError) {
              throw Exception(
                '🚫 Google Sign-Up Failed: People API Error\n\n'
                'The People API is not enabled in your Google Cloud Console.\n'
                'This is REQUIRED for Google Sign-In to work on web.\n\n'
                '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'
                'HOW TO FIX:\n'
                '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'
                '1. Go to: https://console.cloud.google.com/\n'
                '2. Select project: pasahero-db\n'
                '3. Click "APIs & Services" → "Library"\n'
                '4. Search for "People API"\n'
                '5. Click "Google People API"\n'
                '6. Click the "Enable" button\n'
                '7. Wait 1-2 minutes\n'
                '8. Try signing up again\n'
                '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'
                'Error Details: $errorMessage'
              );
            }
          }
        } else {
          // Different error - rethrow with more details
          rethrow;
        }
      }

      // VALIDATION STEP 3: Ensure we have an idToken (required for Firebase Auth)
      // Note: googleAuth may be null if all retry attempts failed
      if (googleAuth == null) {
        throw Exception(
          '🚫 Google Sign-Up Failed: Authentication object is null\n\n'
          'Unable to retrieve authentication tokens from Google.\n'
          'Please enable People API in Google Cloud Console.'
        );
      }
      
      // WORKAROUND: On web, google_sign_in doesn't return idToken when serverClientId is null
      // Try to proceed with just accessToken - Firebase Auth might accept it
      if (googleAuth.idToken == null) {
        if (kIsWeb) {
          // Try to create credential with just accessToken
          try {
            final credential = GoogleAuthProvider.credential(
              accessToken: googleAuth.accessToken,
              // idToken is null, but we'll try without it
            );
            
            final userCredential = await _auth.signInWithCredential(credential);
            
            // Check if user already exists in Firestore
            if (userCredential.user != null) {
              final userDoc = await _firestore
                  .collection('users')
                  .doc(userCredential.user!.uid)
                  .get();

              if (userDoc.exists) {
                return userCredential;
              }
              // User doesn't exist - create user record in Firestore
              final displayName = userCredential.user!.displayName ?? '';
              final nameParts = displayName.split(' ');
              final firstName = nameParts.isNotEmpty ? nameParts[0] : '';
              final lastName = nameParts.length > 1 
                  ? nameParts.sublist(1).join(' ') 
                  : '';

              try {
                final userData = {
                  'firstName': firstName.isNotEmpty ? firstName : 'User',
                  'lastName': lastName.isNotEmpty ? lastName : '',
                  'email': userCredential.user!.email ?? '',
                  'createdAt': FieldValue.serverTimestamp(),
                  'signUpMethod': 'google',
                };
                await _firestore.collection('users').doc(userCredential.user!.uid).set(userData);
                
                // Send email verification
                try {
                  await userCredential.user!.sendEmailVerification();
                } catch (e) {
                  // Email verification is optional
                }
              } catch (e) {
                throw Exception('Failed to create user profile: $e');
              }
            }

            return userCredential;
          } catch (e) {
            throw Exception(
              '🚫 Google Sign-Up Failed: ID Token is Required\n\n'
              'The google_sign_in package on web cannot provide an idToken.\n'
              'This is a known limitation of the package on web.'
            );
          }
        } else {
          // For mobile platforms, idToken should always be present
          throw Exception(
            '🚫 Google Sign-Up Failed: ID Token is null\n\n'
            'The authentication object was retrieved but the ID token is missing.\n'
            'This should not happen on mobile platforms.\n\n'
            'Please check your Google Sign-In configuration.'
          );
        }
      }
      
      if (googleAuth.accessToken == null) {
        throw Exception(
          '🚫 Google Sign-Up Failed: Access Token is null\n\n'
          'The authentication object was retrieved but the access token is missing.\n'
          'Please try again or enable People API in Google Cloud Console.'
        );
      }

      // Create a new credential
      final credential = GoogleAuthProvider.credential(
        accessToken: googleAuth.accessToken,
        idToken: googleAuth.idToken,
      );

      // Sign in to Firebase with the Google credential
      final userCredential = await _auth.signInWithCredential(credential);

      // Check if user already exists in Firestore
      if (userCredential.user != null) {
        final userDoc = await _firestore
            .collection('users')
            .doc(userCredential.user!.uid)
            .get();

        if (userDoc.exists) {
          // User already exists - this is fine, just return the credential
          return userCredential;
        }

        // User doesn't exist - create user record in Firestore
        final displayName = userCredential.user!.displayName ?? '';
        final nameParts = displayName.split(' ');
        final firstName = nameParts.isNotEmpty ? nameParts[0] : '';
        final lastName = nameParts.length > 1 
            ? nameParts.sublist(1).join(' ') 
            : '';

        try {
          final userData = {
          'firstName': firstName.isNotEmpty ? firstName : 'User',
          'lastName': lastName.isNotEmpty ? lastName : '',
          'email': userCredential.user!.email ?? '',
          'createdAt': FieldValue.serverTimestamp(),
          'signUpMethod': 'google',
          };
          await _firestore.collection('users').doc(userCredential.user!.uid).set(userData);
          
          // Send email verification
          try {
            await userCredential.user!.sendEmailVerification();
          } catch (e) {
            // Email verification is optional
          }
        } catch (e) {
          // Re-throw the error so the user knows something went wrong
          // The user is authenticated but not saved - this is a problem
          throw Exception(
            'User account created but failed to save user data. '
            'Please contact support. Error: ${e.toString()}'
          );
        }
      }

      return userCredential;
    } on FirebaseAuthException catch (e) {
      throw _handleAuthException(e);
    } catch (e) {
      if (e.toString().contains('cancelled')) {
        rethrow;
      }
      // Handle popup_closed error
      if (e.toString().contains('popup_closed') || 
          e.toString().contains('popup closed')) {
        throw Exception('Google Sign-Up was cancelled.');
      }
      // Handle CORS/COOP errors
      final errorStr = e.toString().toLowerCase();
      if (errorStr.contains('cross-origin') ||
          errorStr.contains('crossorigin') ||
          errorStr.contains('opener-policy') ||
          errorStr.contains('coop')) {
        throw Exception(
          'Google Sign-Up failed due to browser security settings. '
          'Please check your browser settings or try a different browser.'
        );
      }
      throw Exception('Google Sign-Up failed: ${e.toString()}');
    }
  }

  // Sign out
  Future<void> signOut() async {
    try {
      await _auth.signOut();
      await googleSignIn.signOut(); // Also sign out from Google
      setCachedGoogleAccount(null); // Clear cached Google account (static)
    } catch (e) {
      throw Exception('Sign out failed: $e');
    }
  }

  // Send password reset email
  Future<void> sendPasswordResetEmail(String email) async {
    try {
      await _auth.sendPasswordResetEmail(email: email.trim());
    } on FirebaseAuthException catch (e) {
      throw _handleAuthException(e);
    } catch (e) {
      throw Exception('Failed to send password reset email: $e');
    }
  }

  // Send email verification
  Future<void> sendEmailVerification() async {
    try {
      final user = _auth.currentUser;
      if (user == null) {
        throw Exception('No user is currently signed in.');
      }
      if (user.emailVerified) {
        throw Exception('Email is already verified.');
      }
      await user.sendEmailVerification();
    } on FirebaseAuthException catch (e) {
      throw _handleAuthException(e);
    } catch (e) {
      if (e.toString().contains('already verified')) {
        rethrow;
      }
      throw Exception('Failed to send email verification: $e');
    }
  }

  // Check if email is verified
  bool isEmailVerified() {
    final user = _auth.currentUser;
    return user?.emailVerified ?? false;
  }

  // Reload user to get latest email verification status
  Future<void> reloadUser() async {
    try {
      final user = _auth.currentUser;
      if (user != null) {
        await user.reload();
      }
    } catch (e) {
      throw Exception('Failed to reload user: $e');
    }
  }

  // Check if user exists in Firestore
  Future<bool> userExists(String email) async {
    try {
      final users = await _firestore
          .collection('users')
          .where('email', isEqualTo: email.trim())
          .limit(1)
          .get();
      return users.docs.isNotEmpty;
    } catch (e) {
      return false;
    }
  }

  // Send OTP to email
  Future<void> sendOTP({required String email}) async {
    try {
      // Generate a 6-digit OTP
      final otpCode = (100000 + (DateTime.now().millisecondsSinceEpoch % 900000)).toString();
      
      // Store OTP in Firestore with expiration (5 minutes)
      final otpDoc = _firestore.collection('otp_verifications').doc(email.trim());
      
      await otpDoc.set({
        'otp': otpCode,
        'email': email.trim(),
        'createdAt': FieldValue.serverTimestamp(),
        'expiresAt': DateTime.now().add(const Duration(minutes: 5)).toIso8601String(),
        'verified': false,
      });
      
      // Send OTP via email using the backend server
      // Server URL - update this to your server URL
      // For local development: http://localhost:3000
      // For production: your production server URL
      // You can also set this via environment variable: --dart-define=SERVER_URL=http://your-server.com
      String serverUrl = const String.fromEnvironment(
        'SERVER_URL',
        defaultValue: 'http://localhost:3000',
      );
      
      // For web, if running on same machine, use localhost
      // For production, you'll need to set the actual server URL
      if (kIsWeb && serverUrl == 'http://localhost:3000') {
        // Try to detect if we're in development or production
        // In production, you should set SERVER_URL via --dart-define
        serverUrl = 'http://localhost:3000';
      }
      
      try {
        
        // First, try to check if server is reachable
        try {
          final statusResponse = await http.get(
            Uri.parse('$serverUrl/api/otp/status'),
          ).timeout(
            const Duration(seconds: 5),
            onTimeout: () {
              throw Exception('Server status check timed out');
            },
          );
          
          if (statusResponse.statusCode != 200) {
            print('⚠️ Server status check failed: ${statusResponse.statusCode}');
          }
        } catch (statusError) {
          final errorStr = statusError.toString().toLowerCase();
          if (errorStr.contains('connection refused') || 
              errorStr.contains('failed host lookup') ||
              errorStr.contains('network is unreachable') ||
              errorStr.contains('failed to fetch') ||
              errorStr.contains('clientexception') ||
              errorStr.contains('socketexception')) {
            print('❌ Server status check failed: $statusError');
            print('   Server URL: $serverUrl');
            print('   ⚠️  Server appears to be offline or unreachable');
            print('   Will attempt to send OTP anyway, but it will likely fail...');
            // Don't throw - continue to try sending anyway
          }
        }

        final response = await http.post(
          Uri.parse('$serverUrl/api/otp/send'),
          headers: {
            'Content-Type': 'application/json',
          },
          body: jsonEncode({
            'email': email.trim(),
            'otpCode': otpCode,
          }),
        ).timeout(
          const Duration(seconds: 10),
          onTimeout: () {
            throw Exception('Email sending request timed out. Server may be slow or unreachable.');
          },
        );
        
        if (response.statusCode != 200) {
          final responseBody = jsonDecode(response.body);
          print('⚠️ OTP email sending failed: ${response.statusCode}');
          print('   Error: ${responseBody['error'] ?? 'Unknown error'}');
          print('   Message: ${responseBody['message'] ?? 'No message'}');
          if (responseBody['troubleshooting'] != null) {
            print('   Troubleshooting:');
            if (responseBody['troubleshooting'] is List) {
              for (var tip in responseBody['troubleshooting']) {
                print('     - $tip');
              }
            } else {
              print('     - ${responseBody['troubleshooting']}');
            }
          }
          // Don't throw - OTP is stored, email sending is optional
        } else {
          print('✅ OTP email sent successfully');
        }
      } catch (e) {
        final errorStr = e.toString().toLowerCase();
        
        // Provide helpful error messages for connection issues
        if (errorStr.contains('connection refused') || 
            errorStr.contains('failed host lookup') ||
            errorStr.contains('network is unreachable') ||
            errorStr.contains('failed to fetch') ||
            errorStr.contains('clientexception') ||
            errorStr.contains('socketexception')) {
          print('❌ Server connection failed: $e');
          print('   Server URL: $serverUrl');
          print('   Error Type: Connection Refused (Server not running)');
          print('');
          print('   🔧 Troubleshooting Steps:');
          print('   1. Start the server:');
          print('      - Open a terminal/command prompt');
          print('      - Navigate to: cd server');
          print('      - Run: npm run dev');
          print('      - Wait for: "Listening to port 3000" message');
          print('');
          print('   2. Verify server is running:');
          print('      - Open in browser: $serverUrl/health');
          print('      - Should show: {"status":"ok",...}');
          print('');
          print('   3. Check server port:');
          print('      - Default port: 3000');
          print('      - Check server/.env file for PORT setting');
          print('      - If different port, update SERVER_URL in client');
          print('');
          print('   4. For web apps:');
          print('      - Ensure server CORS allows your origin');
          print('      - Check browser console for CORS errors');
          print('');
          print('   ⚠️  Note: OTP is saved in Firestore, but email cannot be sent until server is running.');
        } else if (errorStr.contains('timeout')) {
          print('⏱️ Request timed out: $e');
          print('   Server URL: $serverUrl');
          print('   The server may be slow or unreachable');
          print('   Check server logs for errors');
        } else {
          print('⚠️ OTP email sending error: $e');
          print('   Server URL: $serverUrl');
          print('   Check server logs for more details');
        }
        // Don't throw - OTP is stored in Firestore, email sending failure is not critical
      }
    } catch (e) {
      // Check if it's a permission error
      final errorStr = e.toString().toLowerCase();
      if (errorStr.contains('permission-denied') || 
          errorStr.contains('missing or insufficient permissions')) {
        throw Exception(
          'Firestore permission error. Please update your Firestore security rules.\n\n'
          'Go to Firebase Console > Firestore Database > Rules and add:\n\n'
          'match /otp_verifications/{email} {\n'
          '  allow read, write: if true;\n'
          '}\n\n'
          'Or deploy the firestore.rules file in your project root.'
        );
      }
      
      throw Exception('Failed to send OTP: $e');
    }
  }

  // Verify OTP
  Future<void> verifyOTP({required String email, required String otpCode}) async {
    try {
      // Normalize email (trim and lowercase for consistency)
      final normalizedEmail = email.trim().toLowerCase();
      final normalizedOtp = otpCode.trim();
      
      // Validate OTP format
      if (normalizedOtp.isEmpty) {
        throw Exception('OTP code cannot be empty.');
      }
      
      if (!RegExp(r'^\d+$').hasMatch(normalizedOtp)) {
        throw Exception('OTP code must contain only digits.');
      }
      
      if (normalizedOtp.length < 4 || normalizedOtp.length > 8) {
        throw Exception('OTP code must be between 4 and 8 digits.');
      }
      
      // Debug logging
      print('🔍 OTP Verification Debug:');
      print('   Email (normalized): $normalizedEmail');
      print('   OTP Code (normalized): $normalizedOtp');
      print('   OTP Length: ${normalizedOtp.length}');
      
      // Get OTP document from Firestore
      final otpDoc = await _firestore.collection('otp_verifications').doc(normalizedEmail).get();
      
      if (!otpDoc.exists) {
        print('   ❌ OTP document not found for email: $normalizedEmail');
        throw Exception('OTP not found. Please request a new OTP code.');
      }

      final otpData = otpDoc.data()!;
      final storedOTP = (otpData['otp'] as String?)?.trim() ?? '';
      final storedEmail = (otpData['email'] as String?)?.trim().toLowerCase() ?? '';
      final expiresAtStr = otpData['expiresAt'] as String?;
      final isVerified = otpData['verified'] as bool? ?? false;

      // Debug logging
      print('   📦 Stored OTP: $storedOTP');
      print('   📦 Stored Email: $storedEmail');
      print('   📦 Stored OTP Length: ${storedOTP.length}');
      print('   📦 Is Verified: $isVerified');
      print('   📦 Expires At: $expiresAtStr');

      // Check if OTP is already verified
      if (isVerified) {
        print('   ❌ OTP has already been used');
        throw Exception('This OTP has already been used.');
      }

      // Check if OTP is expired
      if (expiresAtStr == null) {
        print('   ❌ ExpiresAt is null');
        throw Exception('OTP expiration date is missing. Please request a new code.');
      }
      
      final expiresAt = DateTime.parse(expiresAtStr);
      final now = DateTime.now();
      final isExpired = now.isAfter(expiresAt);
      
      print('   ⏰ Current Time: ${now.toIso8601String()}');
      print('   ⏰ Expires At: ${expiresAt.toIso8601String()}');
      print('   ⏰ Is Expired: $isExpired');
      print('   ⏰ Time Remaining: ${expiresAt.difference(now).inSeconds} seconds');
      
      if (isExpired) {
        print('   ❌ OTP has expired');
        throw Exception('OTP has expired. Please request a new code.');
      }

      // Verify OTP code (compare as strings)
      final otpMatch = storedOTP == normalizedOtp;
      print('   🔐 OTP Comparison:');
      print('      Stored: "$storedOTP" (length: ${storedOTP.length})');
      print('      Entered: "$normalizedOtp" (length: ${normalizedOtp.length})');
      print('      Match: $otpMatch');
      
      if (!otpMatch) {
        // Additional debug: check character by character
        if (storedOTP.length != normalizedOtp.length) {
          print('   ❌ Length mismatch: stored=${storedOTP.length}, entered=${normalizedOtp.length}');
          throw Exception('Invalid OTP code. Length mismatch. Please check and try again.');
        }
        
        // Check each character
        for (int i = 0; i < storedOTP.length; i++) {
          if (storedOTP[i] != normalizedOtp[i]) {
            print('   ❌ Character mismatch at position $i: stored="${storedOTP[i]}" (${storedOTP.codeUnitAt(i)}), entered="${normalizedOtp[i]}" (${normalizedOtp.codeUnitAt(i)})');
            break;
          }
        }
        
        throw Exception('Invalid OTP code. Please check the code and try again.');
      }

      print('   ✅ OTP verification successful!');

      // Mark OTP as verified
      await otpDoc.reference.update({
        'verified': true,
        'verifiedAt': FieldValue.serverTimestamp(),
      });
      
      print('   ✅ OTP marked as verified in Firestore');
    } catch (e) {
      print('   ❌ OTP Verification Error: $e');
      if (e.toString().contains('OTP') || e.toString().contains('expired') || e.toString().contains('not found')) {
        rethrow;
      }
      throw Exception('Failed to verify OTP: $e');
    }
  }

  // Handle Firebase Auth exceptions and return user-friendly messages
  Exception _handleAuthException(FirebaseAuthException e) {
    switch (e.code) {
      case 'weak-password':
        return Exception('The password provided is too weak.');
      case 'email-already-in-use':
        return Exception('An account already exists for that email.');
      case 'user-not-found':
        return Exception('No user found for that email.');
      case 'wrong-password':
        return Exception('Wrong password provided.');
      case 'invalid-email':
        return Exception('The email address is invalid.');
      case 'user-disabled':
        return Exception('This user account has been disabled.');
      case 'too-many-requests':
        return Exception('Too many requests. Please try again later.');
      case 'operation-not-allowed':
        return Exception('This operation is not allowed.');
      default:
        return Exception('Authentication failed: ${e.message}');
    }
  }
}
