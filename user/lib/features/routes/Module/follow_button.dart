import 'package:flutter/material.dart';
import '../../../core/themes/validation_theme.dart';

class FollowButton extends StatelessWidget {
  final VoidCallback? onPressed;
  final bool isFollowing;
  final String? text;

  const FollowButton({
    super.key,
    this.onPressed,
    this.isFollowing = false,
    this.text,
  });

  @override
  Widget build(BuildContext context) {
    return OutlinedButton(
      onPressed: onPressed,
      style: OutlinedButton.styleFrom(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        side: BorderSide(
          color: ValidationTheme.primaryBlue,
          width: 1.5,
        ),
        backgroundColor: ValidationTheme.backgroundWhite,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(8),
        ),
      ),
      child: Text(
        text ?? (isFollowing ? 'Following' : 'Follow'),
        style: TextStyle(
          fontSize: 13,
          fontWeight: FontWeight.w600,
          color: ValidationTheme.primaryBlue,
        ),
      ),
    );
  }
}
