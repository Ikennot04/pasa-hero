import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:http/http.dart' as http;
import 'dart:convert';

class OTPVerificationService {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

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
}
