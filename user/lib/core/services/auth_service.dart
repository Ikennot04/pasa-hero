import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:flutter/foundation.dart' show kIsWeb;

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
          'role': 'user',
          'roleid': 1,
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
      GoogleSignInAuthentication googleAuth;
      
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
                '🚫 Google Sign-In Failed: Authentication object is null\n\n'
                'Unable to retrieve authentication tokens from Google.\n'
                'Please enable People API in Google Cloud Console.\n\n'
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
                '🚫 Google Sign-In Failed: Authentication object is null\n\n'
                'Unable to retrieve authentication tokens from Google.\n'
                'Please enable People API in Google Cloud Console.\n\n'
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
        setCachedGoogleAccount(null); // Clear cached account
        throw Exception(
          'Google sign-in session expired. Please try signing up with Google again from the beginning.'
        );
      }
      
      // Update cached account if we got a new one (static)
      setCachedGoogleAccount(googleUser);
      print('   ✅ Using Google account: ${googleUser.email}');
      
      // Obtain the auth details from the request
      // CRITICAL: The People API 403 error happens AFTER token retrieval
      // The idToken is in the OAuth response, not from People API
      // We need to get the tokens even if People API fails
      GoogleSignInAuthentication googleAuth;
      
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
                  'role': 'user',
                  'roleid': 1,
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
          'role': 'user',
          'roleid': 1,
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

  // Check if email is already registered in Firebase Auth
  // This is used to prevent duplicate registrations before sending OTP
  Future<bool> isEmailAlreadyRegistered(String email) async {
    try {
      final normalizedEmail = email.trim().toLowerCase();
      print('🔍 Checking if email is already registered: $normalizedEmail');
      
      // Method 1: Check Firestore first (more reliable since we store user data there)
      print('   🔍 Method 1: Checking Firestore for email...');
      try {
        final users = await _firestore
            .collection('users')
            .where('email', isEqualTo: normalizedEmail)
            .limit(1)
            .get();
        
        if (users.docs.isNotEmpty) {
          print('   ✅ Email found in Firestore - account IS registered');
          return true;
        }
        print('   ❌ Email not found in Firestore');
      } catch (e) {
        print('   ⚠️ Error checking Firestore: $e');
      }
      
      // Method 2: Check Firebase Auth sign-in methods
      print('   🔍 Method 2: Checking Firebase Auth sign-in methods...');
      try {
        final methods = await _auth.fetchSignInMethodsForEmail(normalizedEmail);
        print('   📋 Sign-in methods found: $methods');
        
        if (methods.isNotEmpty) {
          print('   ✅ Email found in Firebase Auth - account IS registered');
          return true;
        }
        print('   ❌ No sign-in methods found in Firebase Auth');
      } on FirebaseAuthException catch (e) {
        print('   ⚠️ FirebaseAuthException: ${e.code} - ${e.message}');
        if (e.code == 'invalid-email') {
          print('   ❌ Invalid email format');
          return false;
        }
      } catch (e) {
        print('   ⚠️ Error checking Firebase Auth: $e');
      }
      
      // If both methods return false, email is not registered
      print('   ❌ Email IS NOT already registered (checked both Firestore and Firebase Auth)');
      return false;
    } catch (e) {
      // On any unexpected error, log and assume email doesn't exist to be safe
      print('   ❌ Unexpected error checking email, assuming not registered: $e');
      return false;
    }
  }


  // Handle Firebase Auth exceptions and return user-friendly messages
  Exception _handleAuthException(FirebaseAuthException e) {
    switch (e.code) {
      case 'weak-password':
        return Exception('The password provided is too weak.');
      case 'email-already-in-use':
        return Exception('Account is already registered');
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
