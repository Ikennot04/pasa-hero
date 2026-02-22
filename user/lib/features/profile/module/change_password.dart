import 'package:flutter/material.dart';
import '../screen/change_password/current_password.dart';

class ChangePasswordModule {
  static void navigateToChangePassword(BuildContext context) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (context) => const CurrentPasswordScreen(),
      ),
    );
  }
}
