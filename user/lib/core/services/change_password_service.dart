import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:http/http.dart' as http;
import 'dart:convert';

class ChangePasswordService {
  final FirebaseAuth _auth = FirebaseAuth.instance;

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

  // Reset password after OTP verification
  // Uses backend API with Firebase Admin SDK to update password
  Future<void> resetPassword({
    required String email,
    required String newPassword,
  }) async {
    try {
      // Validate inputs
      final trimmedEmail = email.trim().toLowerCase();
      final trimmedPassword = newPassword.trim();

      if (trimmedEmail.isEmpty) {
        throw Exception('Email address cannot be empty');
      }

      if (trimmedPassword.isEmpty) {
        throw Exception('Password cannot be empty');
      }

      if (trimmedPassword.length < 6) {
        throw Exception('Password must be at least 6 characters long');
      }

      // Server URL - same as OTP sending
      String serverUrl = const String.fromEnvironment(
        'SERVER_URL',
        defaultValue: 'http://localhost:3000',
      );

      if (kIsWeb && serverUrl == 'http://localhost:3000') {
        serverUrl = 'http://localhost:3000';
      }

      print('🔐 Resetting password for: $trimmedEmail');
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
          print('❌ Server status check failed: $statusError');
          print('   Server URL: $serverUrl');
          print('   ⚠️  Server appears to be offline or unreachable');
          throw Exception(
            'Server is not reachable. Please ensure the server is running.\n'
            'Run: cd server && npm run dev'
          );
        }
      }

      // Call password reset API
      final response = await http.post(
        Uri.parse('$serverUrl/api/otp/reset-password'),
        headers: {
          'Content-Type': 'application/json',
        },
        body: jsonEncode({
          'email': trimmedEmail,
          'newPassword': trimmedPassword,
        }),
      ).timeout(
        const Duration(seconds: 10),
        onTimeout: () {
          throw Exception('Password reset request timed out. Server may be slow or unreachable.');
        },
      );

      if (response.statusCode == 200) {
        final responseData = jsonDecode(response.body) as Map<String, dynamic>;
        if (responseData['success'] == true) {
          print('✅ Password reset successful');
          return;
        } else {
          throw Exception(responseData['error'] ?? 'Password reset failed');
        }
      } else {
        final errorData = jsonDecode(response.body) as Map<String, dynamic>;
        final errorMessage = errorData['error'] ?? errorData['message'] ?? 'Password reset failed';
        final troubleshooting = errorData['troubleshooting'];
        
        String fullMessage = errorMessage;
        if (troubleshooting != null) {
          if (troubleshooting is List) {
            fullMessage += '\n\nTroubleshooting:\n';
            for (var item in troubleshooting) {
              fullMessage += '  • $item\n';
            }
          } else {
            fullMessage += '\n\n$troubleshooting';
          }
        }
        
        throw Exception(fullMessage);
      }
    } catch (e) {
      print('❌ Password reset error: $e');
      if (e.toString().contains('Password reset') ||
          e.toString().contains('OTP') ||
          e.toString().contains('User account not found') ||
          e.toString().contains('Server is not reachable')) {
        rethrow;
      }
      throw Exception('Failed to reset password: $e');
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
