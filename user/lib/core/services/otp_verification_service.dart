import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'dart:io' show Platform;
import 'package:http/http.dart' as http;
import 'dart:convert';

class OTPVerificationService {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

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
      
      // Send OTP via email using the backend server
      // Server URL - update this to your server URL
      // For local development: 
      //   - Web: http://localhost:3000
      //   - Mobile: http://YOUR_COMPUTER_IP:3000 (e.g., http://192.168.1.100:3000)
      //   - Android Emulator: http://10.0.2.2:3000
      //   - iOS Simulator: http://localhost:3000
      // For production: your production server URL
      // You can also set this via environment variable: --dart-define=SERVER_URL=http://your-server.com
      String serverUrl = const String.fromEnvironment(
        'SERVER_URL',
        defaultValue: '',
      );
      
      // If SERVER_URL is not set via environment, use platform-specific defaults
      if (serverUrl.isEmpty) {
        if (kIsWeb) {
          // Web: use localhost
          serverUrl = 'http://localhost:3000';
        } else {
          // Mobile: need to use computer's IP address or emulator address
          // For Android Emulator, use 10.0.2.2 to access host machine
          // For iOS Simulator, use localhost
          // For physical devices, use your computer's local IP (e.g., 192.168.x.x)
          if (Platform.isAndroid) {
            // Check if running on emulator (this is a heuristic)
            // In production, you should set SERVER_URL via --dart-define
            // For now, try emulator address first, but this should be configured
            serverUrl = 'http://10.0.2.2:3000'; // Android Emulator
            print('⚠️ Using Android Emulator default: $serverUrl');
            print('   For physical Android devices, set SERVER_URL to your computer\'s IP address');
            print('   Example: flutter run --dart-define=SERVER_URL=http://192.168.1.100:3000');
          } else if (Platform.isIOS) {
            // iOS Simulator can use localhost
            serverUrl = 'http://localhost:3000';
          } else {
            // Fallback
            serverUrl = 'http://localhost:3000';
            print('⚠️ Unknown platform, using localhost. This may not work on mobile devices.');
          }
        }
      }
      
      print('🌐 Using server URL: $serverUrl');
      print('   Platform: ${kIsWeb ? 'Web' : (Platform.isAndroid ? 'Android' : (Platform.isIOS ? 'iOS' : 'Unknown'))}');
      
      try {
        
        // First, try to check if server is reachable
        print('   🔍 Checking server connectivity at: $serverUrl/api/otp/status');
        try {
          final statusResponse = await http.get(
            Uri.parse('$serverUrl/api/otp/status'),
          ).timeout(
            const Duration(seconds: 8),
            onTimeout: () {
              print('   ⏱️ Server status check timed out');
              throw Exception('Server status check timed out');
            },
          );
          
          if (statusResponse.statusCode == 200) {
            print('   ✅ Server is reachable and responding');
          } else {
            print('⚠️ Server status check failed: ${statusResponse.statusCode}');
            print('   Response: ${statusResponse.body}');
          }
        } catch (statusError) {
          final errorStr = statusError.toString().toLowerCase();
          print('   ❌ Server status check failed: $statusError');
          print('   Server URL: $serverUrl');
          
          if (errorStr.contains('connection refused') || 
              errorStr.contains('failed host lookup') ||
              errorStr.contains('network is unreachable') ||
              errorStr.contains('failed to fetch') ||
              errorStr.contains('clientexception') ||
              errorStr.contains('socketexception') ||
              errorStr.contains('timeout')) {
            print('   ⚠️  Server appears to be offline or unreachable');
            
            // For mobile, throw early if server is clearly unreachable
            if (!kIsWeb) {
              String errorMsg = 'Server is not reachable at $serverUrl\n\n';
              if (Platform.isAndroid && serverUrl.contains('10.0.2.2')) {
                errorMsg += '⚠️ Using Android Emulator address (10.0.2.2)\n\n'
                    'If you\'re using a PHYSICAL Android device, this won\'t work!\n'
                    'You must set SERVER_URL to your computer\'s IP address:\n\n'
                    '1. Find your computer\'s IP:\n'
                    '   Windows: ipconfig (look for IPv4 Address)\n'
                    '   Mac/Linux: ifconfig or ip addr\n\n'
                    '2. Run with:\n'
                    '   flutter run --dart-define=SERVER_URL=http://YOUR_IP:3000\n\n'
                    'Example: flutter run --dart-define=SERVER_URL=http://192.168.1.100:3000\n\n';
              }
              errorMsg += 'Please ensure:\n'
                  '1. Server is running: cd server && npm run dev\n'
                  '2. Server is accessible from your device\n'
                  '3. Both devices are on the same network\n'
                  '4. Firewall is not blocking port 3000';
              throw Exception(errorMsg);
            }
            // For web, continue to try sending anyway
            print('   Will attempt to send OTP anyway, but it will likely fail...');
          }
        }

        print('   📤 Sending HTTP POST request to: $serverUrl/api/otp/send');
        print('   Request body: {email: ${email.trim()}, otpCode: $otpCode}');
        
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
          const Duration(seconds: 15), // Increased timeout to 15 seconds
          onTimeout: () {
            print('   ⏱️ Request timed out after 15 seconds');
            throw Exception('Email sending request timed out. Server may be slow or unreachable.');
          },
        );
        
