import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../auth/auth_bloc/auth_bloc_bloc.dart';
import '../../../auth/auth_bloc/auth_bloc_provider.dart';
import '../../../auth/auth_bloc/auth_bloc_event.dart';
import '../../../auth/auth_bloc/auth_bloc_state.dart';
import '../../../../core/services/auth_service.dart';
import '../../../../core/services/otp_verification_service.dart';
import '../../../../core/services/change_password_service.dart';
import '../../../../core/services/email_verification_service.dart';
import '../../../../core/services/change_email_service.dart';
import '../../../../core/themes/validation_theme.dart';
import 'email_success.dart';

class EmailVerificationScreen extends StatefulWidget {
  final String newEmail;

  const EmailVerificationScreen({
    super.key,
    required this.newEmail,
  });

  @override
  State<EmailVerificationScreen> createState() => _EmailVerificationScreenState();
}

class _EmailVerificationScreenState extends State<EmailVerificationScreen> {
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
  bool _hasNavigated = false;
  bool _otpVerified = false;

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
    return _otpControllers.map((controller) => controller.text.trim()).join();
  }

  Future<void> _verifyOTP(BuildContext blocContext) async {
    final otpCode = _getOTPCode();
    
    // Validate OTP format
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
        _errorMessage = 'Please enter the complete 6-digit code';
      });
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final authBloc = BlocProvider.of<AuthBlocBloc>(blocContext, listen: false);
      
      // First verify OTP
      authBloc.add(VerifyOTPForNewEmailEvent(
        newEmail: widget.newEmail,
        otpCode: otpCode,
      ));
    } catch (e) {
      setState(() {
        _isLoading = false;
        _errorMessage = 'Failed to verify OTP. Please try again.';
      });
    }
  }

  Future<void> _resendOTP(BuildContext blocContext) async {
    if (!_canResend) return;

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final authBloc = BlocProvider.of<AuthBlocBloc>(blocContext, listen: false);
      authBloc.add(SendOTPToNewEmailEvent(newEmail: widget.newEmail));
      _startResendTimer();
      setState(() {
        _isLoading = false;
      });
      ScaffoldMessenger.of(blocContext).showSnackBar(
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

    return BlocProvider(
      create: (context) => AuthBlocBloc(
        provider: AuthBlocProvider(
          authService: AuthService(),
          otpVerificationService: OTPVerificationService(),
          changePasswordService: ChangePasswordService(),
          emailVerificationService: EmailVerificationService(),
          changeEmailService: ChangeEmailService(),
        ),
      ),
      child: BlocConsumer<AuthBlocBloc, AuthBlocState>(
        listener: (context, state) {
          if (state.error != null) {
            setState(() {
              _isLoading = false;
              _errorMessage = state.error.toString().replaceAll('Exception: ', '');
            });
            return;
          }
          
          // If OTP verification succeeded (not loading, no error, and we haven't verified yet)
          if (!state.isLoading && !_otpVerified && _isLoading) {
            // OTP verification completed successfully
            setState(() {
              _otpVerified = true;
              _isLoading = true; // Keep loading while updating email
            });
            // Now update email
            final authBloc = BlocProvider.of<AuthBlocBloc>(context, listen: false);
            authBloc.add(UpdateEmailEvent(newEmail: widget.newEmail));
            return;
          }
          
          // Navigate to success screen after email update completes
          if (!state.isLoading && state.error == null && _otpVerified && !_hasNavigated) {
            _hasNavigated = true;
            WidgetsBinding.instance.addPostFrameCallback((_) {
              if (mounted) {
                Navigator.of(context).pushReplacement(
                  MaterialPageRoute(
                    builder: (context) => EmailSuccessScreen(newEmail: widget.newEmail),
                  ),
                );
              }
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
                    // Header with back button and title
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
                                'Change Email',
                                style: TextStyle(
                                  fontSize: 24,
                                  fontWeight: FontWeight.bold,
                                  color: ValidationTheme.textLight,
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(width: 48),
                        ],
                      ),
                    ),
                    
                    // Main content
                    Expanded(
                      child: SingleChildScrollView(
                        padding: const EdgeInsets.symmetric(horizontal: 24),
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          crossAxisAlignment: CrossAxisAlignment.center,
                          children: [
                            const SizedBox(height: 40),
                            
                            // Email Verification heading
                            const Text(
                              'Email Verification',
                              style: TextStyle(
                                fontSize: 24,
                                fontWeight: FontWeight.bold,
                                color: ValidationTheme.textDark,
                              ),
                              textAlign: TextAlign.center,
                            ),
                            const SizedBox(height: 12),
                            
                            // Subtitle
                            const Text(
                              'Enter OTP Code we sent to your email',
                              textAlign: TextAlign.center,
                              style: TextStyle(
                                fontSize: 16,
                                color: ValidationTheme.textSecondary,
                              ),
                            ),
                            const SizedBox(height: 8),
                            
                            // Email address
                            Text(
                              widget.newEmail,
                              textAlign: TextAlign.center,
                              style: const TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.bold,
                                color: ValidationTheme.textDark,
                              ),
                            ),
                            const SizedBox(height: 40),
                            
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
                            const SizedBox(height: 32),
                            
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
                                onPressed: _isLoading ? null : () => _verifyOTP(context),
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
                                    onTap: _canResend && !_isLoading ? () => _resendOTP(context) : null,
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
                            const SizedBox(height: 40),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}
