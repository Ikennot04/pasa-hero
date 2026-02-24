import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../auth_bloc/auth_bloc_bloc.dart';
import '../auth_bloc/auth_bloc_provider.dart';
import '../auth_bloc/auth_bloc_event.dart';
import '../../../core/services/auth_service.dart';
import '../../../core/services/otp_verification_service.dart';
import '../../../core/services/change_password_service.dart';
import '../../../core/services/email_verification_service.dart';
import '../../../core/services/change_email_service.dart';
import '../../../core/themes/validation_theme.dart';
import 'forgot_password_reset.dart';

class ForgotPasswordOTPScreen extends StatefulWidget {
  final String email;

  const ForgotPasswordOTPScreen({
    super.key,
    required this.email,
  });

  @override
  State<ForgotPasswordOTPScreen> createState() => _ForgotPasswordOTPScreenState();
}

class _ForgotPasswordOTPScreenState extends State<ForgotPasswordOTPScreen> {
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
  AuthBlocBloc? _authBloc;
  bool _hasNavigated = false;

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

    // Auto-submit when all fields are filled
    if (index == 5 && value.isNotEmpty) {
      final allFilled = _otpControllers.every((controller) => controller.text.isNotEmpty);
      if (allFilled) {
        _verifyOTP();
      }
    }
  }

  void _resendOTP() async {
    if (!_canResend || _isLoading) return;

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      AuthBlocBloc authBloc;
      if (_authBloc != null) {
        authBloc = _authBloc!;
      } else {
        authBloc = BlocProvider.of<AuthBlocBloc>(context, listen: false);
      }

      // Send new OTP
      authBloc.add(SendOTPEvent(email: widget.email));
      
      // Wait for the event to complete
      await Future.delayed(const Duration(milliseconds: 500));
      
      _startResendTimer();
      setState(() {
        _isLoading = false;
      });

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('New OTP code sent to ${widget.email}'),
            backgroundColor: ValidationTheme.successGreen,
            duration: const Duration(seconds: 2),
          ),
        );
      }
    } catch (e) {
      setState(() {
        _isLoading = false;
        _errorMessage = 'Failed to resend OTP. Please try again.';
      });
    }
  }

  void _verifyOTP() async {
    // Collect OTP code
    final otpCode = _otpControllers.map((controller) => controller.text).join();
    
    // Validate OTP
    if (otpCode.length != 6) {
      setState(() {
        _errorMessage = 'Please enter the complete 6-digit OTP code.';
      });
      return;
    }

    if (!RegExp(r'^\d{6}$').hasMatch(otpCode)) {
      setState(() {
        _errorMessage = 'OTP code must contain only digits.';
      });
      return;
    }

    if (_hasNavigated) {
      return; // Prevent multiple navigations
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      // Get OTP verification service
      final otpService = OTPVerificationService();
      
      // Verify OTP
      await otpService.verifyOTP(
        email: widget.email,
        otpCode: otpCode,
      );

      // OTP verified successfully - navigate to password reset screen
      if (mounted && !_hasNavigated) {
        _hasNavigated = true;
        Future.microtask(() {
          if (mounted) {
            Navigator.of(context).pushReplacement(
              MaterialPageRoute(
                builder: (context) => BlocProvider.value(
                  value: _authBloc!,
                  child: ForgotPasswordResetScreen(
                    email: widget.email,
                  ),
                ),
              ),
            );
          }
        });
      }
    } catch (e) {
      setState(() {
        _isLoading = false;
        _errorMessage = e.toString().replaceAll('Exception: ', '');
      });
      _hasNavigated = false; // Allow retry on error
    }
  }

  @override
  Widget build(BuildContext context) {
    final screenHeight = MediaQuery.of(context).size.height;
    final screenWidth = MediaQuery.of(context).size.width;
    final isSmallScreen = screenHeight < 700;
    final isMediumScreen = screenHeight >= 700 && screenHeight < 900;

    // Responsive sizing
    final titleFontSize = isSmallScreen ? 24.0 : isMediumScreen ? 26.0 : 28.0;
    final headingFontSize = isSmallScreen ? 20.0 : isMediumScreen ? 22.0 : 24.0;
    final bodyFontSize = isSmallScreen ? 14.0 : isMediumScreen ? 15.0 : 16.0;
    final emailFontSize = isSmallScreen ? 15.0 : isMediumScreen ? 16.0 : 17.0;
    final buttonFontSize = isSmallScreen ? 17.0 : isMediumScreen ? 18.0 : 19.0;
    final buttonHeight = isSmallScreen ? 50.0 : isMediumScreen ? 54.0 : 58.0;
    final verticalPadding = isSmallScreen ? 10.0 : isMediumScreen ? 14.0 : 18.0;
    final baseSpacing = isSmallScreen ? 5.0 : isMediumScreen ? 7.0 : 9.0;
    final titleSpacing = isSmallScreen ? 6.0 : isMediumScreen ? 10.0 : 14.0;
    final fieldSpacing = isSmallScreen ? 10.0 : isMediumScreen ? 12.0 : 14.0;

    // Get or create bloc reference
    try {
      _authBloc = BlocProvider.of<AuthBlocBloc>(context);
    } catch (e) {
      // If bloc is not available, create a new one
      _authBloc = AuthBlocBloc(
        provider: AuthBlocProvider(
          authService: AuthService(),
          otpVerificationService: OTPVerificationService(),
          changePasswordService: ChangePasswordService(),
          emailVerificationService: EmailVerificationService(),
          changeEmailService: ChangeEmailService(),
        ),
      );
    }

    return BlocProvider.value(
      value: _authBloc!,
      child: Scaffold(
        body: Container(
          width: double.infinity,
          height: double.infinity,
          decoration: ValidationTheme.gradientDecoration,
          child: SafeArea(
            child: SingleChildScrollView(
              child: Column(
                children: [
                  // Header with back button and title
                  Container(
                    padding: EdgeInsets.symmetric(
                      horizontal: screenWidth * 0.05,
                      vertical: verticalPadding,
                    ),
                    child: Stack(
                      children: [
                        // Back button
                        Align(
                          alignment: Alignment.centerLeft,
                          child: IconButton(
                            onPressed: () => Navigator.of(context).pop(),
                            icon: Container(
                              width: 40,
                              height: 40,
                              decoration: BoxDecoration(
                                color: Colors.white,
                                shape: BoxShape.circle,
                                boxShadow: [
                                  BoxShadow(
                                    color: Colors.black.withOpacity(0.1),
                                    blurRadius: 4,
                                    offset: const Offset(0, 2),
                                  ),
                                ],
                              ),
                              child: const Icon(
                                Icons.arrow_back,
                                color: ValidationTheme.textPrimary,
                                size: 20,
                              ),
                            ),
                          ),
                        ),
                        // Title
                        Center(
                          child: Text(
                            'Forgot Password',
                            style: TextStyle(
                              fontSize: titleFontSize,
                              fontWeight: FontWeight.w600,
                              color: ValidationTheme.textPrimary,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  // Main content
                  Container(
                    width: double.infinity,
                    padding: EdgeInsets.symmetric(
                      horizontal: screenWidth * 0.08,
                      vertical: verticalPadding * 2,
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Heading
                        Text(
                          'Email Verification',
                          style: TextStyle(
                            fontSize: headingFontSize,
                            fontWeight: FontWeight.w700,
                            color: ValidationTheme.textPrimary,
                          ),
                        ),
                        SizedBox(height: titleSpacing),
                        // Instructional text
                        Text(
                          'Enter OTP Code we sent to your email',
                          style: TextStyle(
                            fontSize: bodyFontSize,
                            color: ValidationTheme.textSecondary,
                            height: 1.5,
                          ),
                        ),
                        SizedBox(height: baseSpacing),
                        // Email address
                        Text(
                          widget.email,
                          style: TextStyle(
                            fontSize: emailFontSize,
                            fontWeight: FontWeight.w700,
                            color: ValidationTheme.textPrimary,
                          ),
                        ),
                        SizedBox(height: fieldSpacing * 2),
                        // OTP input fields
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: List.generate(6, (index) {
                            return SizedBox(
                              width: (screenWidth * 0.84 - 60) / 6,
                              child: TextField(
                                controller: _otpControllers[index],
                                focusNode: _focusNodes[index],
                                textAlign: TextAlign.center,
                                keyboardType: TextInputType.number,
                                inputFormatters: [
                                  FilteringTextInputFormatter.digitsOnly,
                                  LengthLimitingTextInputFormatter(1),
                                ],
                                style: TextStyle(
                                  fontSize: 24,
                                  fontWeight: FontWeight.w600,
                                  color: ValidationTheme.textPrimary,
                                ),
                                decoration: InputDecoration(
                                  filled: true,
                                  fillColor: Colors.white,
                                  contentPadding: EdgeInsets.symmetric(
                                    vertical: isSmallScreen ? 16 : isMediumScreen ? 18 : 20,
                                  ),
                                  border: OutlineInputBorder(
                                    borderRadius: BorderRadius.circular(12),
                                    borderSide: BorderSide(
                                      color: ValidationTheme.borderLight,
                                      width: 1,
                                    ),
                                  ),
                                  enabledBorder: OutlineInputBorder(
                                    borderRadius: BorderRadius.circular(12),
                                    borderSide: BorderSide(
                                      color: ValidationTheme.borderLight,
                                      width: 1,
                                    ),
                                  ),
                                  focusedBorder: OutlineInputBorder(
                                    borderRadius: BorderRadius.circular(12),
                                    borderSide: BorderSide(
                                      color: ValidationTheme.primaryBlue,
                                      width: 2,
                                    ),
                                  ),
                                  errorBorder: OutlineInputBorder(
                                    borderRadius: BorderRadius.circular(12),
                                    borderSide: BorderSide(
                                      color: ValidationTheme.errorRed,
                                      width: 1,
                                    ),
                                  ),
                                  focusedErrorBorder: OutlineInputBorder(
                                    borderRadius: BorderRadius.circular(12),
                                    borderSide: BorderSide(
                                      color: ValidationTheme.errorRed,
                                      width: 2,
                                    ),
                                  ),
                                ),
                                onChanged: (value) => _handleOTPChange(index, value),
                              ),
                            );
                          }),
                        ),
                        // Error message
                        if (_errorMessage != null) ...[
                          SizedBox(height: baseSpacing),
                          Container(
                            padding: EdgeInsets.symmetric(
                              horizontal: 12,
                              vertical: 10,
                            ),
                            decoration: BoxDecoration(
                              color: ValidationTheme.errorLight,
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(
                                color: ValidationTheme.errorRed.withOpacity(0.3),
                              ),
                            ),
                            child: Row(
                              children: [
                                Icon(
                                  Icons.error_outline,
                                  size: 18,
                                  color: ValidationTheme.errorRed,
                                ),
                                SizedBox(width: 8),
                                Expanded(
                                  child: Text(
                                    _errorMessage!,
                                    style: TextStyle(
                                      fontSize: 13,
                                      color: ValidationTheme.errorRed,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                        SizedBox(height: fieldSpacing * 2),
                        // Submit button
                        SizedBox(
                          width: double.infinity,
                          height: buttonHeight,
                          child: ElevatedButton(
                            onPressed: _isLoading ? null : _verifyOTP,
                            style: ElevatedButton.styleFrom(
                              backgroundColor: ValidationTheme.primaryBlue,
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(12),
                              ),
                              elevation: 0,
                            ),
                            child: _isLoading
                                ? SizedBox(
                                    height: 20,
                                    width: 20,
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2,
                                      valueColor: const AlwaysStoppedAnimation<Color>(
                                        Colors.white,
                                      ),
                                    ),
                                  )
                                : Text(
                                    'Submit',
                                    style: TextStyle(
                                      color: Colors.white,
                                      fontSize: buttonFontSize,
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                          ),
                        ),
                        SizedBox(height: fieldSpacing * 2),
                        // Resend option
                        Center(
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Text(
                                'Don\'t receive code? ',
                                style: TextStyle(
                                  fontSize: bodyFontSize,
                                  color: ValidationTheme.textSecondary,
                                ),
                              ),
                              GestureDetector(
                                onTap: _canResend && !_isLoading ? _resendOTP : null,
                                child: Text(
                                  _canResend
                                      ? 'Resend'
                                      : 'Resend (${_resendTimer}s)',
                                  style: TextStyle(
                                    fontSize: bodyFontSize,
                                    color: _canResend && !_isLoading
                                        ? ValidationTheme.primaryBlue
                                        : ValidationTheme.textSecondary,
                                    fontWeight: FontWeight.w600,
                                    decoration: _canResend && !_isLoading
                                        ? TextDecoration.underline
                                        : TextDecoration.none,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