        print('   📥 Response received: Status ${response.statusCode}');
        
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
          print('   Error Type: Connection Refused (Server not running or unreachable)');
          print('');
          print('   🔧 Troubleshooting Steps:');
          print('   1. Start the server:');
          print('      - Open a terminal/command prompt');
          print('      - Navigate to: cd server');
          print('      - Run: npm run dev');
          print('      - Wait for: "Listening to port 3000" message');
          print('');
          if (!kIsWeb) {
            print('   2. For MOBILE DEVICES (Android/iOS):');
            print('      ⚠️  IMPORTANT: localhost/10.0.2.2 won\'t work on physical devices!');
            print('      - Find your computer\'s IP address:');
            print('        * Windows: ipconfig (look for IPv4 Address)');
            print('        * Mac/Linux: ifconfig or ip addr (look for inet)');
            print('      - Example IP: 192.168.1.100');
            print('      - Run app with: flutter run --dart-define=SERVER_URL=http://YOUR_IP:3000');
            print('      - Example: flutter run --dart-define=SERVER_URL=http://192.168.1.100:3000');
            print('');
            print('   3. For Android Emulator:');
            print('      - Use: http://10.0.2.2:3000 (already configured)');
            print('      - Make sure server is running on your computer');
            print('');
            print('   4. For iOS Simulator:');
            print('      - Use: http://localhost:3000 (already configured)');
            print('      - Make sure server is running on your computer');
            print('');
            
            // Throw error for mobile devices so user knows it failed
            String errorMessage = 'Failed to send OTP email. Server connection failed.\n\n';
            
            if (serverUrl.contains('localhost') || serverUrl.contains('127.0.0.1')) {
              errorMessage += 'Cannot connect to server on mobile device.\n\n'
                  'For physical mobile devices, you must set your computer\'s IP address:\n'
                  '1. Find your computer\'s IP (Windows: ipconfig, Mac/Linux: ifconfig)\n'
                  '2. Run: flutter run --dart-define=SERVER_URL=http://YOUR_IP:3000\n'
                  'Example: flutter run --dart-define=SERVER_URL=http://192.168.1.100:3000\n\n'
                  'Current server URL: $serverUrl';
            } else if (Platform.isAndroid && serverUrl.contains('10.0.2.2')) {
              errorMessage += 'Using Android Emulator address (10.0.2.2).\n\n'
                  'If you\'re on a physical Android device, this won\'t work!\n'
                  'Set SERVER_URL to your computer\'s IP address:\n'
                  '1. Find your computer\'s IP (Windows: ipconfig, Mac/Linux: ifconfig)\n'
                  '2. Run: flutter run --dart-define=SERVER_URL=http://YOUR_IP:3000\n'
                  'Example: flutter run --dart-define=SERVER_URL=http://192.168.1.100:3000\n\n'
                  'Current server URL: $serverUrl';
            } else {
              errorMessage += 'Server is not reachable at: $serverUrl\n\n'
                  'Please ensure:\n'
                  '1. The server is running (cd server && npm run dev)\n'
                  '2. Your mobile device and computer are on the same network\n'
                  '3. The server URL is correct';
            }
            
            throw Exception(errorMessage);
          }
          
          print('   5. Verify server is running:');
          print('      - Open in browser: $serverUrl/health');
          print('      - Should show: {"status":"ok",...}');
          print('');
          print('   6. Check server port:');
          print('      - Default port: 3000');
          print('      - Check server/.env file for PORT setting');
          print('      - If different port, update SERVER_URL');
          print('');
          if (kIsWeb) {
            print('   7. For web apps:');
            print('      - Ensure server CORS allows your origin');
            print('      - Check browser console for CORS errors');
            print('');
          }
          
          // For web, don't throw - OTP is stored, email sending is optional
          if (kIsWeb) {
            print('   ⚠️  Note: OTP is saved in Firestore, but email cannot be sent until server is running.');
          }
        } else if (errorStr.contains('timeout')) {
          print('⏱️ Request timed out: $e');
          print('   Server URL: $serverUrl');
          print('   The server may be slow or unreachable');
          print('   Check server logs for errors');
          
          // Throw error for mobile devices
          if (!kIsWeb) {
            throw Exception(
              'OTP email request timed out. Server may be unreachable.\n\n'
              'Please check:\n'
              '1. Server is running (cd server && npm run dev)\n'
              '2. Server URL is correct: $serverUrl\n'
              '3. Your device and computer are on the same network'
            );
          }
        } else {
          print('⚠️ OTP email sending error: $e');
          print('   Server URL: $serverUrl');
          print('   Check server logs for more details');
          
          // Throw error for mobile devices
          if (!kIsWeb) {
            throw Exception(
              'Failed to send OTP email: $e\n\n'
              'Server URL: $serverUrl\n'
              'Please check server logs and ensure the server is running.'
            );
          }
        }
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
