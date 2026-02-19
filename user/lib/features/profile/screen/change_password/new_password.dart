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
import 'password_succcess.dart';

class NewPasswordScreen extends StatefulWidget {
  const NewPasswordScreen({super.key});

  @override
  State<NewPasswordScreen> createState() => _NewPasswordScreenState();
}

class _NewPasswordScreenState extends State<NewPasswordScreen> {
  final _newPasswordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();
  final _formKey = GlobalKey<FormState>();
  bool _obscureNewPassword = true;
  bool _obscureConfirmPassword = true;
  String? _errorMessage;
  bool _hasInitiatedChange = false;
  bool _hasNavigated = false;

  @override
  void dispose() {
    _newPasswordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  void _handleChangePassword(BuildContext blocContext) {
    if (!_formKey.currentState!.validate()) {
      return;
    }

    setState(() {
      _errorMessage = null;
      _hasInitiatedChange = true;
    });

    final newPassword = _newPasswordController.text.trim();
    
    // Get bloc from the BlocConsumer context
    final authBloc = BlocProvider.of<AuthBlocBloc>(blocContext, listen: false);
    
    // Dispatch change password event
    authBloc.add(ChangePasswordEvent(newPassword: newPassword));
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
              _hasInitiatedChange = false; // Reset on error
            });
            return;
          }
          
          // Navigate to success screen on successful password change
          // Check if we initiated change, it completed (not loading), no error, and haven't navigated yet
          if (_hasInitiatedChange && !state.isLoading && state.error == null && !_hasNavigated) {
            _hasNavigated = true;
            _hasInitiatedChange = false; // Reset flag
            WidgetsBinding.instance.addPostFrameCallback((_) {
              if (mounted) {
                Navigator.of(context).pushReplacement(
                  MaterialPageRoute(
                    builder: (context) => const PasswordSuccessScreen(),
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
                                'Change Password',
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
                                'Create New password',
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
                                'Your password at least 6 characters',
                                style: TextStyle(
                                  fontSize: 16,
                                  color: ValidationTheme.textSecondary,
                                ),
                                textAlign: TextAlign.center,
                              ),
                              const SizedBox(height: 40),
                              
                              // New password field
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
                                  controller: _newPasswordController,
                                  obscureText: _obscureNewPassword,
                                  decoration: InputDecoration(
                                    hintText: 'New password',
                                    hintStyle: TextStyle(
                                      color: ValidationTheme.textSecondary.withOpacity(0.6),
                                    ),
                                    prefixIcon: const Icon(
                                      Icons.lock_outline,
                                      color: ValidationTheme.textSecondary,
                                    ),
                                    suffixIcon: IconButton(
                                      icon: Icon(
                                        _obscureNewPassword
                                            ? Icons.visibility_outlined
                                            : Icons.visibility_off_outlined,
                                        color: ValidationTheme.textSecondary,
                                      ),
                                      onPressed: () {
                                        setState(() {
                                          _obscureNewPassword = !_obscureNewPassword;
                                        });
                                      },
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
                                      return 'Please enter a new password';
                                    }
                                    if (value.length < 6) {
                                      return 'Password must be at least 6 characters';
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
                              
                              // Re-type password field
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
                                  controller: _confirmPasswordController,
                                  obscureText: _obscureConfirmPassword,
                                  decoration: InputDecoration(
                                    hintText: 'Re-type password',
                                    hintStyle: TextStyle(
                                      color: ValidationTheme.textSecondary.withOpacity(0.6),
                                    ),
                                    prefixIcon: const Icon(
                                      Icons.lock_outline,
                                      color: ValidationTheme.textSecondary,
                                    ),
                                    suffixIcon: IconButton(
                                      icon: Icon(
                                        _obscureConfirmPassword
                                            ? Icons.visibility_outlined
                                            : Icons.visibility_off_outlined,
                                        color: ValidationTheme.textSecondary,
                                      ),
                                      onPressed: () {
                                        setState(() {
                                          _obscureConfirmPassword = !_obscureConfirmPassword;
                                        });
                                      },
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
                                      return 'Please confirm your password';
                                    }
                                    if (value != _newPasswordController.text) {
                                      return 'Passwords do not match';
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
                              
                              // Submit button
                              SizedBox(
                                width: double.infinity,
                                height: 56,
                                child: ElevatedButton(
                                  onPressed: state.isLoading ? null : () => _handleChangePassword(context),
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
                                          'Submit',
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
