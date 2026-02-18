import 'package:flutter/widgets.dart';

@immutable
abstract class AuthBlocEvent {}

/// Login with email and password
class LoginEvent extends AuthBlocEvent {
  final String email;
  final String password;

  LoginEvent({
    required this.email,
    required this.password,
  });

  @override
  String toString() => 'LoginEvent';
}

/// Register with email and password
class RegisterEvent extends AuthBlocEvent {
  final String email;
  final String password;
  final String firstName;
  final String lastName;

  RegisterEvent({
    required this.email,
    required this.password,
    required this.firstName,
    required this.lastName,
  });

  @override
  String toString() => 'RegisterEvent';
}

/// Sign in with Google (for login)
class GoogleSignInEvent extends AuthBlocEvent {
  @override
  String toString() => 'GoogleSignInEvent';
}

/// Sign up with Google (for registration)
class GoogleSignUpEvent extends AuthBlocEvent {
  @override
  String toString() => 'GoogleSignUpEvent';
}

/// Sign out
class LogoutEvent extends AuthBlocEvent {
  @override
  String toString() => 'LogoutEvent';
}

/// Check authentication state
class CheckAuthStateEvent extends AuthBlocEvent {
  @override
  String toString() => 'CheckAuthStateEvent';
}

/// Send OTP to email
class SendOTPEvent extends AuthBlocEvent {
  final String email;

  SendOTPEvent({required this.email});

  @override
  String toString() => 'SendOTPEvent';
}

/// Verify OTP and complete registration
class VerifyOTPAndRegisterEvent extends AuthBlocEvent {
  final String email;
  final String password;
  final String firstName;
  final String lastName;
  final String otpCode;

  VerifyOTPAndRegisterEvent({
    required this.email,
    required this.password,
    required this.firstName,
    required this.lastName,
    required this.otpCode,
  });

  @override
  String toString() => 'VerifyOTPAndRegisterEvent';
}

/// Verify OTP and complete login
class VerifyOTPAndLoginEvent extends AuthBlocEvent {
  final String email;
  final String password;
  final String otpCode;

  VerifyOTPAndLoginEvent({
    required this.email,
    required this.password,
    required this.otpCode,
  });

  @override
  String toString() => 'VerifyOTPAndLoginEvent';
}

/// Send email verification
class SendEmailVerificationEvent extends AuthBlocEvent {
  @override
  String toString() => 'SendEmailVerificationEvent';
}

/// Check email verification status
class CheckEmailVerificationEvent extends AuthBlocEvent {
  @override
  String toString() => 'CheckEmailVerificationEvent';
}

/// Verify OTP and complete Google sign-up
class VerifyOTPAndGoogleSignUpEvent extends AuthBlocEvent {
  final String email;
  final String displayName;
  final String otpCode;

  VerifyOTPAndGoogleSignUpEvent({
    required this.email,
    required this.displayName,
    required this.otpCode,
  });

  @override
  String toString() => 'VerifyOTPAndGoogleSignUpEvent';
}

/// Send password reset email
class SendPasswordResetEmailEvent extends AuthBlocEvent {
  final String email;

  SendPasswordResetEmailEvent({required this.email});

  @override
  String toString() => 'SendPasswordResetEmailEvent';
}

/// Reset password after OTP verification
class ResetPasswordEvent extends AuthBlocEvent {
  final String email;
  final String newPassword;

  ResetPasswordEvent({
    required this.email,
    required this.newPassword,
  });

  @override
  String toString() => 'ResetPasswordEvent';
}

/// Re-authenticate user with current password (for email change)
class ReauthenticateUserEvent extends AuthBlocEvent {
  final String password;

  ReauthenticateUserEvent({required this.password});

  @override
  String toString() => 'ReauthenticateUserEvent';
}

/// Send OTP to new email address
class SendOTPToNewEmailEvent extends AuthBlocEvent {
  final String newEmail;

  SendOTPToNewEmailEvent({required this.newEmail});

  @override
  String toString() => 'SendOTPToNewEmailEvent';
}

/// Verify OTP for new email
class VerifyOTPForNewEmailEvent extends AuthBlocEvent {
  final String newEmail;
  final String otpCode;

  VerifyOTPForNewEmailEvent({
    required this.newEmail,
    required this.otpCode,
  });

  @override
  String toString() => 'VerifyOTPForNewEmailEvent';
}

/// Update email after OTP verification
class UpdateEmailEvent extends AuthBlocEvent {
  final String newEmail;

  UpdateEmailEvent({required this.newEmail});

  @override
  String toString() => 'UpdateEmailEvent';
}
