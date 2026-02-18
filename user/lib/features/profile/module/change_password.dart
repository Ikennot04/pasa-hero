import 'package:flutter/material.dart';
import '../../auth/forgot_password/forgot_password_screen.dart';

class ChangePasswordModule {
  static void navigateToChangePassword(BuildContext context) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (context) => const ForgotPasswordScreen(),
      ),
    );
  }
}
