import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../core/themes/validation_theme.dart';
import '../auth_bloc/auth_bloc_bloc.dart';
import '../auth_bloc/auth_bloc_provider.dart';
import '../auth_bloc/auth_bloc_event.dart';
import '../auth_bloc/auth_bloc_state.dart';
import '../../../core/services/auth_service.dart';
import 'forgot_password_otp.dart';

class ForgotPasswordScreen extends StatefulWidget {
  const ForgotPasswordScreen({super.key});

  @override
  State<ForgotPasswordScreen> createState() => _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends State<ForgotPasswordScreen> {
  final TextEditingController _emailController = TextEditingController();
  final _formKey = GlobalKey<FormState>();
  String? _validationError;
  bool _hasNavigated = false;
  String? _lastSentEmail;

  @override
  void dispose() {
    _emailController.dispose();
    super.dispose();
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
    final labelFontSize = isSmallScreen ? 15.0 : isMediumScreen ? 16.0 : 17.0;
    final inputFontSize = isSmallScreen ? 17.0 : isMediumScreen ? 18.0 : 19.0;
    final buttonHeight = isSmallScreen ? 50.0 : isMediumScreen ? 54.0 : 58.0;
    final verticalPadding = isSmallScreen ? 10.0 : isMediumScreen ? 14.0 : 18.0;
    final baseSpacing = isSmallScreen ? 5.0 : isMediumScreen ? 7.0 : 9.0;
    final titleSpacing = isSmallScreen ? 6.0 : isMediumScreen ? 10.0 : 14.0;
    final fieldSpacing = isSmallScreen ? 10.0 : isMediumScreen ? 12.0 : 14.0;

    // Header height (gradient area)
    final headerHeight = isSmallScreen ? 0.25 : isMediumScreen ? 0.28 : 0.30;

    // Get or create AuthBlocBloc
    AuthBlocBloc authBloc;
    try {
      authBloc = BlocProvider.of<AuthBlocBloc>(context);
    } catch (e) {
      // If bloc is not available in context, create a new one
      authBloc = AuthBlocBloc(
        provider: AuthBlocProvider(
          authService: AuthService(),
        ),
      );
    }

    return BlocProvider.value(
      value: authBloc,
      child: BlocListener<AuthBlocBloc, AuthBlocState>(
        listener: (context, state) {
          final email = _emailController.text.trim();
          
          // Navigate to OTP screen when OTP is sent successfully
          if (!state.isLoading && 
              state.error == null && 
              email.isNotEmpty &&
              _lastSentEmail == email &&
              !_hasNavigated) {
            print('✅ Forgot Password: OTP sent successfully for $email');
            _hasNavigated = true;
            
            // Navigate to OTP screen
            WidgetsBinding.instance.addPostFrameCallback((_) {
              if (mounted && _hasNavigated) {
                Navigator.of(context).push(
                  MaterialPageRoute(
                    builder: (context) => BlocProvider.value(
                      value: authBloc,
                      child: ForgotPasswordOTPScreen(
                        email: email,
                      ),
                    ),
                  ),
                );
              }
            });
          }
          
          // Show error if OTP sending failed
          if (state.error != null && !state.isLoading) {
            print('❌ Forgot Password: Error - ${state.error}');
            setState(() {
              _validationError = state.error.toString().replaceAll('Exception: ', '');
              _hasNavigated = false; // Allow retry
              _lastSentEmail = null; // Reset to allow retry
            });
          }
          
          // Clear validation error when auth state changes
          if (state.isAuthenticated) {
            setState(() {
              _validationError = null;
            });
          }
        },
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
                      height: screenHeight * headerHeight,
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
                    // Form content
                    Container(
                      width: double.infinity,
                      padding: EdgeInsets.symmetric(
                        horizontal: screenWidth * 0.08,
                        vertical: verticalPadding * 2,
                      ),
                      child: Form(
                        key: _formKey,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            // Heading
                            Text(
                              'Forgot password',
                              style: TextStyle(
                                fontSize: headingFontSize,
                                fontWeight: FontWeight.w700,
                                color: ValidationTheme.textPrimary,
                              ),
                            ),
                            SizedBox(height: titleSpacing),
                            // Instructional text
                            Text(
                              "Enter your email address, and we'll guide you through resetting your password safely.",
                              style: TextStyle(
                                fontSize: bodyFontSize,
                                color: ValidationTheme.textSecondary,
                                height: 1.5,
                              ),
                            ),
                            SizedBox(height: fieldSpacing * 2),
                            // Email input field
                            TextFormField(
                              controller: _emailController,
                              keyboardType: TextInputType.emailAddress,
                              textInputAction: TextInputAction.done,
                              style: TextStyle(
                                fontSize: inputFontSize,
                                color: ValidationTheme.textPrimary,
                              ),
                              decoration: InputDecoration(
                                labelText: 'Email address',
                                labelStyle: TextStyle(
                                  fontSize: labelFontSize,
                                  color: ValidationTheme.textSecondary,
                                ),
                                hintText: 'Email address',
                                hintStyle: TextStyle(
                                  fontSize: inputFontSize,
                                  color: ValidationTheme.textSecondary.withOpacity(0.5),
                                ),
                                filled: true,
                                fillColor: Colors.white,
                                contentPadding: EdgeInsets.symmetric(
                                  horizontal: 18,
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
                              validator: (value) {
                                if (value == null || value.trim().isEmpty) {
                                  return 'Please enter your email address';
                                }
                                if (!RegExp(r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$')
                                    .hasMatch(value.trim())) {
                                  return 'Please enter a valid email address';
                                }
                                return null;
                              },
                            ),
                            // Error message
                            if (_validationError != null) ...[
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
                                        _validationError!,
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
                            // Continue button
                            BlocBuilder<AuthBlocBloc, AuthBlocState>(
                              builder: (context, state) {
                                return SizedBox(
                                  width: double.infinity,
                                  height: buttonHeight,
                                  child: ElevatedButton(
                                    onPressed: state.isLoading || _hasNavigated
                                        ? null
                                        : () async {
                                            setState(() {
                                              _validationError = null;
                                            });

                                            if (!_formKey.currentState!.validate()) {
                                              return;
                                            }

                                            final email = _emailController.text.trim();
                                            
                                            // Validate email format again
                                            if (email.isEmpty) {
                                              setState(() {
                                                _validationError = 'Please enter your email address';
                                              });
                                              return;
                                            }

                                            if (!RegExp(r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$')
                                                .hasMatch(email)) {
                                              setState(() {
                                                _validationError = 'Please enter a valid email address';
                                              });
                                              return;
                                            }

                                            try {
                                              // Check if email exists in the system
                                              print('🔍 Forgot Password: Checking if email exists: $email');
                                              final authService = AuthService();
                                              final userExists = await authService.userExists(email);
                                              
                                              if (!userExists) {
                                                setState(() {
                                                  _validationError = 'No account found for this email address. Please check your email or sign up.';
                                                });
                                                return;
                                              }

                                              print('✅ Forgot Password: Email exists, sending OTP...');
                                              _lastSentEmail = email;
                                              
                                              // Send OTP
                                              context.read<AuthBlocBloc>().add(
                                                    SendOTPEvent(
                                                      email: email,
                                                    ),
                                                  );
                                            } catch (e) {
                                              print('❌ Forgot Password: Error checking email: $e');
                                              setState(() {
                                                _validationError = 'Failed to verify email. Please try again.';
                                              });
                                            }
                                          },
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: ValidationTheme.primaryBlue,
                                      shape: RoundedRectangleBorder(
                                        borderRadius: BorderRadius.circular(12),
                                      ),
                                      elevation: 0,
                                    ),
                                    child: state.isLoading
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
                                            'Continue',
                                            style: TextStyle(
                                              color: Colors.white,
                                              fontSize: inputFontSize,
                                              fontWeight: FontWeight.w600,
                                            ),
                                          ),
                                  ),
                                );
                              },
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
