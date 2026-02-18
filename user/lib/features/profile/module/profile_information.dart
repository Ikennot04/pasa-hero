import 'package:flutter/material.dart';

class ProfileInformationModule {
  static void navigateToProfileInformation(BuildContext context) {
    // TODO: Implement profile information screen
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Profile Information screen coming soon'),
      ),
    );
  }
}
