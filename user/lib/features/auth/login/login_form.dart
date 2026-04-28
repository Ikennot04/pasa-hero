import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../register/register_screen.dart';
import '../auth_bloc/auth_bloc_bloc.dart';
import '../auth_bloc/auth_bloc_event.dart';
import '../auth_bloc/auth_bloc_state.dart';
import '../otp/otp_screen.dart';
import '../../near_me/Screen/nearme_screen.dart';
import '../forgot_password/forgot_password_screen.dart';

class LoginForm extends StatefulWidget {
  final TextEditingController emailController;
  final TextEditingController passwordController;

  const LoginForm({
    super.key,
    required this.emailController,
    required this.passwordController,
  });

  @override
  State<LoginForm> createState() => _LoginFormState();
}

class _LoginFormState extends State<LoginForm> {
  bool _obscurePassword = true;
  String? _validationError;
  bool _navigatedToGoogleOtp = false;
  bool _acceptedTerms = false;
  bool _attemptedSubmit = false;
  bool _attemptedGoogle = false;

  static const String _termsText =
      'Effective Date: April 28, 2026\n\n'
      'Welcome to PasaHero. By using the PasaHero mobile application ("App"), you agree to the following Terms and Conditions. Please read carefully.\n\n'
      '1. Acceptance of Terms\n\n'
      'By accessing or using PasaHero, you agree to be legally bound by these Terms. If you do not agree, please do not use the App.\n\n'
      '2. Description of Service\n\n'
      'PasaHero is a commuter assistance app that provides:\n\n'
      'Real-time vehicle tracking\n'
      'Route and location services\n'
      'Estimated arrival information\n\n'
      '3. User Data & Privacy\n\n'
      'By using the App, you agree that we may collect and use the following:\n\n'
      'Location Data (GPS) – to provide tracking and route services\n'
      'Personal Information (e.g., name, email, device info)\n'
      'Usage Data – for improving app performance\n\n'
      'Your data may be processed using third-party services such as Google Maps API.\n\n'
      'We do not sell your personal data. Data is used strictly for app functionality and improvement.\n\n'
      '4. Location Tracking Consent\n\n'
      'You explicitly consent to:\n\n'
      'Real-time location tracking while using the app\n'
      'Background location access (if enabled)\n\n'
      'You can disable location permissions anytime, but some features may not function properly.\n\n'
      '5. User Responsibilities\n\n'
      'You agree to:\n\n'
      'Provide accurate information\n'
      'Use the app only for lawful purposes\n'
      'Not misuse tracking features or attempt unauthorized access\n\n'
      '6. Service Availability\n\n'
      'We do not guarantee:\n\n'
      'Continuous, error-free service\n'
      '100% accurate tracking or arrival times\n\n'
      '7. Limitation of Liability\n\n'
      'PasaHero is not responsible for:\n\n'
      'Delays, missed rides, or inaccurate data\n'
      'Any damages resulting from reliance on app information\n\n'
      '8. Termination\n\n'
      'We reserve the right to suspend or terminate access if you violate these Terms.\n\n'
      '9. Changes to Terms\n\n'
      'We may update these Terms anytime. Continued use means you accept the updated Terms.\n\n'
      '10. Contact\n\n'
      'For concerns, contact: pasaherocommunity@gmail.com';
  
  // Scroll controller for automatic scrolling to focused fields
  final ScrollController _scrollController = ScrollController();
  
  // Focus nodes for each field to detect when they're focused
  final FocusNode _emailFocusNode = FocusNode();
  final FocusNode _passwordFocusNode = FocusNode();
  
  // Global keys for each field to get their positions
  final GlobalKey _emailKey = GlobalKey();
  final GlobalKey _passwordKey = GlobalKey();

  @override
  void initState() {
    super.initState();
    // Listen to focus changes and scroll to focused field
    _emailFocusNode.addListener(() => _scrollToFocusedField(_emailKey));
    _passwordFocusNode.addListener(() => _scrollToFocusedField(_passwordKey));
  }
  
