import 'package:flutter/material.dart';
import '../screen/change_email/email_password.dart';

class ChangeEmailModule {
  static void navigateToChangeEmail(BuildContext context) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (context) => const EmailPasswordScreen(),
      ),
    );
  }
}
