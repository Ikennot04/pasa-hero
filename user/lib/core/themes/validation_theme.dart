import 'package:flutter/material.dart';

/// Validation and authentication theme colors
/// Use these constants throughout the app for consistent styling
class ValidationTheme {
  ValidationTheme._(); // Private constructor to prevent instantiation

  // Primary Colors
  static const Color primaryBlue = Color(0xFF3B82F6);
  static const Color darkBlue = Color(0xFF0062CA);
  static const Color mediumBlue = Color(0xFF8FB7E8);
  static const Color lightBlue = Color(0xFFEDF3F8);

  // Text Colors
  static const Color textPrimary = Color(0xFF1A1A1A);
  static const Color textSecondary = Color(0xFF6B7280);
  static const Color textDark = Colors.black87;
  static const Color textLight = Colors.white;

  // Background Colors
  static const Color backgroundLight = Color(0xFFF5F5F5);
  static const Color backgroundWhite = Colors.white;

  // Border Colors
  static const Color borderLight = Color(0xFFE5E7EB);
  static const Color borderGrey = Color(0xFFD1D5DB);

  // Error Colors
  static const Color errorRed = Color(0xFFEF4444);
  static const Color errorLight = Color(0xFFFEE2E2);

  // Success Colors
  static const Color successGreen = Color(0xFF10B981);
  static const Color successLight = Color(0xFFD1FAE5);

  // Gradient Colors (for backgrounds)
  static const List<Color> gradientColors = [
    darkBlue,      // #0062CA (top)
    mediumBlue,    // #8FB7E8 (fade)
    lightBlue,     // #EDF3F8 (light)
    Colors.white,  // white (bottom)
  ];

  static const List<double> gradientStops = [0.0, 0.15, 0.4, 1.0];

  /// Get the gradient decoration for OTP and auth screens
  static BoxDecoration get gradientDecoration => const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          stops: gradientStops,
          colors: gradientColors,
        ),
      );
}
