import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:http/http.dart' as http;
import 'dart:convert';

class ChangeEmailService {
  final FirebaseAuth _auth = FirebaseAuth.instance;
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  // Re-authenticate user with current password
  Future<void> reauthenticateUser(String password) async {
    try {
      final user = _auth.currentUser;
      if (user == null) {
        throw Exception('No user is currently signed in.');
      }

      if (user.email == null) {
        throw Exception('User email is not available.');
      }

      // Create credential with current email and password
      final credential = EmailAuthProvider.credential(
        email: user.email!,
        password: password,
      );

      // Re-authenticate
      await user.reauthenticateWithCredential(credential);
    } on FirebaseAuthException catch (e) {
      throw _handleAuthException(e);
    } catch (e) {
      throw Exception('Re-authentication failed: $e');
    }
  }

  // Send OTP to new email address
  Future<void> sendOTPToNewEmail(String newEmail) async {
    try {
      final trimmedEmail = newEmail.trim().toLowerCase();

      if (trimmedEmail.isEmpty) {
        throw Exception('Email address cannot be empty');
      }

      // Validate email format
      if (!RegExp(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$').hasMatch(trimmedEmail)) {
        throw Exception('Invalid email format');
      }

      // Check if email is already in use (same as current email)
      final user = _auth.currentUser;
      if (user != null && user.email?.toLowerCase() == trimmedEmail) {
        throw Exception('New email cannot be the same as current email');
      }

      // Check if email is already registered using comprehensive check
      print('🔍 Checking if email is already registered: $trimmedEmail');
      
      // Method 1: Check Firestore
      try {
        final users = await _firestore
            .collection('users')
            .where('email', isEqualTo: trimmedEmail)
            .limit(1)
            .get();
        
        if (users.docs.isNotEmpty) {
          print('   ❌ Email found in Firestore - account IS registered');
          throw Exception('This email is already registered. Please use a different email address.');
        }
        print('   ✅ Email not found in Firestore');
      } catch (e) {
        if (e.toString().contains('already registered')) {
          rethrow;
        }
        print('   ⚠️ Error checking Firestore: $e');
      }
      
      // Method 2: Check Firebase Auth sign-in methods
      try {
        final methods = await _auth.fetchSignInMethodsForEmail(trimmedEmail);
        print('   📋 Sign-in methods found: $methods');
        
        if (methods.isNotEmpty) {
          print('   ❌ Email found in Firebase Auth - account IS registered');
          throw Exception('This email is already registered. Please use a different email address.');
        }
        print('   ✅ No sign-in methods found in Firebase Auth');
      } on FirebaseAuthException catch (e) {
        if (e.code == 'invalid-email') {
          throw Exception('Invalid email format');
        }
        // If it's a different error, continue (might be network issue)
        print('   ⚠️ FirebaseAuthException: ${e.code} - ${e.message}');
      } catch (e) {
        if (e.toString().contains('already registered')) {
          rethrow;
        }
        print('   ⚠️ Error checking Firebase Auth: $e');
      }
      
      print('   ✅ Email is available for use');

      // Generate a 6-digit OTP
      final otpCode = (100000 + (DateTime.now().millisecondsSinceEpoch % 900000)).toString();
      
      // Store OTP in Firestore with expiration (5 minutes)
      final otpDoc = _firestore.collection('otp_verifications').doc(trimmedEmail);
      
      await otpDoc.set({
        'otp': otpCode,
        'email': trimmedEmail,
        'createdAt': FieldValue.serverTimestamp(),
        'expiresAt': DateTime.now().add(const Duration(minutes: 5)).toIso8601String(),
        'verified': false,
        'purpose': 'change_email',
      });

      // Send OTP via email using the backend server
      String serverUrl = const String.fromEnvironment(
        'SERVER_URL',
        defaultValue: 'http://localhost:3000',
      );

      if (kIsWeb && serverUrl == 'http://localhost:3000') {
        serverUrl = 'http://localhost:3000';
      }

      try {
        final response = await http.post(
          Uri.parse('$serverUrl/api/otp/send'),
          headers: {
            'Content-Type': 'application/json',
          },
          body: jsonEncode({
            'email': trimmedEmail,
            'otpCode': otpCode,
          }),
        ).timeout(
          const Duration(seconds: 10),
          onTimeout: () {
            throw Exception('OTP request timed out');
          },
        );

        if (response.statusCode != 200) {
          final errorData = jsonDecode(response.body) as Map<String, dynamic>;
          throw Exception(errorData['error'] ?? 'Failed to send OTP');
        }
      } catch (e) {
        final errorStr = e.toString().toLowerCase();
        if (errorStr.contains('connection refused') ||
            errorStr.contains('failed host lookup') ||
            errorStr.contains('network is unreachable') ||
            errorStr.contains('failed to fetch') ||
            errorStr.contains('clientexception') ||
            errorStr.contains('socketexception')) {
          throw Exception(
            'Server is not reachable. Please ensure the server is running.\n'
            'Run: cd server && npm run dev'
          );
        }
        rethrow;
      }
    } catch (e) {
      if (e.toString().contains('already registered') ||
          e.toString().contains('same as current') ||
          e.toString().contains('Invalid email') ||
          e.toString().contains('Server is not reachable')) {
        rethrow;
      }
      throw Exception('Failed to send OTP to new email: $e');
    }
  }

  // Verify OTP for new email
  Future<void> verifyOTPForNewEmail({
    required String newEmail,
    required String otpCode,
  }) async {
    try {
      final normalizedEmail = newEmail.trim().toLowerCase();
      final normalizedOtp = otpCode.trim();
      
      if (normalizedOtp.isEmpty) {
        throw Exception('OTP code cannot be empty.');
      }
      
      if (!RegExp(r'^\d+$').hasMatch(normalizedOtp)) {
        throw Exception('OTP code must contain only digits.');
      }
      
      if (normalizedOtp.length < 4 || normalizedOtp.length > 8) {
        throw Exception('OTP code must be between 4 and 8 digits.');
      }

      // Get OTP document from Firestore
      final otpDoc = await _firestore.collection('otp_verifications').doc(normalizedEmail).get();
      
      if (!otpDoc.exists) {
        throw Exception('OTP not found. Please request a new OTP code.');
      }

      final otpData = otpDoc.data()!;
      final storedOTP = (otpData['otp'] as String?)?.trim() ?? '';
      final storedEmail = (otpData['email'] as String?)?.trim().toLowerCase() ?? '';
      final expiresAtStr = otpData['expiresAt'] as String?;
      final isVerified = otpData['verified'] as bool? ?? false;
      final purpose = otpData['purpose'] as String? ?? '';

      // Check purpose
      if (purpose != 'change_email') {
        throw Exception('Invalid OTP purpose. Please request a new OTP code.');
      }

      // Check if OTP is already verified
      if (isVerified) {
        throw Exception('OTP has already been used. Please request a new OTP code.');
      }

      // Check expiration
      if (expiresAtStr != null) {
        final expiresAt = DateTime.parse(expiresAtStr);
        if (DateTime.now().isAfter(expiresAt)) {
          throw Exception('OTP has expired. Please request a new OTP code.');
        }
      }

      // Verify OTP
      if (storedOTP != normalizedOtp || storedEmail != normalizedEmail) {
        throw Exception('Invalid OTP code. Please check and try again.');
      }

      // Mark OTP as verified
      await otpDoc.reference.update({
        'verified': true,
        'verifiedAt': FieldValue.serverTimestamp(),
      });
    } catch (e) {
      if (e.toString().contains('OTP') ||
          e.toString().contains('expired') ||
          e.toString().contains('Invalid')) {
        rethrow;
      }
      throw Exception('Failed to verify OTP: $e');
    }
  }

  // Update email after OTP verification
  // Uses backend API with Firebase Admin SDK to update email
  Future<void> updateEmail({
    required String newEmail,
  }) async {
    try {
      final user = _auth.currentUser;
      if (user == null) {
        throw Exception('No user is currently signed in.');
      }

      final trimmedEmail = newEmail.trim().toLowerCase();

      if (trimmedEmail.isEmpty) {
        throw Exception('Email address cannot be empty');
      }

      // Server URL
      String serverUrl = const String.fromEnvironment(
        'SERVER_URL',
        defaultValue: 'http://localhost:3000',
      );

      if (kIsWeb && serverUrl == 'http://localhost:3000') {
        serverUrl = 'http://localhost:3000';
      }

      print('📧 Updating email to: $trimmedEmail');
      print('   Server URL: $serverUrl');

      // Check server status first
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
          throw Exception(
            'Server is not reachable. Please ensure the server is running.\n'
            'Run: cd server && npm run dev'
          );
        }
      }

      // Call email update API
      final response = await http.post(
        Uri.parse('$serverUrl/api/users/firebase/change-email'),
        headers: {
          'Content-Type': 'application/json',
        },
        body: jsonEncode({
          'uid': user.uid,
          'newEmail': trimmedEmail,
        }),
      ).timeout(
        const Duration(seconds: 10),
        onTimeout: () {
          throw Exception('Email update request timed out. Server may be slow or unreachable.');
        },
      );

      if (response.statusCode == 200) {
        final responseData = jsonDecode(response.body) as Map<String, dynamic>;
        if (responseData['success'] == true) {
          print('✅ Email update successful');
          
          // Update Firestore user document
          try {
            await _firestore.collection('users').doc(user.uid).update({
              'email': trimmedEmail,
              'updatedAt': FieldValue.serverTimestamp(),
            });
          } catch (e) {
            print('⚠️ Failed to update Firestore: $e');
            // Don't throw - email update succeeded in Firebase Auth
          }
          
          // Reload user to get updated email
          await user.reload();
          return;
        } else {
          throw Exception(responseData['error'] ?? 'Email update failed');
        }
      } else {
        final errorData = jsonDecode(response.body) as Map<String, dynamic>;
        final errorMessage = errorData['error'] ?? errorData['message'] ?? 'Email update failed';
        throw Exception(errorMessage);
      }
    } catch (e) {
      print('❌ Email update error: $e');
      if (e.toString().contains('Email update') ||
          e.toString().contains('OTP') ||
          e.toString().contains('Server is not reachable')) {
        rethrow;
      }
      throw Exception('Failed to update email: $e');
    }
  }

  // Handle Firebase Auth exceptions and return user-friendly messages
  Exception _handleAuthException(FirebaseAuthException e) {
    switch (e.code) {
      case 'weak-password':
        return Exception('The password provided is too weak.');
      case 'email-already-in-use':
        return Exception('This email is already in use.');
      case 'user-not-found':
        return Exception('No user found for that email.');
      case 'wrong-password':
        return Exception('Incorrect password.');
      case 'invalid-email':
        return Exception('The email address is invalid.');
      case 'user-disabled':
        return Exception('This user account has been disabled.');
      case 'too-many-requests':
        return Exception('Too many requests. Please try again later.');
      case 'operation-not-allowed':
        return Exception('This operation is not allowed.');
      case 'requires-recent-login':
        return Exception('Please re-authenticate to continue.');
      default:
        return Exception('Authentication failed: ${e.message}');
    }
  }
}
