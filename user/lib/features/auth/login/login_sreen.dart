import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'login_form.dart';
import '../auth_bloc/auth_bloc_bloc.dart';
import '../auth_bloc/auth_bloc_provider.dart';
import '../../../core/services/auth_service.dart';
import '../../../core/services/otp_verification_service.dart';
import '../../../core/services/change_password_service.dart';
import '../../../core/services/email_verification_service.dart';
import '../../../core/services/change_email_service.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final TextEditingController _emailController = TextEditingController(
    text: 'kentflores@gmail.com',
  );
  final TextEditingController _passwordController = TextEditingController();

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final screenWidth = MediaQuery.of(context).size.width;
    final screenHeight = MediaQuery.of(context).size.height;
    final isSmallScreen = screenWidth < 600;
    final isMediumScreen = screenWidth >= 600 && screenWidth < 900;
    
    // Responsive logo size - zoomed in
    final logoWidth = isSmallScreen ? screenWidth * 0.85 : (isMediumScreen ? 500.0 : 600.0);
    final logoHeight = isSmallScreen ? screenWidth * 0.68 : (isMediumScreen ? 400.0 : 480.0);
    
    // Responsive header height
    final headerHeight = isSmallScreen ? screenHeight * 0.35 : screenHeight * 0.4;
    
    // Responsive form start position - moved lower
    final formTop = isSmallScreen ? screenHeight * 0.40 : screenHeight * 0.48;
    
    // Responsive border radius
    final borderRadius = isSmallScreen ? 30.0 : 50.0;

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
      child: Scaffold(
        backgroundColor: const Color(0xFF1E3A8A),
        resizeToAvoidBottomInset: true,
        body: SafeArea(
          bottom: false,
          child: LayoutBuilder(
            builder: (context, constraints) {
              final viewInsets = MediaQuery.of(context).viewInsets;
              final keyboardHeight = viewInsets.bottom;
              
              // Adjust header and form position when keyboard appears
              final headerShrinkFactor = keyboardHeight > 0 ? 0.6 : 1.0;
              final adjustedHeaderHeight = headerHeight * headerShrinkFactor;
              final adjustedFormTop = formTop * headerShrinkFactor;
              
              return Stack(
                children: [
                  // Header background - shrinks when keyboard appears
                  AnimatedPositioned(
                    duration: const Duration(milliseconds: 300),
                    curve: Curves.easeOut,
                    top: 0,
                    left: 0,
                    right: 0,
                    height: adjustedHeaderHeight,
                    child: Container(
                      width: double.infinity,
                      color: const Color(0xFF1E3A8A),
                      child: Center(
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 300),
                          curve: Curves.easeOut,
                          width: logoWidth * headerShrinkFactor,
                          height: logoHeight * headerShrinkFactor,
                          child: Image.asset(
                            'assets/images/logo/logo1.png',
                            fit: BoxFit.contain,
                          ),
                        ),
                      ),
                    ),
                  ),

                  // Login form - positioned to overlap header, moves up when keyboard appears
                  AnimatedPositioned(
                    duration: const Duration(milliseconds: 300),
                    curve: Curves.easeOut,
                    top: adjustedFormTop,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    child: ClipRRect(
                      borderRadius: BorderRadius.only(
                        topLeft: Radius.circular(borderRadius),
                        topRight: Radius.circular(borderRadius),
                      ),
                      child: LoginForm(
                        emailController: _emailController,
                        passwordController: _passwordController,
                      ),
                    ),
                  ),
                ],
              );
            },
          ),
        ),
      ),
    );
  }
}
