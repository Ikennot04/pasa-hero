import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:http/http.dart' as http;
import 'subscription_ids_service.dart';
import 'dart:convert';
import 'dart:math';

/// Google signed in to Firebase but the app has no Firestore profile yet.
/// Sign out Firebase only, keep Google session for [AuthService.signUpWithGoogle] after OTP.
class GoogleLoginNeedsOtp implements Exception {
  GoogleLoginNeedsOtp({
    required this.email,
    required this.displayName,
  });

  final String email;
  final String displayName;

  @override
  String toString() => 'GoogleLoginNeedsOtp: $email';
}

class AuthService {
  final FirebaseAuth _auth = FirebaseAuth.instance;
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  static const String _signupUrl =
      'https://pasa-hero-server.vercel.app/api/users/auth/signup';
  static const String _signinUrl =
      'https://pasa-hero-server.vercel.app/api/users/auth/signin';
  static const String _logoutUrlBase =
      'https://pasa-hero-server.vercel.app/api/users/auth/logout';
  static const String _usersApiBase =
      'https://pasa-hero-server.vercel.app/api/users';
  
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
  static const String _userIdChars =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  final Random _random = Random.secure();
  
  // Getter for cached account
  GoogleSignInAccount? get cachedGoogleAccount => _cachedGoogleAccount;
  
  // Setter for cached account
  void setCachedGoogleAccount(GoogleSignInAccount? account) {
    _cachedGoogleAccount = account;
  }

  /// Syncs the passenger profile to MongoDB via
  /// `POST https://pasa-hero-server.vercel.app/api/users/auth/signup`
  /// (same `/api/users` module as the list route; this is the passenger create endpoint).
  ///
  /// Fields match the API: [f_name], [l_name], [email], [password], [role] (always `user`),
  /// [assigned_terminal] (null for passengers), [firebase_id].
  Future<void> _postPassengerSignupToBackend({
    required String firebaseUid,
    required String email,
    required String password,
    required String firstName,
    required String lastName,
  }) async {
    final signupRequest = http.MultipartRequest(
      'POST',
      Uri.parse(_signupUrl),
    );
    signupRequest.fields['image_type'] = 'user';
    signupRequest.fields['data'] = jsonEncode({
      'f_name': firstName.trim(),
      'l_name': lastName.trim(),
      'email': email.trim(),
      'password': password,
      'role': 'user',
      'assigned_terminal': null,
      'firebase_id': firebaseUid,
    });

    final signupResponse = await signupRequest.send();
    final signupBody = await signupResponse.stream.bytesToString();
    if (signupResponse.statusCode < 200 || signupResponse.statusCode >= 300) {
      String message = 'Failed to sync account with server';
      try {
        final parsed = jsonDecode(signupBody);
        if (parsed is Map<String, dynamic>) {
          final backendMessage = parsed['message']?.toString();
          if (backendMessage != null && backendMessage.isNotEmpty) {
            message = backendMessage;
          }
        }
      } catch (_) {}
      throw Exception(message);
    }

    final mongoId =
        SubscriptionIdsService.parseMongoUserIdFromAuthUserEnvelope(signupBody);
    if (mongoId != null && mongoId.isNotEmpty) {
      SubscriptionIdsService.rememberMongoUserIdForFirebaseUid(
        firebaseUid,
        mongoId,
      );
    }
  }

  /// Strong password for Mongo only (e.g. Google sign-up); meets server `isStrongPassword`.
  String _generateBackendOnlyPassword() {
    final n = _random.nextInt(900000) + 100000;
    return 'Pasa$n!Aa1';
  }

  Future<void> _rollbackGoogleFirebaseUser(User? u) async {
    try {
      await u?.delete();
    } catch (_) {}
    try {
      await _auth.signOut();
      await googleSignIn.signOut();
    } catch (_) {}
  }

