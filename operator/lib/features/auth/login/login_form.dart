import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_auth/firebase_auth.dart';
import '../../../shared/nav_bar.dart';
import '../../../core/services/backend_api_service.dart';
import '../../../core/services/operator_session_service.dart';

const String _operatorSigninPath = '/api/users/auth/signin';

/// Sign-in failed but [createUserWithEmailAndPassword] returned [email-already-in-use]:
/// a Firebase Auth user already exists for this email with a different password.
class _FirebasePasswordConflict implements Exception {
  const _FirebasePasswordConflict(this.message);
  final String message;
  @override
  String toString() => message;
}

bool _isOperatorRoleFromUserMap(Map<String, dynamic>? userMap) {
  if (userMap == null) return false;
  final role = userMap['role']?.toString().trim().toLowerCase();
  final roleIdValue = userMap['roleid'] ?? userMap['role_id'];
  final roleId = roleIdValue is num ? roleIdValue.toInt() : int.tryParse('${roleIdValue ?? ''}');
  return role == 'operator' || roleId == 2;
}

Map<String, dynamic>? _userMapFromSigninPayload(Map<String, dynamic>? backendPayload) {
  final userData = backendPayload?['data'];
  if (userData is! Map) return null;
  final m = Map<String, dynamic>.from(userData);
  final inner = m['user'];
  if (inner is Map) {
    return Map<String, dynamic>.from(inner);
  }
  return m;
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
  bool _acceptedTerms = false;
  bool _attemptedSubmit = false;
  bool _attemptedTermsOnly = false;
  final BackendApiService _backendApi = BackendApiService();

  static const String _termsText =
      'Effective Date: April 28, 2026\n\n'
      'These Terms apply to all drivers using the PasaHero platform.\n\n'
      '1. Acceptance of Terms\n\n'
      'By using the operator app, you agree to comply with these Terms.\n\n'
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

  /// Firebase Email/Password for Firestore rules only — same password Mongo already accepted.
  ///
  /// Firebase often returns [invalid-credential] when **no** Auth user exists (not only wrong
  /// password). We then try [createUserWithEmailAndPassword]; only if that returns
  /// [email-already-in-use] do we know an account exists and the password truly conflicts.
  Future<void> _establishFirebaseAuthForFirestore({
    required String emailForFirebase,
    required String password,
  }) async {
    await FirebaseAuth.instance.signOut();
    try {
      await FirebaseAuth.instance.signInWithEmailAndPassword(
        email: emailForFirebase,
        password: password,
      );
      return;
    } on FirebaseAuthException catch (signInErr) {
      final tryShadowCreate = signInErr.code == 'user-not-found' ||
          signInErr.code == 'invalid-credential' ||
          signInErr.code == 'wrong-password';

      if (!tryShadowCreate) {
        rethrow;
      }

      try {
        await FirebaseAuth.instance.createUserWithEmailAndPassword(
          email: emailForFirebase,
          password: password,
        );
        return;
      } on FirebaseAuthException catch (createErr) {
        if (createErr.code == 'email-already-in-use') {
          throw const _FirebasePasswordConflict(
            'A Firebase Auth user already exists for this email, and the password does not match '
            'what you use in Mongo. Ask an admin to delete that user in Firebase Console '
            '(Authentication → Users) or reset its password to match your operator password.',
          );
        }
        rethrow;
      }
    }
  }

  String _firebaseAuthSetupMessage(FirebaseAuthException e) {
    switch (e.code) {
      case 'wrong-password':
      case 'invalid-credential':
        return 'Firebase could not sign you in (${e.code}). '
            'If Email/Password is enabled, try again; otherwise ask an admin to check Firebase Auth.';
      case 'invalid-email':
        return 'Invalid email for Firebase Auth.';
      case 'user-disabled':
        return 'This Firebase account is disabled. Contact support.';
      case 'operation-not-allowed':
        return 'Enable Email/Password in Firebase Console → Authentication → Sign-in method.';
      case 'weak-password':
        return 'Password is accepted by the server but too weak for Firebase. '
            'Use a stronger password (Firebase requires more complexity), or ask an admin.';
      case 'too-many-requests':
        return 'Too many attempts. Try again in a few minutes.';
      default:
        return 'Could not open a Firebase session (${e.code}). ${e.message ?? ''}';
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
              throw Exception('This account is not an operator. Use the correct app or contact support.');
            }
            final token = backendPayload?['token']?.toString().trim();
            if (token == null || token.isEmpty) {
              throw Exception('Login failed: server did not return a session token.');
            }
            if (userMap == null) {
              throw Exception('Login failed: invalid user payload from server.');
            }

            await OperatorSessionService.instance.saveSession(
              jwt: token,
              userMap: userMap,
            );

            // Firestore needs Firebase Auth: same email/password as Mongo (sign-in or shadow create).
            try {
              await _establishFirebaseAuthForFirestore(
                emailForFirebase: emailCandidate,
                password: password,
              );
            } on _FirebasePasswordConflict catch (e) {
              await OperatorSessionService.instance.clear();
              if (!mounted) return;
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text(e.message),
                  backgroundColor: Colors.red,
                  duration: const Duration(seconds: 14),
                ),
              );
              return;
            } on FirebaseAuthException catch (e) {
              await OperatorSessionService.instance.clear();
              if (!mounted) return;
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text(_firebaseAuthSetupMessage(e)),
                  backgroundColor: Colors.red,
                  duration: const Duration(seconds: 12),
                ),
              );
              return;
            } catch (e) {
              await OperatorSessionService.instance.clear();
              if (!mounted) return;
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text('Firebase setup failed: $e'),
                  backgroundColor: Colors.red,
                  duration: const Duration(seconds: 8),
                ),
              );
              return;
            }

            final fbUser = FirebaseAuth.instance.currentUser;
            if (fbUser == null) {
              await OperatorSessionService.instance.clear();
              if (!mounted) return;
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('Login incomplete: no Firebase session. Try again.'),
                  backgroundColor: Colors.red,
                ),
              );
              return;
            }

            try {
              await OperatorSessionService.instance.mergeMongoProfileIntoFirestoreUsersCollection();
            } catch (firestoreError) {
              if (mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text(
                      'Logged in, but profile sync had an issue: $firestoreError',
                    ),
                    backgroundColor: Colors.orange,
                    duration: const Duration(seconds: 5),
                  ),
                );
              }
            }

            if (mounted) {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('Logged in successfully'),
                  backgroundColor: Colors.green,
                ),
              );
              Navigator.of(context).pushReplacementNamed(NavBar.routeName);
            }
            return;
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

      throw Exception('No account found for this email.');
    } on FirebaseAuthException catch (e) {
      if (mounted) {
        String msg = e.message ?? 'Login failed';
        if (e.code == 'user-not-found') {
          msg = 'No account found for this email. Ask your administrator to create an operator account.';
        } else if (e.code == 'invalid-credential' || e.code == 'wrong-password') {
          msg = 'Invalid email or password.';
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
        final msg = e is Exception
            ? e.toString().replaceFirst('Exception: ', '')
            : e.toString();
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(msg.isEmpty ? 'Login failed.' : msg),
            backgroundColor: Colors.red,
            duration: const Duration(seconds: 6),
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
              const Text(
                'Sign in with the account your administrator created for you.',
                textAlign: TextAlign.center,
                style: TextStyle(
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
              _buildLoginButton(),
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
                _login();
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
            : const Text(
                'Log in',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                ),
              ),
      ),
    );
  }

}
