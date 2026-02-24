import 'package:flutter/material.dart';
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
import 'email_verification.dart';

class NewEmailScreen extends StatefulWidget {
  const NewEmailScreen({super.key});

  @override
  State<NewEmailScreen> createState() => _NewEmailScreenState();
}

class _NewEmailScreenState extends State<NewEmailScreen> {
  final _emailController = TextEditingController();
  final _formKey = GlobalKey<FormState>();
  String? _errorMessage;
  bool _hasInitiatedOTP = false;
  bool _hasNavigated = false;

  @override
  void dispose() {
    _emailController.dispose();
    super.dispose();
  }

  void _handleSendOTP(BuildContext blocContext) async {
    if (!_formKey.currentState!.validate()) {
      return;
    }

    setState(() {
      _errorMessage = null;
      _hasInitiatedOTP = true;
    });

    final newEmail = _emailController.text.trim();
    
    // First check if email is already registered before sending OTP
    try {
      final authService = AuthService();
      final isRegistered = await authService.isEmailAlreadyRegistered(newEmail);
      
      if (isRegistered) {
        setState(() {
          _errorMessage = 'This email is already registered. Please use a different email address.';
          _hasInitiatedOTP = false;
        });
        return;
      }
      
      // Also check if it's the same as current email
      final currentUser = authService.currentUser;
      if (currentUser != null && currentUser.email?.toLowerCase() == newEmail.toLowerCase()) {
        setState(() {
          _errorMessage = 'New email cannot be the same as your current email address.';
          _hasInitiatedOTP = false;
        });
        return;
      }
    } catch (e) {
      setState(() {
        _errorMessage = 'Failed to validate email. Please try again.';
        _hasInitiatedOTP = false;
      });
      return;
    }
    
    // Get bloc from the BlocConsumer context
    final authBloc = BlocProvider.of<AuthBlocBloc>(blocContext, listen: false);
    
    // Dispatch send OTP event (service will also validate, but we've already checked)
    authBloc.add(SendOTPToNewEmailEvent(newEmail: newEmail));
  }

  @override
  Widget build(BuildContext context) {
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
              _errorMessage = state.error.toString().replaceAll('Exception: ', '');
              _hasInitiatedOTP = false; // Reset on error
            });
            return;
          }
          
          // Navigate to email verification screen on successful OTP send
          // Check if we initiated OTP send, it completed (not loading), no error, and haven't navigated yet
          if (_hasInitiatedOTP && !state.isLoading && state.error == null && !_hasNavigated) {
            _hasNavigated = true;
            _hasInitiatedOTP = false; // Reset flag
            WidgetsBinding.instance.addPostFrameCallback((_) {
              if (mounted) {
                Navigator.of(context).push(
                  MaterialPageRoute(
                    builder: (context) => EmailVerificationScreen(
                      newEmail: _emailController.text.trim(),
                    ),
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
                              icon: const Icon(
                                Icons.arrow_back,
                                color: ValidationTheme.textDark,
                              ),
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
                        padding: const EdgeInsets.symmetric(horizontal: 24.0),
                        child: Form(
                          key: _formKey,
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            crossAxisAlignment: CrossAxisAlignment.center,
                            children: [
                              const SizedBox(height: 40),
                              
                              // Heading
                              const Text(
                                'New Email address',
                                style: TextStyle(
                                  fontSize: 24,
                                  fontWeight: FontWeight.bold,
                                  color: ValidationTheme.textDark,
                                ),
                                textAlign: TextAlign.center,
                              ),
                              const SizedBox(height: 12),
                              
                              // Subtitle
                              Text(
                                'Enter your new email address',
                                style: TextStyle(
                                  fontSize: 16,
                                  color: ValidationTheme.textSecondary,
                                ),
                                textAlign: TextAlign.center,
                              ),
                              const SizedBox(height: 40),
                              
                              // Email field
                              Container(
                                decoration: BoxDecoration(
                                  color: ValidationTheme.backgroundWhite,
                                  borderRadius: BorderRadius.circular(12),
                                  boxShadow: [
                                    BoxShadow(
                                      color: Colors.black.withOpacity(0.05),
                                      blurRadius: 8,
                                      offset: const Offset(0, 2),
                                    ),
                                  ],
                                ),
                                child: TextFormField(
                                  controller: _emailController,
                                  keyboardType: TextInputType.emailAddress,
                                  decoration: InputDecoration(
                                    hintText: 'New email address',
                                    hintStyle: TextStyle(
                                      color: ValidationTheme.textSecondary.withOpacity(0.6),
                                    ),
                                    prefixIcon: const Icon(
                                      Icons.email_outlined,
                                      color: ValidationTheme.textSecondary,
                                    ),
                                    border: OutlineInputBorder(
                                      borderRadius: BorderRadius.circular(12),
                                      borderSide: BorderSide.none,
                                    ),
                                    enabledBorder: OutlineInputBorder(
                                      borderRadius: BorderRadius.circular(12),
                                      borderSide: BorderSide.none,
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
                                    contentPadding: const EdgeInsets.symmetric(
                                      horizontal: 16,
                                      vertical: 16,
                                    ),
                                  ),
                                  validator: (value) {
                                    if (value == null || value.isEmpty) {
                                      return 'Please enter an email address';
                                    }
                                    if (!RegExp(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')
                                        .hasMatch(value)) {
                                      return 'Please enter a valid email address';
                                    }
                                    return null;
                                  },
                                  onChanged: (_) {
                                    if (_errorMessage != null) {
                                      setState(() {
                                        _errorMessage = null;
                                      });
                                    }
                                  },
                                ),
                              ),
                              const SizedBox(height: 24),
                              
                              // Error message
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
                                      const Icon(
                                        Icons.error_outline,
                                        color: ValidationTheme.errorRed,
                                        size: 20,
                                      ),
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
                              
                              const SizedBox(height: 24),
                              
                              // Continue button
                              SizedBox(
                                width: double.infinity,
                                height: 56,
                                child: ElevatedButton(
                                  onPressed: state.isLoading ? null : () => _handleSendOTP(context),
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: ValidationTheme.primaryBlue,
                                    foregroundColor: ValidationTheme.textLight,
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(12),
                                    ),
                                    elevation: 0,
                                  ),
                                  child: state.isLoading
                                      ? const SizedBox(
                                          width: 20,
                                          height: 20,
                                          child: CircularProgressIndicator(
                                            strokeWidth: 2,
                                            valueColor: AlwaysStoppedAnimation<Color>(
                                              ValidationTheme.textLight,
                                            ),
                                          ),
                                        )
                                      : const Text(
                                          'Continue',
                                          style: TextStyle(
                                            fontSize: 16,
                                            fontWeight: FontWeight.w600,
                                          ),
                                        ),
                                ),
                              ),
                              const SizedBox(height: 40),
                            ],
                          ),
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
