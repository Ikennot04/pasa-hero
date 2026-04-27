import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'dart:io' show Platform;
import 'package:http/http.dart' as http;
import 'dart:convert';

/// Sends OTP codes by:
/// 1. Writing the code to Firestore (`otp_verifications`).
/// 2. Calling the backend **`POST /api/otp/send`**, which uses **Nodemailer**
///    in [server/modules/otp/otp.service.js] to deliver email.
///
/// The Flutter app cannot run Nodemailer (Node-only); the HTTP route is the
/// supported way to trigger it.
class OTPVerificationService {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  /// Same host as [AuthService] / production API. Override with
  /// `--dart-define=SERVER_URL=http://localhost:3000` for local OTP email.
  static const String _defaultApiBaseUrl =
      'https://pasa-hero-server.vercel.app';

  // Send OTP to email
  Future<void> sendOTP({required String email}) async {
    print('📧 OTPVerificationService: sendOTP called');
    print('   Email: $email');
    print('   Platform: ${kIsWeb ? 'Web' : (Platform.isAndroid ? 'Android' : (Platform.isIOS ? 'iOS' : 'Unknown'))}');
    
    try {
      // Generate a 6-digit OTP
      final otpCode = (100000 + (DateTime.now().millisecondsSinceEpoch % 900000)).toString();
      print('   Generated OTP: $otpCode');
      
      // Store OTP in Firestore with expiration (5 minutes)
      final otpDoc = _firestore.collection('otp_verifications').doc(email.trim());
      
      print('   Storing OTP in Firestore...');
      await otpDoc.set({
        'otp': otpCode,
        'email': email.trim(),
        'createdAt': FieldValue.serverTimestamp(),
        'expiresAt': DateTime.now().add(const Duration(minutes: 5)).toIso8601String(),
        'verified': false,
      });
      print('   ✅ OTP stored in Firestore successfully');
      
      String serverUrl = const String.fromEnvironment(
        'SERVER_URL',
        defaultValue: '',
      );

      if (serverUrl.isEmpty) {
        serverUrl = _defaultApiBaseUrl;
      }

      print('🌐 OTP email via Nodemailer: POST $serverUrl/api/otp/send');
      print(
        '   Platform: ${kIsWeb ? 'Web' : (Platform.isAndroid ? 'Android' : (Platform.isIOS ? 'iOS' : 'Unknown'))}',
      );

      try {
        final response = await http
            .post(
              Uri.parse('$serverUrl/api/otp/send'),
              headers: {'Content-Type': 'application/json'},
              body: jsonEncode({
                'email': email.trim(),
                'otpCode': otpCode,
              }),
            )
            .timeout(
              const Duration(seconds: 20),
              onTimeout: () {
                throw Exception(
                  'Request timed out. Check network and that $serverUrl is reachable.',
                );
              },
            );

        print('   📥 Nodemailer route responded: HTTP ${response.statusCode}');

        if (response.statusCode != 200) {
          var msg =
              'Could not send OTP email (HTTP ${response.statusCode}). ';
          try {
            final decoded = jsonDecode(response.body);
            if (decoded is Map<String, dynamic>) {
              final m = decoded['message']?.toString().trim();
              final err = decoded['error']?.toString().trim();
              if (m != null && m.isNotEmpty) {
                msg = m;
              } else if (err != null && err.isNotEmpty) {
                msg = err;
              }
            }
          } catch (_) {
            final body = response.body.trim();
            if (body.isNotEmpty) {
              msg += body.length > 300 ? '${body.substring(0, 300)}…' : body;
            }
          }
          print('   ❌ $msg');
          throw Exception(msg);
        }

        print('   ✅ Nodemailer sent OTP email');
      } catch (e) {
        final errorStr = e.toString().toLowerCase();
        final isNetwork = errorStr.contains('connection refused') ||
            errorStr.contains('failed host lookup') ||
            errorStr.contains('network is unreachable') ||
            errorStr.contains('failed to fetch') ||
            errorStr.contains('clientexception') ||
            errorStr.contains('socketexception');

        if (isNetwork) {
          throw Exception(
            'Cannot reach the server at $serverUrl to send OTP (Nodemailer).\n\n'
            'For local dev use:\n'
            'flutter run --dart-define=SERVER_URL=http://YOUR_IP:3000\n\n'
            'Production uses Vercel; ensure the app can access the internet.',
          );
        }
        rethrow;
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
