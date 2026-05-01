import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import '../../../shared/nav_bar.dart';
import '../../../core/services/backend_api_service.dart';

/// Firestore users collection; operator documents use role_id / roleid = 2.
const String _usersCollection = 'users';
const String _operatorSigninPath = '/api/users/auth/signin';

/// Operator role id (matches backend/users table).
const int operatorRoleId = 2;

bool _isOperatorRoleFromUserMap(Map<String, dynamic>? userMap) {
  if (userMap == null) return false;
  final role = userMap['role']?.toString().trim().toLowerCase();
  final roleIdValue = userMap['roleid'] ?? userMap['role_id'];
  final roleId = roleIdValue is num ? roleIdValue.toInt() : int.tryParse('${roleIdValue ?? ''}');
  return role == 'operator' || roleId == 2;
}

Map<String, dynamic>? _userMapFromSigninPayload(Map<String, dynamic>? backendPayload) {
  final userData = backendPayload?['data'];
  if (userData is! Map<String, dynamic>) return null;
  if (userData['user'] is Map<String, dynamic>) {
    return userData['user'] as Map<String, dynamic>;
  }
  return userData;
}

class LoginForm extends StatefulWidget {
  const LoginForm({super.key});

  @override
  State<LoginForm> createState() => _LoginFormState();
}

class _LoginFormState extends State<LoginForm> {
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _obscurePassword = true;
  bool _isLoading = false;
  bool _isRegistering = false; // Toggle between login and registration
  bool _acceptedTerms = false;
  bool _attemptedSubmit = false;
  bool _attemptedTermsOnly = false;
  final BackendApiService _backendApi = BackendApiService();