  Future<void> _notifyBackendLogout(User user) async {
    try {
      final backendUserId = await SubscriptionIdsService.backendUserIdForFirebaseUid(
        user.uid,
        email: user.email,
      );
      if (backendUserId == null || backendUserId.isEmpty) {
        return;
      }

      final response = await http.patch(
        Uri.parse('$_logoutUrlBase/$backendUserId'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'firebase_uid': user.uid,
          'email': user.email,
        }),
      );

      if (response.statusCode < 200 || response.statusCode >= 300) {
        print(
          '⚠️ Backend logout failed (HTTP ${response.statusCode}): ${response.body}',
        );
      }
    } catch (e) {
      // Do not block client logout on backend logout failure.
      print('⚠️ Backend logout request error: $e');
    }
  }

  bool _isBackendEmailAlreadyExistsError(Object error) {
    final message = error.toString().toLowerCase();
    return message.contains('email already exists') ||
        message.contains('email already exist') ||
        message.contains('already registered') ||
        message.contains('duplicate key') ||
        message.contains('e11000');
  }

  /// Persists Firebase Auth uid on the Mongo user (`firebase_id`). Best-effort
  /// when [throwOnFailure] is false (e.g. after login).
  Future<void> _syncFirebaseIdToMongoUser({
    required String mongoUserId,
    required String firebaseUid,
    bool throwOnFailure = false,
    bool setActive = false,
  }) async {
    final payload = <String, dynamic>{
      'firebase_id': firebaseUid,
    };
    if (setActive) {
      payload['status'] = 'active';
    }
    final updateRequest = http.MultipartRequest(
      'PATCH',
      Uri.parse('$_usersApiBase/$mongoUserId'),
    );
    updateRequest.fields['data'] = jsonEncode(payload);

    final response = await updateRequest.send();
    if (response.statusCode < 200 || response.statusCode >= 300) {
      final body = await response.stream.bytesToString();
      if (throwOnFailure) {
        throw Exception(
          'Failed to link Mongo user (HTTP ${response.statusCode}): $body',
        );
      }
      print(
        '⚠️ firebase_id sync to Mongo failed (HTTP ${response.statusCode}): $body',
      );
    }
  }

  Future<void> _linkExistingBackendUserToFirebase({
    required String firebaseUid,
    required String email,
  }) async {
    final backendUserId = await SubscriptionIdsService.backendUserIdForFirebaseUid(
      firebaseUid,
      email: email,
    );
    if (backendUserId == null || backendUserId.isEmpty) {
      throw Exception(
        'Existing backend account found but could not resolve backend user id.',
      );
    }

    await _syncFirebaseIdToMongoUser(
      mongoUserId: backendUserId,
      firebaseUid: firebaseUid,
      throwOnFailure: true,
      setActive: true,
    );
  }

  Future<void> _ensureMongoUserFirebaseIdLinked(User user) async {
    try {
      final mongoId = await SubscriptionIdsService.backendUserIdForFirebaseUid(
        user.uid,
        email: user.email,
      );
      if (mongoId == null || mongoId.isEmpty) return;
      await _syncFirebaseIdToMongoUser(
        mongoUserId: mongoId,
        firebaseUid: user.uid,
      );
    } catch (e) {
      print('⚠️ _ensureMongoUserFirebaseIdLinked: $e');
    }
  }

  Future<void> _finalizePassengerMongoLink(User? user) async {
    if (user == null) return;
    await _ensureMongoUserFirebaseIdLinked(user);
  }

  Future<void> _syncGoogleUserToBackend({
    required String firebaseUid,
    required String email,
    required String firstName,
    required String lastName,
  }) async {
    try {
      await _postPassengerSignupToBackend(
        firebaseUid: firebaseUid,
        email: email,
        password: _generateBackendOnlyPassword(),
        firstName: firstName,
        lastName: lastName,
      );
    } catch (e) {
      if (_isBackendEmailAlreadyExistsError(e)) {
        await _linkExistingBackendUserToFirebase(
          firebaseUid: firebaseUid,
          email: email,
        );
        return;
      }
      rethrow;
    }
  }

  Future<void> _requireOtpRegistrationForNewGoogleUser({
    required UserCredential userCredential,
    required GoogleSignInAccount googleUser,
  }) async {
    final fbUser = userCredential.user;
    final email = fbUser?.email?.trim().isNotEmpty == true
        ? fbUser!.email!.trim()
        : googleUser.email.trim();
    if (email.isEmpty) {
      await _auth.signOut();
      await googleSignIn.signOut();
      throw Exception('Your Google account has no email address.');
    }
    final displayName = fbUser?.displayName?.trim().isNotEmpty == true
        ? fbUser!.displayName!.trim()
        : (googleUser.displayName ?? '').trim();
    setCachedGoogleAccount(googleUser);
    await _auth.signOut();
    throw GoogleLoginNeedsOtp(email: email, displayName: displayName);
  }

  String _generateUserIdFromUid(String uid, {int length = 12}) {
    // Use Firebase UID as source so we avoid cross-document queries that may be
    // blocked by Firestore security rules during signup.
    final cleanUid = uid.trim();
    if (cleanUid.isEmpty) {
      return List.generate(
        length,
        (_) => _userIdChars[_random.nextInt(_userIdChars.length)],
      ).join();
    }

    final normalized = cleanUid.replaceAll(RegExp(r'[^a-zA-Z0-9]'), '');
    final targetLength = length < 6 ? 6 : length;
    if (normalized.length >= targetLength) {
      return normalized.substring(0, targetLength);
    }

    final buffer = StringBuffer(normalized);
    while (buffer.length < targetLength) {
      buffer.write(_userIdChars[_random.nextInt(_userIdChars.length)]);
    }
    return buffer.toString();
  }

  // Get the Web OAuth Client ID from Firebase options
  // This is needed for Android/iOS Google Sign-In
  // IMPORTANT: Replace this with your actual Web OAuth Client ID from Firebase Console
  // Get it from: Firebase Console > Project Settings > Your apps > Web app > OAuth client ID
  String? _getWebClientId() {
    // Web OAuth Client ID from Firebase Console
    // This is required for Android/iOS Google Sign-In to work properly
    // The Web Client ID is used as serverClientId for mobile platforms
    const String webClientId = '464857061623-ohoa4afqj73bka9l3mn4rv7mdrpe0ra0.apps.googleusercontent.com';
    
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
      final signinResponse = await http.post(
        Uri.parse(_signinUrl),
        headers: {
          'Content-Type': 'application/json',
        },
        body: jsonEncode({
          'email': email.trim(),
          'password': password,
        }),
      );

      if (signinResponse.statusCode < 200 || signinResponse.statusCode >= 300) {
        String message = 'Failed to sign in';
        try {
          final parsed = jsonDecode(signinResponse.body);
          if (parsed is Map<String, dynamic>) {
            final backendMessage = parsed['message']?.toString();
            if (backendMessage != null && backendMessage.isNotEmpty) {
              message = backendMessage;
            }
          }
        } catch (_) {}
        throw Exception(message);
      }

      final mongoIdFromBackend = SubscriptionIdsService
          .parseMongoUserIdFromAuthUserEnvelope(signinResponse.body);

      final credential = await _auth.signInWithEmailAndPassword(
        email: email.trim(),
        password: password,
      );
      final fbUser = credential.user;
      if (fbUser != null) {
        if (mongoIdFromBackend != null && mongoIdFromBackend.isNotEmpty) {
          SubscriptionIdsService.rememberMongoUserIdForFirebaseUid(
            fbUser.uid,
            mongoIdFromBackend,
          );
          await _syncFirebaseIdToMongoUser(
            mongoUserId: mongoIdFromBackend,
            firebaseUid: fbUser.uid,
          );
        } else {
          await _ensureMongoUserFirebaseIdLinked(fbUser);
        }
      }
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

      final fbUser = credential.user;
      if (fbUser == null) {
        throw Exception('Registration failed');
      }

      try {
        await _postPassengerSignupToBackend(
          firebaseUid: fbUser.uid,
          email: email.trim(),
          password: password,
          firstName: firstName,
          lastName: lastName,
        );
      } catch (e) {
        if (_isBackendEmailAlreadyExistsError(e)) {
          // Mongo user already exists (retry after partial failure, admin seed, etc.):
          // attach this Firebase account instead of failing OTP registration.
          try {
            await _linkExistingBackendUserToFirebase(
              firebaseUid: fbUser.uid,
              email: email.trim(),
            );
          } catch (linkErr) {
            try {
              await fbUser.delete();
            } catch (_) {}
            throw Exception(
              'Could not link your account to the server: $linkErr',
            );
          }
        } else {
          try {
            await fbUser.delete();
          } catch (_) {}
          rethrow;
        }
      }

      // Update user display name and save to Firestore
      if (credential.user != null) {
        final userId = _generateUserIdFromUid(credential.user!.uid);
        // Save additional user data to Firestore first
        await _firestore.collection('users').doc(credential.user!.uid).set({
          'firstName': firstName,
          'lastName': lastName,
          'email': email.trim(),
          'user_id': userId,
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
        }
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
                await _requireOtpRegistrationForNewGoogleUser(
                  userCredential: userCredential,
                  googleUser: googleUser,
                );
              }
            }

            await _finalizePassengerMongoLink(userCredential.user);
            return userCredential;
          } catch (e) {
            if (e is GoogleLoginNeedsOtp) rethrow;
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
          await _requireOtpRegistrationForNewGoogleUser(
            userCredential: userCredential,
            googleUser: googleUser,
          );
        }
      }

      await _finalizePassengerMongoLink(userCredential.user);
      return userCredential;
    } on FirebaseAuthException catch (e) {
      throw _handleAuthException(e);
    } on GoogleLoginNeedsOtp {
      rethrow;
    } catch (e) {
      if (e.toString().contains('cancelled')) {
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
                await _finalizePassengerMongoLink(userCredential.user);
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
                final fn = firstName.isNotEmpty ? firstName : 'User';
                final ln = lastName;
                final em = userCredential.user!.email?.trim() ?? '';
                if (em.isEmpty) {
                  throw Exception('Your Google account has no email address.');
                }
                await _syncGoogleUserToBackend(
                  firebaseUid: userCredential.user!.uid,
                  email: em,
                  firstName: fn,
                  lastName: ln,
                );
                final generatedUserId = _generateUserIdFromUid(
                  userCredential.user!.uid,
                );
                final userData = {
                  'firstName': fn,
                  'lastName': ln,
                  'email': em,
                  'user_id': generatedUserId,
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
                await _rollbackGoogleFirebaseUser(userCredential.user);
                throw Exception('Failed to create user profile: $e');
              }
            }

            await _finalizePassengerMongoLink(userCredential.user);
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
          await _finalizePassengerMongoLink(userCredential.user);
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
          final fn = firstName.isNotEmpty ? firstName : 'User';
          final ln = lastName;
          final em = userCredential.user!.email?.trim() ?? '';
          if (em.isEmpty) {
            throw Exception('Your Google account has no email address.');
          }
          await _syncGoogleUserToBackend(
            firebaseUid: userCredential.user!.uid,
            email: em,
            firstName: fn,
            lastName: ln,
          );
          final generatedUserId = _generateUserIdFromUid(
            userCredential.user!.uid,
          );
          final userData = {
            'firstName': fn,
            'lastName': ln,
            'email': em,
            'user_id': generatedUserId,
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
          await _rollbackGoogleFirebaseUser(userCredential.user);
          throw Exception(
            'User account created but failed to save user data. '
            'Please contact support. Error: ${e.toString()}'
          );
        }
      }

      await _finalizePassengerMongoLink(userCredential.user);
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
      final user = _auth.currentUser;
      if (user != null) {
        // Mark profile/status offline before sign out.
        await _firestore.collection('users').doc(user.uid).set({
          'status': 0,
          'online': 0,
          'last_seen': FieldValue.serverTimestamp(),
          'updatedAt': FieldValue.serverTimestamp(),
        }, SetOptions(merge: true));

        // Mark live location offline, then remove live marker document.
        await _firestore.collection('user_locations').doc(user.uid).set({
          'status': 0,
          'online': 0,
          'updatedAt': FieldValue.serverTimestamp(),
        }, SetOptions(merge: true));
        await _firestore.collection('user_locations').doc(user.uid).delete();

        // Mark Mongo user as inactive in backend.
        await _notifyBackendLogout(user);
      }
      SubscriptionIdsService.clearBackendUserIdCache();
      await _auth.signOut();
      await googleSignIn.signOut(); // Also sign out from Google
      setCachedGoogleAccount(null); // Clear cached Google account (static)
    } catch (e) {
      throw Exception('Sign out failed: $e');
    }
  }

  // Add password for users authenticated via Google.
  // Reauthenticates with Google credential to satisfy sensitive operation checks.
  Future<void> addPasswordForGoogleUser({
    required String newPassword,
  }) async {
    try {
      final user = _auth.currentUser;
      if (user == null) {
        throw Exception('No user is currently signed in.');
      }

      final trimmedPassword = newPassword.trim();
      if (trimmedPassword.isEmpty) {
        throw Exception('Password cannot be empty');
      }
      if (trimmedPassword.length < 6) {
        throw Exception('Password must be at least 6 characters long');
      }

      final providerIds = user.providerData
          .map((provider) => provider.providerId)
          .toSet();
      final hasGoogleProvider = providerIds.contains('google.com');
      final hasPasswordProvider = providerIds.contains('password');

      if (!hasGoogleProvider) {
        throw Exception('This account is not using Google sign-in.');
      }
      if (hasPasswordProvider) {
        throw Exception('Password is already set for this account.');
      }

      final googleUser = googleSignIn.currentUser ?? await googleSignIn.signIn();
      if (googleUser == null) {
        throw Exception('Google re-authentication was cancelled.');
      }

      final googleAuth = await googleUser.authentication;
      if (googleAuth.accessToken == null) {
        throw Exception('Failed to get Google access token for re-authentication.');
      }

      final credential = GoogleAuthProvider.credential(
        accessToken: googleAuth.accessToken,
        idToken: googleAuth.idToken,
      );

      await user.reauthenticateWithCredential(credential);
      await user.updatePassword(trimmedPassword);
      await user.reload();
      print('✅ Password added successfully for Google-auth user');
    } on FirebaseAuthException catch (e) {
      if (e.code == 'provider-already-linked') {
        throw Exception('Password is already set for this account.');
      }
      throw _handleAuthException(e);
    } catch (e) {
      throw Exception('Failed to add password: $e');
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
