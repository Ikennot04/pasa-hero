import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../auth_bloc/auth_bloc_bloc.dart';
import '../auth_bloc/auth_bloc_provider.dart';
import '../auth_bloc/auth_bloc_event.dart';
import '../auth_bloc/auth_bloc_state.dart';
import '../../../core/services/auth_service.dart';
import '../../../core/services/otp_verification_service.dart';
import '../../../core/services/change_password_service.dart';
import '../../../core/services/email_verification_service.dart';
import '../../../core/themes/validation_theme.dart';
import '../../near_me/Screen/nearme_screen.dart';
import 'otp_success_screen.dart';

class OTPScreen extends StatefulWidget {
  final String email;
  final String? password;
  final String? firstName;
  final String? lastName;
  final bool isRegistration;
  final bool isGoogleSignUp;
  final String? googleDisplayName;

  const OTPScreen({
    super.key,
    required this.email,
    this.password,
    this.firstName,
    this.lastName,
    required this.isRegistration,
    this.isGoogleSignUp = false,
    this.googleDisplayName,
  });

  @override
  State<OTPScreen> createState() => _OTPScreenState();
}

class _OTPScreenState extends State<OTPScreen> {
  final List<TextEditingController> _otpControllers = List.generate(
    6,
    (index) => TextEditingController(),
  );
  final List<FocusNode> _focusNodes = List.generate(
    6,
    (index) => FocusNode(),
  );
  bool _isLoading = false;
  String? _errorMessage;
  int _resendTimer = 60;
  bool _canResend = false;
  AuthBlocBloc? _authBloc; // Store bloc reference
  bool _hasNavigated = false; // Flag to prevent multiple navigations