  void _scrollToFocusedField(GlobalKey key) {
    // Wait for the next frame to ensure the keyboard has appeared and layout is complete
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      
      final BuildContext? fieldContext = key.currentContext;
      if (fieldContext == null) return;
      
      // Use Flutter's built-in ensureVisible for automatic scrolling
      Scrollable.ensureVisible(
        fieldContext,
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeOut,
        alignment: 0.1, // Position field at 10% from top (above keyboard)
        alignmentPolicy: ScrollPositionAlignmentPolicy.keepVisibleAtEnd,
      );
    });
  }

  @override
  void dispose() {
    _scrollController.dispose();
    _emailFocusNode.dispose();
    _passwordFocusNode.dispose();
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

  @override
  Widget build(BuildContext context) {
    return BlocListener<AuthBlocBloc, AuthBlocState>(
      listener: (context, state) {
        // Navigate to near me screen on successful login (no OTP required)
        if (state.isAuthenticated && state.user != null && !state.isLoading) {
          // Use a post-frame callback to ensure navigation happens after build
          WidgetsBinding.instance.addPostFrameCallback((_) {
            if (mounted) {
              Navigator.of(context).pushAndRemoveUntil(
                MaterialPageRoute(
                  builder: (context) => const NearMeScreen(),
                ),
                (route) => false, // Remove all previous routes
              );
            }
          });
        }
        // Google login with no app profile yet: OTP was sent — same flow as Google sign-up
        if (!state.isLoading &&
            !state.isAuthenticated &&
            state.error == null &&
            !_navigatedToGoogleOtp) {
          final bloc = context.read<AuthBlocBloc>();
          final pendingEmail = bloc.pendingGoogleEmail;
          if (pendingEmail != null) {
            setState(() => _navigatedToGoogleOtp = true);
            final googleDisplayName = bloc.pendingGoogleDisplayName ?? '';
            bloc.resetPendingGoogleInfo();
            final authBloc =
                BlocProvider.of<AuthBlocBloc>(context, listen: false);
            WidgetsBinding.instance.addPostFrameCallback((_) {
              if (mounted) {
                Navigator.of(context).push(
                  MaterialPageRoute(
                    builder: (context) => BlocProvider.value(
                      value: authBloc,
                      child: OTPScreen(
                        email: pendingEmail,
                        isRegistration: true,
                        isGoogleSignUp: true,
                        googleDisplayName: googleDisplayName,
                      ),
                    ),
                  ),
                );
              }
            });
          }
        }
        if (state.error != null || state.isAuthenticated) {
          setState(() {
            _validationError = null;
            if (state.error != null) {
              _navigatedToGoogleOtp = false;
            }
          });
        }
      },
      child: Container(
        color: const Color(0xFFF5F5F5),
        child: LayoutBuilder(
          builder: (context, constraints) {
            final screenWidth = MediaQuery.of(context).size.width;
            final viewInsets = MediaQuery.of(context).viewInsets;
            final keyboardHeight = viewInsets.bottom;
            final isSmallScreen = screenWidth < 600;
            
            // Calculate available height for form (accounting for keyboard)
            final availableHeight = constraints.maxHeight;
            
            // Responsive values
            final horizontalPadding = isSmallScreen ? 24.0 : 28.0;
            final verticalPadding = isSmallScreen ? 16.0 : 20.0;
            final titleFontSize = isSmallScreen ? 24.0 : 26.0;
            final labelFontSize = isSmallScreen ? 15.0 : 16.0;
            final inputFontSize = isSmallScreen ? 17.0 : 18.0;
            final fieldHeight = isSmallScreen ? 56.0 : 60.0;
            final buttonHeight = isSmallScreen ? 50.0 : 54.0;
            
            // Dynamic spacing - responsive to available space
            final baseSpacing = availableHeight < 600 ? 8.0 : (availableHeight < 700 ? 10.0 : 12.0);
            final titleSpacing = availableHeight < 600 ? 12.0 : (availableHeight < 700 ? 16.0 : 20.0);
            final fieldSpacing = availableHeight < 600 ? 14.0 : (availableHeight < 700 ? 16.0 : 18.0);

            final showFieldErrors = _attemptedSubmit;
            final showTermsError = _attemptedSubmit || _attemptedGoogle;
            
            return Scrollbar(
              controller: _scrollController,
              thumbVisibility: true,
              thickness: 6.0,
              radius: const Radius.circular(3.0),
              child: SingleChildScrollView(
                controller: _scrollController,
                physics: const ClampingScrollPhysics(),
                keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
                padding: EdgeInsets.only(
                  left: horizontalPadding,
                  right: horizontalPadding,
                  top: verticalPadding,
                  bottom: verticalPadding + keyboardHeight,
                ),
                child: ConstrainedBox(
                constraints: BoxConstraints(
                  minHeight: availableHeight - keyboardHeight,
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                  SizedBox(height: baseSpacing),
                  // Title
                  Text(
                    'Login your account',
                    style: TextStyle(
                      fontSize: titleFontSize,
                      fontWeight: FontWeight.bold,
                      color: const Color(0xFF1A1A1A),
                    ),
                  ),
                  SizedBox(height: titleSpacing),
                  // Error Message (if any) - Flexible to prevent overflow
                  Flexible(
                    child: Builder(
                      builder: (context) {
                        return BlocBuilder<AuthBlocBloc, AuthBlocState>(
                          builder: (context, state) {
                            final errorMessage = _validationError ?? 
                              (state.error?.toString().replaceFirst('Exception: ', ''));
                            
                            if (errorMessage != null) {
                              return Container(
                                margin: EdgeInsets.only(bottom: baseSpacing),
                                padding: EdgeInsets.symmetric(
                                  horizontal: isSmallScreen ? 10.0 : 12.0,
                                  vertical: isSmallScreen ? 8.0 : 10.0,
                                ),
                                decoration: BoxDecoration(
                                  color: Colors.red.shade50,
                                  borderRadius: BorderRadius.circular(8),
                                  border: Border.all(
                                    color: Colors.red.shade300,
                                    width: 1,
                                  ),
                                ),
                                child: Row(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Icon(
                                      Icons.error_outline,
                                      color: Colors.red.shade700,
                                      size: isSmallScreen ? 16.0 : 18.0,
                                    ),
                                    SizedBox(width: isSmallScreen ? 6.0 : 8.0),
                                    Expanded(
                                      child: Text(
                                        errorMessage,
                                        style: TextStyle(
                                          color: Colors.red.shade700,
                                          fontSize: isSmallScreen ? 13.0 : 14.0,
                                          fontWeight: FontWeight.w500,
                                        ),
                                        maxLines: 2,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                    ),
                                  ],
                                ),
                              );
                            }
                            return const SizedBox.shrink();
                          },
                        );
                      },
                    ),
                  ),
                  // Email Input
                  Text(
                    'Email',
                    style: TextStyle(
                      fontSize: labelFontSize,
                      fontWeight: FontWeight.w500,
                      color: const Color(0xFF1A1A1A),
                    ),
                  ),
                  SizedBox(height: baseSpacing),
                  SizedBox(
                    key: _emailKey,
                    height: fieldHeight,
                    child: TextField(
                      controller: widget.emailController,
                      focusNode: _emailFocusNode,
                      keyboardType: TextInputType.emailAddress,
                      textInputAction: TextInputAction.next,
                      onChanged: (_) {
                        if (_attemptedSubmit) setState(() {});
                      },
                      style: TextStyle(fontSize: inputFontSize),
                      decoration: InputDecoration(
                        filled: true,
                        fillColor: Colors.white,
                        errorText: showFieldErrors && widget.emailController.text.isEmpty
                            ? 'Required'
                            : null,
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: const BorderSide(
                            color: Color(0xFF3B82F6),
                            width: 1.5,
                          ),
                        ),
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: const BorderSide(
                            color: Color(0xFF3B82F6),
                            width: 1.5,
                          ),
                        ),
                        focusedBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: const BorderSide(
                            color: Color(0xFF3B82F6),
                            width: 2,
                          ),
                        ),
                        errorBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: const BorderSide(color: Colors.red, width: 1.5),
                        ),
                        focusedErrorBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: const BorderSide(color: Colors.red, width: 2),
                        ),
                        contentPadding: EdgeInsets.symmetric(
                          horizontal: 18,
                          vertical: isSmallScreen ? 16.0 : 18.0,
                        ),
                      ),
                    ),
                  ),
                  SizedBox(height: fieldSpacing),
                  // Password Input
                  Text(
                    'Password',
                    style: TextStyle(
                      fontSize: labelFontSize,
                      fontWeight: FontWeight.w500,
                      color: const Color(0xFF1A1A1A),
                    ),
                  ),
                  SizedBox(height: baseSpacing),
                  SizedBox(
                    key: _passwordKey,
                    height: fieldHeight,
                    child: TextField(
                      controller: widget.passwordController,
                      focusNode: _passwordFocusNode,
                      obscureText: _obscurePassword,
                      textInputAction: TextInputAction.done,
                      onChanged: (_) {
                        if (_attemptedSubmit) setState(() {});
                      },
                      style: TextStyle(fontSize: inputFontSize),
                      decoration: InputDecoration(
                        filled: true,
                        fillColor: Colors.white,
                        errorText: showFieldErrors && widget.passwordController.text.isEmpty
                            ? 'Required'
                            : null,
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
                            color: Color(0xFF3B82F6),
                            width: 2,
                          ),
                        ),
                        errorBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: const BorderSide(color: Colors.red, width: 1.5),
                        ),
                        focusedErrorBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: const BorderSide(color: Colors.red, width: 2),
                        ),
                        hintText: 'Enter your password',
                        hintStyle: TextStyle(
                          color: const Color(0xFF9CA3AF),
                          fontSize: inputFontSize,
                        ),
                        contentPadding: EdgeInsets.symmetric(
                          horizontal: 18,
                          vertical: isSmallScreen ? 16.0 : 18.0,
                        ),
                        suffixIcon: IconButton(
                          icon: Icon(
                            _obscurePassword
                                ? Icons.visibility_outlined
                                : Icons.visibility_off_outlined,
                            color: const Color(0xFF6B7280),
                            size: isSmallScreen ? 20.0 : 24.0,
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
                  SizedBox(height: availableHeight < 600 ? 4.0 : 6.0),
                  // Forgot Password Link
                  Align(
                    alignment: Alignment.centerRight,
                    child: TextButton(
                      onPressed: () {
                        Navigator.of(context).push(
                          MaterialPageRoute(
                            builder: (context) => const ForgotPasswordScreen(),
                          ),
                        );
                      },
                      style: TextButton.styleFrom(
                        padding: EdgeInsets.symmetric(
                          horizontal: isSmallScreen ? 4.0 : 4.0,
                          vertical: isSmallScreen ? 4.0 : 4.0,
                        ),
                        minimumSize: Size.zero,
                        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                      ),
                      child: Text(
                        'Forgot password?',
                        style: TextStyle(
                          color: const Color(0xFF3B82F6),
                          fontSize: isSmallScreen ? 13.0 : 14.0,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ),
                  ),
                  SizedBox(height: fieldSpacing),
                  // Terms & Agreement checkbox (required)
                  Container(
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(
                        color: showTermsError && !_acceptedTerms ? Colors.red : Colors.transparent,
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
                        activeColor: const Color(0xFF3B82F6),
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
                                  color: Color(0xFF3B82F6),
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
                  SizedBox(height: baseSpacing),
                  // Log In Button
                  BlocBuilder<AuthBlocBloc, AuthBlocState>(
                    builder: (context, state) {
                      return SizedBox(
                        width: double.infinity,
                        height: buttonHeight,
                        child: ElevatedButton(
                          onPressed: state.isLoading
                              ? null
                              : () {
                                  setState(() {
                                    _attemptedSubmit = true;
                                    _attemptedGoogle = false;
                                    _validationError = null;
                                  });

                                  final missingEmail =
                                      widget.emailController.text.isEmpty;
                                  final missingPassword =
                                      widget.passwordController.text.isEmpty;
                                  final missingTerms = !_acceptedTerms;
                                  if (missingEmail || missingPassword || missingTerms) {
                                    return;
                                  }

                                  setState(() {
                                    _validationError = null;
                                  });
                                  
                                  if (!_acceptedTerms) {
                                    setState(() {
                                      _validationError =
                                          'Please accept the Terms & Agreement to continue';
                                    });
                                    return;
                                  }

                                  if (widget.emailController.text.isEmpty ||
                                      widget.passwordController.text.isEmpty) {
                                    setState(() {
                                      _validationError = 'Please fill in all fields';
                                    });
                                    return;
                                  }
                                  context.read<AuthBlocBloc>().add(
                                        LoginEvent(
                                          email: widget.emailController.text,
                                          password: widget.passwordController.text,
                                        ),
                                      );
                                },
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF3B82F6),
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
                                    valueColor: const AlwaysStoppedAnimation<Color>(Colors.white),
                                  ),
                                )
                              : Text(
                                  'Log in',
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
                  SizedBox(height: fieldSpacing),
                  // Separator
                  Row(
                    children: [
                      const Expanded(
                        child: Divider(
                          color: Color(0xFFD1D5DB),
                          thickness: 1,
                        ),
                      ),
                      Padding(
                        padding: EdgeInsets.symmetric(horizontal: isSmallScreen ? 12.0 : 16.0),
                        child: Text(
                          'Or, Sign In With',
                          style: TextStyle(
                            color: Colors.grey[600],
                            fontSize: isSmallScreen ? 13.0 : 14.0,
                          ),
                        ),
                      ),
                      const Expanded(
                        child: Divider(
                          color: Color(0xFFD1D5DB),
                          thickness: 1,
                        ),
                      ),
                    ],
                  ),
                  SizedBox(height: fieldSpacing),
                  // Log In with Google Button
                  BlocBuilder<AuthBlocBloc, AuthBlocState>(
                    builder: (context, state) {
                      return SizedBox(
                        width: double.infinity,
                        height: buttonHeight,
                        child: OutlinedButton(
                          onPressed: state.isLoading
                              ? null
                              : () {
                                  setState(() {
                                    _attemptedGoogle = true;
                                    _attemptedSubmit = false;
                                  });
                                  if (!_acceptedTerms) return;
                                  setState(() => _navigatedToGoogleOtp = false);
                                  context
                                      .read<AuthBlocBloc>()
                                      .add(GoogleSignInEvent());
                                },
                          style: OutlinedButton.styleFrom(
                            backgroundColor: Colors.white,
                            side: const BorderSide(
                              color: Color(0xFFE5E7EB),
                              width: 1,
                            ),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                          ),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              // Google Logo
                              Image.asset(
                                'assets/images/logo/google-logo.png',
                                width: isSmallScreen ? 18.0 : 22.0,
                                height: isSmallScreen ? 18.0 : 22.0,
                                fit: BoxFit.contain,
                                errorBuilder: (context, error, stackTrace) {
                                  return Container(
                                    width: isSmallScreen ? 18.0 : 22.0,
                                    height: isSmallScreen ? 18.0 : 22.0,
                                    decoration: BoxDecoration(
                                      borderRadius: BorderRadius.circular(4),
                                    ),
                                    child: Center(
                                      child: Text(
                                        'G',
                                        style: TextStyle(
                                          fontSize: isSmallScreen ? 14.0 : 18.0,
                                          fontWeight: FontWeight.bold,
                                          color: const Color(0xFF4285F4),
                                        ),
                                      ),
                                    ),
                                  );
                                },
                              ),
                              SizedBox(width: isSmallScreen ? 10.0 : 14.0),
                              Flexible(
                                child: Text(
                                  'Log in with Google',
                                  style: TextStyle(
                                    color: const Color(0xFF374151),
                                    fontSize: inputFontSize,
                                    fontWeight: FontWeight.w500,
                                  ),
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
                  SizedBox(height: availableHeight < 600 ? 6.0 : 10.0),
                  // Sign Up Link
                  Center(
                    child: Wrap(
                      alignment: WrapAlignment.center,
                      crossAxisAlignment: WrapCrossAlignment.center,
                      children: [
                        Text(
                          'Don\'t have an account? ',
                          style: TextStyle(
                            color: Colors.grey[600],
                            fontSize: isSmallScreen ? 13.0 : 14.0,
                          ),
                        ),
                        TextButton(
                          onPressed: () {
                            Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (context) => const RegisterScreen(),
                              ),
                            );
                          },
                          style: TextButton.styleFrom(
                            padding: EdgeInsets.symmetric(
                              horizontal: isSmallScreen ? 4.0 : 8.0,
                              vertical: isSmallScreen ? 4.0 : 8.0,
                            ),
                            minimumSize: Size.zero,
                            tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                          ),
                          child: Text(
                            'Sign up',
                            style: TextStyle(
                              color: const Color(0xFF3B82F6),
                              fontSize: isSmallScreen ? 13.0 : 14.0,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  SizedBox(height: baseSpacing),
                  ],
                ),
              ),
            ),
          );
          },
        ),
      ),
    );
  }
}