  static const String _termsText =
      'Effective Date: April 28, 2026\n\n'
      'These Terms apply to all drivers using the PasaHero platform.\n\n'
      '1. Acceptance of Terms\n\n'
      'By registering as a driver, you agree to comply with these Terms.\n\n'
      '2. Driver Role\n\n'
      'PasaHero provides a platform for drivers to:\n\n'
      'Share real-time location\n'
      'Assist commuters with route visibility\n\n'
      'PasaHero does not employ drivers and is not a transport operator.\n\n'
      '3. Data Collection & Usage\n\n'
      'We collect:\n\n'
      'Real-time GPS location\n'
      'Personal Information (name, contact, vehicle details)\n'
      'Device and usage data\n\n'
      'Data is processed using third-party services such as Google Maps API.\n\n'
      '4. Location Sharing Requirement\n\n'
      'Drivers must:\n\n'
      'Keep GPS/location services ON while active\n'
      'Ensure location accuracy for commuters\n\n'
      'Failure to do so may result in account suspension.\n\n'
      '5. Driver Responsibilities\n\n'
      'Drivers agree to:\n\n'
      'Provide accurate and updated information\n'
      'Operate legally registered vehicles\n'
      'Follow traffic laws and local regulations\n'
      'Not manipulate location data\n\n'
      '6. Prohibited Actions\n\n'
      'Drivers must NOT:\n\n'
      'Fake or alter GPS location\n'
      'Use the app for illegal activities\n'
      'Share accounts with others\n\n'
      '7. Service Disclaimer\n\n'
      'PasaHero:\n\n'
      'Does not guarantee passenger volume\n'
      'Is not liable for earnings, losses, or disputes\n\n'
      '8. Account Suspension\n\n'
      'We may suspend or terminate accounts for:\n\n'
      'Violations of these Terms\n'
      'Fraudulent or suspicious activity\n\n'
      '9. Limitation of Liability\n\n'
      'PasaHero is not responsible for:\n\n'
      'Accidents, damages, or incidents أثناء driving\n'
      'Loss of income or operational issues\n\n'
      '10. Changes to Terms\n\n'
      'We may update these Terms at any time. Continued use means acceptance.\n\n'
      '11. Contact\n\n'
      'For support: pasaherocommunity@gmail.com';

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  void _showTermsDialog() {
    showDialog<void>(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: const Text('Terms & Agreement'),
          content: const SingleChildScrollView(
            child: Text(
              _termsText,
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('Close'),
            ),
          ],
        );
      },
    );
  }

  bool get _hasFirebase {
    try {
      return Firebase.apps.isNotEmpty;
    } catch (_) {
      return false;
    }
  }

  /// True if [users] doc marks this account as an operator (Firebase-only login path).
  Future<bool> _isFirestoreOperator(String uid) async {
    try {
      final doc = await FirebaseFirestore.instance
          .collection(_usersCollection)
          .doc(uid)
          .get();
      if (!doc.exists) return false;
      final data = doc.data();
      if (data == null) return false;
      return _isOperatorRoleFromUserMap(data);
    } catch (e) {
      print('⚠️ [LoginForm] _isFirestoreOperator: $e');
      return false;
    }
  }

  /// Checks if a Firestore document exists for the given user.
  Future<bool> _checkFirestoreDocumentExists(String userId) async {
    try {
      final doc = await FirebaseFirestore.instance
          .collection(_usersCollection)
          .doc(userId)
          .get();
      return doc.exists;
    } catch (e) {
      print('⚠️ [LoginForm] Error checking Firestore document: $e');
      return false;
    }
  }

  /// Attempts to recover an orphaned account (Auth exists but Firestore doesn't).
  /// Returns true if recovery was successful, false otherwise.
  Future<bool> _recoverOrphanedAccount(String email, String password) async {
    try {
      print('🔄 [LoginForm] Attempting to recover orphaned account: $email');
      
      // Try to sign in to get the user
      try {
        final credential = await FirebaseAuth.instance.signInWithEmailAndPassword(
          email: email,
          password: password,
        );
        
        if (credential.user == null) {
          print('❌ [LoginForm] Recovery failed: Could not sign in - no user returned');
          return false;
        }
        
        final user = credential.user!;
        
        // Check if Firestore document exists
        final docExists = await _checkFirestoreDocumentExists(user.uid);
        
        if (!docExists) {
          // Document doesn't exist - create it
          print('📝 [LoginForm] Creating missing Firestore document for orphaned account');
          await _upsertOperatorUser(user);
          print('✅ [LoginForm] Orphaned account recovered successfully');
          return true;
        } else {
          print('✅ [LoginForm] Firestore document already exists - not orphaned');
          return true;
        }
      } on FirebaseAuthException catch (authError) {
        if (authError.code == 'wrong-password' || authError.code == 'invalid-credential') {
          print('⚠️ [LoginForm] Recovery failed: Wrong password provided');
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text(
                  'Account exists but password is incorrect.\n'
                  'Please use the correct password to log in, or use "Forgot Password" to reset it.',
                ),
                backgroundColor: Colors.orange,
                duration: Duration(seconds: 5),
              ),
            );
          }
          return false;
        } else if (authError.code == 'user-not-found') {
          print('⚠️ [LoginForm] Recovery failed: User not found in Auth');
          // This shouldn't happen if we got "email-already-in-use" but handle it anyway
          return false;
        }
        rethrow;
      }
    } catch (e) {
      print('❌ [LoginForm] Recovery failed: $e');
      return false;
    }
  }

  /// Writes or updates the current user in Firestore users table with role_id = 2 (operator).
  /// [routeCode] is the CODE representing the route from POINT_A to POINT_B.
  Future<void> _upsertOperatorUser(User user, {String? routeCode}) async {
    if (!_hasFirebase) {
      print('⚠️ [LoginForm] Firebase not initialized, skipping Firestore update');
      return;
    }
    
    try {
      final doc = FirebaseFirestore.instance.collection(_usersCollection).doc(user.uid);
      final data = <String, dynamic>{
        'email': user.email ?? '',
        'role': 'operator',
        'roleid': operatorRoleId,
        'role_id': operatorRoleId,
        'updatedAt': FieldValue.serverTimestamp(),
      };
      
      // Add route code if provided (for new registrations)
      if (routeCode != null && routeCode.isNotEmpty) {
        data['routeCode'] = routeCode.trim().toUpperCase();
        data['route_code'] = routeCode.trim().toUpperCase(); // Also store as snake_case for consistency
      }
      
      // Check if document exists to determine if we're creating or updating
      final existing = await doc.get();
      if (!existing.exists) {
        // Creating new document - use set() without merge
        data['createdAt'] = FieldValue.serverTimestamp();
        await doc.set(data);
        print('✅ [LoginForm] Created operator user document: ${user.uid}');
      } else {
        // Updating existing document - use update() for better permission handling
        // Only update fields that might have changed
        await doc.update(data);
        print('✅ [LoginForm] Updated operator user document: ${user.uid}');
      }
    } on FirebaseException catch (e) {
      print('❌ [LoginForm] Firestore error: ${e.code} - ${e.message}');
      if (e.code == 'permission-denied') {
        throw Exception(
          'Firestore permission denied. Please deploy security rules:\n'
          'Run: cd user && firebase deploy --only firestore:rules'
        );
      } else if (e.code == 'unavailable') {
        throw Exception('Firestore is temporarily unavailable. Please try again later.');
      } else if (e.code == 'deadline-exceeded') {
        throw Exception('Firestore request timed out. Please check your internet connection.');
      }
      rethrow;
    } catch (e) {
      print('❌ [LoginForm] Error upserting operator user: $e');
      rethrow;
    }
  }


  /// Creates a new operator account with route code.
  Future<void> _register() async {
    if (!_hasFirebase) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Firebase is not initialized. Restart the app and check configuration.'),
            backgroundColor: Colors.red,
          ),
        );
      }
      return;
    }
    
    final email = _emailController.text.trim();
    final password = _passwordController.text;
    
    if (email.isEmpty || password.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Enter email and password')),
      );
      return;
    }
    
    setState(() => _isLoading = true);
    User? createdUser;
    try {
      print('🔄 [LoginForm] Starting registration for: $email');
      
      // Step 1: Create Firebase Auth account
      print('📝 [LoginForm] Step 1: Creating Firebase Auth account...');
      final credential = await FirebaseAuth.instance.createUserWithEmailAndPassword(
        email: email,
        password: password,
      );
      createdUser = credential.user;
      
      if (createdUser == null) {
        throw Exception('Account creation failed: No user returned from Firebase Auth');
      }
      
      print('✅ [LoginForm] Step 1: Auth account created - UID: ${createdUser.uid}');
      print('📝 [LoginForm] Step 2: Creating Firestore document...');
      
      // Step 2: Create Firestore document
      try {
        await _upsertOperatorUser(createdUser);
        print('✅ [LoginForm] Step 2: Firestore document created successfully');
        print('✅ [LoginForm] Registration successful: Auth + Firestore');
      } on FirebaseException catch (firestoreError) {
        // If Firestore fails, delete the Auth account to prevent orphaned accounts
        print('❌ [LoginForm] Firestore failed during registration');
        print('   Error code: ${firestoreError.code}');
        print('   Error message: ${firestoreError.message}');
        
        try {
          print('🗑️ [LoginForm] Deleting Auth account due to Firestore failure...');
          await createdUser.delete();
          print('✅ [LoginForm] Auth account deleted successfully');
        } catch (deleteError) {
          print('⚠️ [LoginForm] Could not delete Auth account: $deleteError');
        }
        
        // Provide specific error message based on error code
        String errorMsg = 'Account creation failed: Could not save profile data.\n\n';
        if (firestoreError.code == 'permission-denied') {
          errorMsg += '❌ PERMISSION DENIED\n\n';
          errorMsg += 'Firestore security rules are blocking the write operation.\n\n';
          errorMsg += 'To fix this:\n';
          errorMsg += '1. Open terminal and run:\n';
          errorMsg += '   cd user\n';
          errorMsg += '   firebase deploy --only firestore:rules\n\n';
          errorMsg += '2. Or manually update rules in Firebase Console:\n';
          errorMsg += '   - Go to Firebase Console → Firestore → Rules\n';
          errorMsg += '   - Copy rules from user/firestore.rules\n';
          errorMsg += '   - Click Publish\n';
        } else if (firestoreError.code == 'unavailable') {
          errorMsg += '❌ FIRESTORE UNAVAILABLE\n\n';
          errorMsg += 'Firestore service is temporarily unavailable.\n';
          errorMsg += 'Please check your internet connection and try again.';
        } else if (firestoreError.code == 'deadline-exceeded') {
          errorMsg += '❌ REQUEST TIMEOUT\n\n';
          errorMsg += 'The request took too long. Please check your internet connection.';
        } else {
          errorMsg += 'Error code: ${firestoreError.code}\n';
          errorMsg += 'Error: ${firestoreError.message}';
        }
        
        throw Exception(errorMsg);
      } catch (firestoreError) {
        // Handle non-FirebaseException errors
        print('❌ [LoginForm] Unexpected Firestore error: $firestoreError');
        try {
          await createdUser.delete();
        } catch (_) {}
        rethrow;
      }
      
      // Step 3: Success - show message and navigate
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Account created successfully!'),
            backgroundColor: Colors.green,
            duration: Duration(seconds: 3),
          ),
        );
        // Auto-login after successful registration
        await Future.delayed(const Duration(milliseconds: 500));
        if (mounted) {
          Navigator.of(context).pushReplacementNamed(NavBar.routeName);
        }
      }
    } on FirebaseAuthException catch (e) {
      if (mounted) {
        String msg = e.message ?? 'Registration failed';
        if (e.code == 'email-already-in-use') {
          // Try to recover orphaned account
          setState(() => _isLoading = true);
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Email already registered. Attempting to recover account...'),
              backgroundColor: Colors.orange,
              duration: Duration(seconds: 3),
            ),
          );
          
          final recovered = await _recoverOrphanedAccount(email, password);
          
          if (recovered) {
            // Account recovered - proceed to login
            if (mounted) {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('Account recovered! Logging you in...'),
                  backgroundColor: Colors.green,
                  duration: Duration(seconds: 2),
                ),
              );
              // Auto-login after recovery
              await Future.delayed(const Duration(milliseconds: 500));
              if (mounted) {
                Navigator.of(context).pushReplacementNamed(NavBar.routeName);
              }
            }
            return;
          } else {
            // Recovery failed - show error
            msg = 'Email already registered but account recovery failed.\n\n'
                'Please try:\n'
                '1. Log in with your password\n'
                '2. If login fails, the password may be incorrect\n'
                '3. Contact support if the problem persists';
          }
        } else if (e.code == 'weak-password') {
          msg = 'Password is too weak. Use a stronger password (at least 6 characters).';
        } else if (e.code == 'invalid-email') {
          msg = 'Invalid email address. Please check your email format.';
        }
        
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(msg),
              backgroundColor: Colors.red,
              duration: const Duration(seconds: 6),
            ),
          );
        }
      }
    } on Exception catch (e) {
      // Handle Firestore errors and other exceptions
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(e.toString().replaceAll('Exception: ', '')),
            backgroundColor: Colors.red,
            duration: const Duration(seconds: 6),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        print('❌ [LoginForm] Unexpected registration error: $e');
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Registration error: ${e.toString()}'),
            backgroundColor: Colors.red,
            duration: const Duration(seconds: 5),
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _login() async {
    if (!_hasFirebase) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Firebase is not initialized. Restart the app and check configuration.'),
            backgroundColor: Colors.red,
          ),
        );
      }
      return;
    }
    final email = _emailController.text.trim();
    final password = _passwordController.text;
    if (email.isEmpty || password.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Enter email and password')),
      );
      return;
    }
    setState(() => _isLoading = true);
    try {
      // Same email, different casing can matter for Mongo exact match — try variants (no server change).
      final lowerEmail = email.toLowerCase();
      final emailCandidates = <String>{
        email,
        if (lowerEmail != email) lowerEmail,
      };

      Map<String, dynamic>? backendPayload;
      try {
        for (final emailCandidate in emailCandidates) {
          final backendResponse = await _backendApi.post(
            _operatorSigninPath,
            body: <String, dynamic>{
              'email': emailCandidate,
              'password': password,
            },
          );
          backendPayload = backendResponse.data;

          if (backendResponse.success) {
            final userMap = _userMapFromSigninPayload(backendPayload);
            if (!_isOperatorRoleFromUserMap(userMap)) {
              throw Exception('Account not found');
            }
            break;
          }

          final msg = backendResponse.error ?? backendPayload?['message']?.toString() ?? '';
          final msgLower = msg.toLowerCase();
          if (msgLower.contains('invalid password') ||
              msgLower.contains('wrong password') ||
              msgLower.contains('incorrect password')) {
            throw Exception(msg.isNotEmpty ? msg : 'Invalid password');
          }
          if (!msgLower.contains('email not found') && !msgLower.contains('not found')) {
            throw Exception(msg.isNotEmpty ? msg : 'Login failed');
          }
          backendPayload = null;
        }
      } on FormatException {
        throw Exception('Login failed: invalid server response');
      }

      final backendValidatedOperator = backendPayload != null;

      UserCredential? credential;
      FirebaseAuthException? lastAuthError;
      for (final emailCandidate in emailCandidates) {
        try {
          credential = await FirebaseAuth.instance.signInWithEmailAndPassword(
            email: emailCandidate,
            password: password,
          );
          break;
        } on FirebaseAuthException catch (e) {
          lastAuthError = e;
          if (e.code == 'user-not-found') {
            continue;
          }
          rethrow;
        }
      }
      if (credential == null) {
        if (lastAuthError != null) throw lastAuthError;
        throw Exception('Login failed');
      }
      
      if (credential.user == null) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Login failed: No user returned'), backgroundColor: Colors.red),
          );
        }
        return;
      }

      if (!backendValidatedOperator) {
        final isOperatorInFirestore = await _isFirestoreOperator(credential.user!.uid);
        if (!isOperatorInFirestore) {
          await FirebaseAuth.instance.signOut();
          throw Exception('Account not found');
        }
      }
      
      // Try to create/update Firestore document
      try {
        await _upsertOperatorUser(credential.user!);
        print('✅ [LoginForm] Firestore document updated during login');
      } catch (firestoreError) {
        // Log the error
        print('⚠️ [LoginForm] Firestore update failed during login: $firestoreError');
        
        // Check if document exists
        final doc = await FirebaseFirestore.instance
            .collection(_usersCollection)
            .doc(credential.user!.uid)
            .get();
        
        if (!doc.exists) {
          // Document doesn't exist - this is a problem
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: const Text(
                  'Account found but profile data is missing. Creating profile now...',
                ),
                backgroundColor: Colors.orange,
                duration: const Duration(seconds: 3),
              ),
            );
            // Try one more time to create the document
            try {
              await _upsertOperatorUser(credential.user!);
              print('✅ [LoginForm] Firestore document created on retry');
            } catch (retryError) {
              print('❌ [LoginForm] Retry also failed: $retryError');
              if (mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text(
                      'Warning: Could not save profile data. Please check Firestore rules.\n'
                      'You are logged in but some features may not work.',
                    ),
                    backgroundColor: Colors.orange,
                    duration: const Duration(seconds: 5),
                  ),
                );
              }
            }
          }
        } else {
          // Document exists but update failed - not critical, allow login
          print('⚠️ [LoginForm] Firestore document exists but update failed - allowing login');
        }
      }
      
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Logged in successfully'), backgroundColor: Colors.green),
        );
        Navigator.of(context).pushReplacementNamed(NavBar.routeName);
      }
    } on FirebaseAuthException catch (e) {
      if (mounted) {
        String msg = e.message ?? 'Login failed';
        if (e.code == 'user-not-found') {
          msg = 'No account found for this email. Please sign up first.';
        } else if (e.code == 'invalid-credential' || e.code == 'wrong-password') {
          // Check if this might be an orphaned account issue
          // Try to see if we can provide better guidance
          msg = 'Invalid email or password.\n\n'
              'If you just registered, the account may not be fully set up.\n'
              'Try registering again - it will recover your account automatically.';
        } else if (e.code == 'invalid-email') {
          msg = 'Invalid email address. Please check your email.';
        } else if (e.code == 'user-disabled') {
          msg = 'This account has been disabled. Please contact support.';
        } else if (e.code == 'too-many-requests') {
          msg = 'Too many failed login attempts. Please try again later.';
        }
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(msg), backgroundColor: Colors.red, duration: const Duration(seconds: 5)),
        );
      }
    } catch (e) {
      if (mounted) {
        print('❌ [LoginForm] Unexpected login error: $e');
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Login error: ${e.toString()}'),
            backgroundColor: Colors.red,
            duration: const Duration(seconds: 5),
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final showFieldErrors = _attemptedSubmit;
    final showTermsError = _attemptedSubmit || _attemptedTermsOnly;
    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const SizedBox(height: 40),
              // Logo
              Image.asset(
                'assets/images/pasahero_logo.png',
                height: 80,
                fit: BoxFit.contain,
              ),
              const SizedBox(height: 40),
              // Welcome Message
              const Text(
                'Welcome Operator',
                style: TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                  color: Colors.black,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                _isRegistering
                    ? 'Create your operator account to get started'
                    : 'Login to continue',
                style: const TextStyle(
                  fontSize: 14,
                  color: Colors.grey,
                ),
              ),
              const SizedBox(height: 40),
              // Email Field
              _buildEmailField(showError: showFieldErrors && _emailController.text.trim().isEmpty),
              const SizedBox(height: 24),
              // Password Field
              _buildPasswordField(showError: showFieldErrors && _passwordController.text.isEmpty),
              const SizedBox(height: 20),
              // Terms & Agreement checkbox (required)
              Container(
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(
                    color: showTermsError && !_acceptedTerms
                        ? Colors.red
                        : Colors.transparent,
                    width: 1.5,
                  ),
                ),
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    Checkbox(
                      value: _acceptedTerms,
                      onChanged: (v) {
                        setState(() => _acceptedTerms = v ?? false);
                      },
                      activeColor: Colors.blue,
                      materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                    ),
                    Expanded(
                      child: Wrap(
                        crossAxisAlignment: WrapCrossAlignment.center,
                        children: [
                          const Text('I agree to the '),
                          InkWell(
                            onTap: _showTermsDialog,
                            child: const Text(
                              'Terms & Agreement',
                              style: TextStyle(
                                color: Colors.blue,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                          if (showTermsError && !_acceptedTerms) ...[
                            const SizedBox(width: 8),
                            const Text(
                              '(required)',
                              style: TextStyle(
                                color: Colors.red,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),
              // Login/Register Button
              _buildLoginButton(),
              const SizedBox(height: 12),
              // Toggle between login and registration
              TextButton(
                onPressed: _isLoading ? null : () {
                  setState(() {
                    _isRegistering = !_isRegistering;
                  });
                },
                child: Text(
                  _isRegistering
                      ? 'Already have an account? Log in'
                      : 'Don\'t have an account? Sign up',
                  style: const TextStyle(fontSize: 14),
                ),
              ),
              const SizedBox(height: 20),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildEmailField({required bool showError}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Email address',
          style: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w500,
            color: Colors.black,
          ),
        ),
        const SizedBox(height: 8),
        Container(
          decoration: BoxDecoration(
            color: const Color(0xFFE8F0FE),
            borderRadius: BorderRadius.circular(8),
            border: Border.all(
              color: showError ? Colors.red : Colors.transparent,
              width: 1.5,
            ),
          ),
          child: TextField(
            controller: _emailController,
            keyboardType: TextInputType.emailAddress,
            onChanged: (_) {
              if (_attemptedSubmit) setState(() {});
            },
            decoration: const InputDecoration(
              hintText: 'Enter email',
              hintStyle: TextStyle(color: Colors.grey),
              border: InputBorder.none,
              contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 16),
            ),
          ),
        ),
        if (showError)
          const Padding(
            padding: EdgeInsets.only(top: 6),
            child: Text(
              'Required',
              style: TextStyle(color: Colors.red, fontSize: 12),
            ),
          ),
      ],
    );
  }

  Widget _buildPasswordField({required bool showError}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Password',
          style: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w500,
            color: Colors.black,
          ),
        ),
        const SizedBox(height: 8),
        Container(
          decoration: BoxDecoration(
            color: const Color(0xFFE8F0FE),
            borderRadius: BorderRadius.circular(8),
            border: Border.all(
              color: showError ? Colors.red : Colors.transparent,
              width: 1.5,
            ),
          ),
          child: TextField(
            controller: _passwordController,
            obscureText: _obscurePassword,
            onChanged: (_) {
              if (_attemptedSubmit) setState(() {});
            },
            decoration: InputDecoration(
              hintText: 'Enter password',
              hintStyle: const TextStyle(color: Colors.grey),
              border: InputBorder.none,
              contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
              suffixIcon: IconButton(
                icon: Icon(
                  _obscurePassword ? Icons.visibility_off : Icons.visibility,
                  color: Colors.grey,
                ),
                onPressed: () {
                  setState(() {
                    _obscurePassword = !_obscurePassword;
                  });
                },
              ),
            ),
          ),
        ),
        if (showError)
          const Padding(
            padding: EdgeInsets.only(top: 6),
            child: Text(
              'Required',
              style: TextStyle(color: Colors.red, fontSize: 12),
            ),
          ),
      ],
    );
  }

  Widget _buildLoginButton() {
    return SizedBox(
      width: double.infinity,
      child: ElevatedButton(
        onPressed: _isLoading
            ? null
            : () {
                setState(() {
                  _attemptedSubmit = true;
                  _attemptedTermsOnly = false;
                });
                if (_emailController.text.trim().isEmpty ||
                    _passwordController.text.isEmpty ||
                    !_acceptedTerms) {
                  return;
                }
                if (_isRegistering) {
                  _register();
                } else {
                  _login();
                }
              },
        style: ElevatedButton.styleFrom(
          backgroundColor: Colors.blue,
          padding: const EdgeInsets.symmetric(vertical: 16),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(8),
          ),
        ),
        child: _isLoading
            ? const SizedBox(
                height: 20,
                width: 20,
                child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
              )
            : Text(
                _isRegistering ? 'Register' : 'Log in',
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                ),
              ),
      ),
    );
  }

}