  @override
  void initState() {
    super.initState();
    _startResendTimer();
    // Auto-focus first field
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _focusNodes[0].requestFocus();
    });
  }

  @override
  void dispose() {
    for (var controller in _otpControllers) {
      controller.dispose();
    }
    for (var node in _focusNodes) {
      node.dispose();
    }
    super.dispose();
  }

  void _startResendTimer() {
    _canResend = false;
    _resendTimer = 60;
    Future.doWhile(() async {
      await Future.delayed(const Duration(seconds: 1));
      if (mounted) {
        setState(() {
          _resendTimer--;
          if (_resendTimer <= 0) {
            _canResend = true;
          }
        });
        return _resendTimer > 0;
      }
      return false;
    });
  }

  void _handleOTPChange(int index, String value) {
    // Only allow numeric input
    if (value.isNotEmpty && !RegExp(r'^[0-9]$').hasMatch(value)) {
      _otpControllers[index].clear();
      return;
    }
    
    if (value.length == 1 && index < 5) {
      _focusNodes[index + 1].requestFocus();
    } else if (value.isEmpty && index > 0) {
      _focusNodes[index - 1].requestFocus();
    }
    setState(() {
      _errorMessage = null;
    });
  }

  String _getOTPCode() {
    final code = _otpControllers.map((controller) => controller.text.trim()).join();
    print('📝 OTP Input Debug:');
    print('   Individual fields: ${_otpControllers.map((c) => '"${c.text}"').toList()}');
    print('   Combined code: "$code"');
    print('   Code length: ${code.length}');
    return code;
  }

  Future<void> _verifyOTP() async {
    final otpCode = _getOTPCode();
    
    // Validate OTP format before sending
    if (otpCode.isEmpty) {
      setState(() {
        _errorMessage = 'Please enter the OTP code';
      });
      return;
    }
    
    if (!RegExp(r'^\d+$').hasMatch(otpCode)) {
      setState(() {
        _errorMessage = 'OTP code must contain only numbers';
      });
      return;
    }
    
    if (otpCode.length != 6) {
      setState(() {
        _errorMessage = 'Please enter the complete 6-digit code (entered: ${otpCode.length} digits)';
      });
      return;
    }

    print('🔐 Starting OTP Verification:');
    print('   Email: ${widget.email}');
    print('   OTP Code: $otpCode');
    print('   Is Registration: ${widget.isRegistration}');
    print('   Is Google Sign Up: ${widget.isGoogleSignUp}');

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      // Use stored bloc reference or try to get from context
      AuthBlocBloc authBloc;
      if (_authBloc != null) {
        authBloc = _authBloc!;
      } else {
        try {
          authBloc = BlocProvider.of<AuthBlocBloc>(context, listen: false);
        } catch (e) {
          throw Exception('AuthBlocBloc is not available. Please restart the app.');
        }
      }
      
      if (widget.isGoogleSignUp) {
        // For Google sign-up: verify OTP then complete Google sign-up
        print('   📤 Dispatching VerifyOTPAndGoogleSignUpEvent');
        authBloc.add(VerifyOTPAndGoogleSignUpEvent(
          email: widget.email,
          displayName: widget.googleDisplayName ?? '',
          otpCode: otpCode,
        ));
      } else if (widget.isRegistration) {
        // For registration: verify OTP then create account
        print('   📤 Dispatching VerifyOTPAndRegisterEvent');
        authBloc.add(VerifyOTPAndRegisterEvent(
          email: widget.email,
          password: widget.password!,
          firstName: widget.firstName!,
          lastName: widget.lastName!,
          otpCode: otpCode,
        ));
      } else {
        // For login: verify OTP then login
        print('   📤 Dispatching VerifyOTPAndLoginEvent');
        authBloc.add(VerifyOTPAndLoginEvent(
          email: widget.email,
          password: widget.password!,
          otpCode: otpCode,
        ));
      }
    } catch (e) {
      print('   ❌ Error dispatching OTP verification event: $e');
      setState(() {
        _isLoading = false;
        _errorMessage = 'Failed to verify OTP. Please try again. Error: ${e.toString()}';
      });
    }
  }

  Future<void> _resendOTP() async {
    if (!_canResend) return;

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      // Use stored bloc reference or try to get from context
      AuthBlocBloc authBloc;
      if (_authBloc != null) {
        authBloc = _authBloc!;
      } else {
        try {
          authBloc = BlocProvider.of<AuthBlocBloc>(context, listen: false);
        } catch (e) {
          throw Exception('AuthBlocBloc is not available. Please restart the app.');
        }
      }
      
      authBloc.add(SendOTPEvent(email: widget.email));
      _startResendTimer();
      setState(() {
        _isLoading = false;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('OTP code has been resent to your email'),
          backgroundColor: Colors.green,
        ),
      );
    } catch (e) {
      setState(() {
        _isLoading = false;
        _errorMessage = 'Failed to resend OTP. Please try again.';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final screenWidth = MediaQuery.of(context).size.width;
    final isSmallScreen = screenWidth < 600;

    // Get the bloc from context (should be provided by parent via BlocProvider.value)
    // This ensures we use the SAME bloc instance that dispatched the event
    AuthBlocBloc authBloc;
    try {
      authBloc = BlocProvider.of<AuthBlocBloc>(context, listen: false);
      print('🔗 OTP Screen: Found bloc in context: ${authBloc.hashCode}');
    } catch (e) {
      print('❌ OTP Screen: Bloc not found in context: $e');
      print('❌ Creating new bloc (this should not happen if navigation is correct)');
      // Fallback: create new bloc (shouldn't happen)
      authBloc = AuthBlocBloc(
        provider: AuthBlocProvider(
          authService: AuthService(),
          otpVerificationService: OTPVerificationService(),
          changePasswordService: ChangePasswordService(),
          emailVerificationService: EmailVerificationService(),
        ),
      );
      print('⚠️ OTP Screen: Created NEW bloc instance: ${authBloc.hashCode}');
      print('⚠️ WARNING: This may cause listener to not receive state updates!');
    }
    
    // Store bloc reference for use in methods
    _authBloc = authBloc;
    print('🔗 OTP Screen: Using bloc instance: ${authBloc.hashCode}');
    
    return BlocConsumer<AuthBlocBloc, AuthBlocState>(
      bloc: authBloc, // Explicitly set the bloc to ensure we're listening to the right one
      listener: (context, state) {
          // Debug logging for state changes
          print('📊 OTP Screen: State changed (bloc: ${authBloc.hashCode})');
          print('   isAuthenticated: ${state.isAuthenticated}');
          print('   user: ${state.user?.email ?? "null"}');
          print('   isLoading: ${state.isLoading}');
          print('   error: ${state.error ?? "null"}');
          print('   _hasNavigated: $_hasNavigated');
          
          // Check if user is authenticated and navigation hasn't happened yet
          if (state.isAuthenticated && state.user != null && !state.isLoading && !_hasNavigated) {
            print('✅ OTP Screen: User authenticated, navigating to success screen');
            _hasNavigated = true; // Set flag to prevent multiple navigations
            
            // Navigate immediately to success screen, clearing the navigation stack
            // This prevents AuthWrapper from interfering
            Future.microtask(() {
              if (mounted && _hasNavigated) {
                print('   📱 Navigating to OTPSuccessScreen');
                Navigator.of(context).pushAndRemoveUntil(
                  MaterialPageRoute(
                    builder: (context) => OTPSuccessScreen(
                      email: widget.email,
                      onContinue: () {
                        print('   📱 Continue button pressed, navigating to NearMeScreen');
                        Navigator.of(context).pushAndRemoveUntil(
                          MaterialPageRoute(
                            builder: (context) => const NearMeScreen(),
                          ),
                          (route) => false,
                        );
                      },
                    ),
                  ),
                  (route) => route.isFirst, // Keep only the first route (home)
                );
              } else {
                print('   ⚠️ Navigation skipped: mounted=$mounted, _hasNavigated=$_hasNavigated');
              }
            });
          } else if (state.isAuthenticated && state.user != null && !state.isLoading && _hasNavigated) {
            print('   ⚠️ Already navigated, skipping navigation');
          }
          
          if (state.error != null) {
            print('❌ OTP Screen: Error received: ${state.error}');
            setState(() {
              _isLoading = false;
              _errorMessage = state.error.toString().replaceAll('Exception: ', '');
            });
          }
        },
        builder: (context, state) {
          return Scaffold(
            backgroundColor: Colors.transparent,
            body: Container(
              width: double.infinity,
              height: double.infinity,
              decoration: ValidationTheme.gradientDecoration,
              child: SafeArea(
                child: Column(
                  children: [
                    // App Bar with back button and centered title
                    Padding(
                      padding: const EdgeInsets.all(16.0),
                      child: Row(
                        children: [
                          Container(
                            decoration: BoxDecoration(
                              color: ValidationTheme.backgroundWhite,
                              shape: BoxShape.circle,
                              boxShadow: [
                                BoxShadow(
                                  color: Colors.black.withOpacity(0.1),
                                  blurRadius: 4,
                                  offset: const Offset(0, 2),
                                ),
                              ],
                            ),
                            child: IconButton(
                              icon: const Icon(Icons.arrow_back, color: ValidationTheme.textDark),
                              onPressed: () => Navigator.of(context).pop(),
                            ),
                          ),
                          const Expanded(
                            child: Center(
                              child: Text(
                                'Verification',
                                style: TextStyle(
                                  fontSize: 24,
                                  fontWeight: FontWeight.bold,
                                  color: ValidationTheme.textLight,
                                ),
                              ),
                            ),
                          ),
                          // Spacer to balance the back button
                          SizedBox(width: 48),
                        ],
                      ),
                    ),
                    const SizedBox(height: 40),
                    // Main content
                    Expanded(
                      child: SingleChildScrollView(
                        padding: const EdgeInsets.symmetric(horizontal: 24),
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          crossAxisAlignment: CrossAxisAlignment.center,
                          children: [
                            const SizedBox(height: 120),
                            // Email Verification heading
                            const Text(
                              'Email Verification',
                              style: TextStyle(
                                fontSize: 20,
                                fontWeight: FontWeight.bold,
                                color: ValidationTheme.textDark,
                              ),
                            ),
                            const SizedBox(height: 12),
                            // Subtitle
                            Text(
                              'Enter OTP Code we sent to your email',
                              textAlign: TextAlign.center,
                              style: TextStyle(
                                fontSize: 14,
                                color: ValidationTheme.textSecondary,
                              ),
                            ),
                            const SizedBox(height: 8),
                            // Email address
                            Text(
                              widget.email,
                              textAlign: TextAlign.center,
                              style: const TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.bold,
                                color: ValidationTheme.textDark,
                              ),
                            ),
                            const SizedBox(height: 32),
                            // OTP Input Fields
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                              children: List.generate(
                                6,
                                (index) => SizedBox(
                                  width: isSmallScreen ? 50 : 55,
                                  height: isSmallScreen ? 70 : 80,
                                  child: TextField(
                                    controller: _otpControllers[index],
                                    focusNode: _focusNodes[index],
                                    textAlign: TextAlign.center,
                                    keyboardType: TextInputType.number,
                                    maxLength: 1,
                                    inputFormatters: [
                                      FilteringTextInputFormatter.digitsOnly,
                                    ],
                                    style: const TextStyle(
                                      fontSize: 28,
                                      fontWeight: FontWeight.bold,
                                      letterSpacing: 0,
                                    ),
                                    decoration: InputDecoration(
                                      counterText: '',
                                      contentPadding: EdgeInsets.zero,
                                      border: OutlineInputBorder(
                                        borderRadius: BorderRadius.circular(12),
                                        borderSide: const BorderSide(
                                          color: ValidationTheme.borderLight,
                                          width: 1.5,
                                        ),
                                      ),
                                      enabledBorder: OutlineInputBorder(
                                        borderRadius: BorderRadius.circular(12),
                                        borderSide: const BorderSide(
                                          color: ValidationTheme.borderLight,
                                          width: 1.5,
                                        ),
                                      ),
                                      focusedBorder: OutlineInputBorder(
                                        borderRadius: BorderRadius.circular(12),
                                        borderSide: const BorderSide(
                                          color: ValidationTheme.primaryBlue,
                                          width: 2,
                                        ),
                                      ),
                                      filled: true,
                                      fillColor: ValidationTheme.backgroundWhite,
                                    ),
                                    onChanged: (value) => _handleOTPChange(index, value),
                                  ),
                                ),
                              ),
                            ),
                            const SizedBox(height: 24),
                            // Error Message
                            if (_errorMessage != null)
                              Container(
                                padding: const EdgeInsets.all(12),
                                margin: const EdgeInsets.only(bottom: 16),
                                decoration: BoxDecoration(
                                  color: ValidationTheme.errorLight,
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: Row(
                                  children: [
                                    const Icon(Icons.error_outline, color: ValidationTheme.errorRed, size: 20),
                                    const SizedBox(width: 8),
                                    Expanded(
                                      child: Text(
                                        _errorMessage!,
                                        style: const TextStyle(
                                          color: ValidationTheme.errorRed,
                                          fontSize: 14,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            // Submit Button
                            SizedBox(
                              width: double.infinity,
                              height: 56,
                              child: ElevatedButton(
                                onPressed: _isLoading ? null : _verifyOTP,
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: ValidationTheme.primaryBlue,
                                  foregroundColor: ValidationTheme.textLight,
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  elevation: 0,
                                ),
                                child: _isLoading
                                    ? const SizedBox(
                                        width: 20,
                                        height: 20,
                                        child: CircularProgressIndicator(
                                          strokeWidth: 2,
                                          valueColor: AlwaysStoppedAnimation<Color>(ValidationTheme.textLight),
                                        ),
                                      )
                                    : const Text(
                                        'Submit',
                                        style: TextStyle(
                                          fontSize: 16,
                                          fontWeight: FontWeight.w600,
                                        ),
                                      ),
                              ),
                            ),
                            const SizedBox(height: 24),
                            // Resend OTP
                            Center(
                              child: Wrap(
                                children: [
                                  Text(
                                    'Don\'t receive code? ',
                                    style: TextStyle(
                                      fontSize: 14,
                                      color: ValidationTheme.textSecondary,
                                    ),
                                  ),
                                  GestureDetector(
                                    onTap: _canResend && !_isLoading ? _resendOTP : null,
                                    child: Text(
                                      _canResend ? 'Resend' : 'Resend in ${_resendTimer}s',
                                      style: TextStyle(
                                        fontSize: 14,
                                        fontWeight: FontWeight.w600,
                                        color: _canResend && !_isLoading
                                            ? ValidationTheme.primaryBlue
                                            : ValidationTheme.textSecondary,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 40),
                  ],
                ),
              ),
            ),
          );
        },
    );
  }
}
