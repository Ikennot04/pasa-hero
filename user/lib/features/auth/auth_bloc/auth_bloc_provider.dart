import '../../../core/services/auth_service.dart';
import '../../../core/services/otp_verification_service.dart';
import '../../../core/services/change_password_service.dart';
import '../../../core/services/email_verification_service.dart';
import '../../../core/services/change_email_service.dart';

class AuthBlocProvider {
  final AuthService authService;
  final OTPVerificationService otpVerificationService;
  final ChangePasswordService changePasswordService;
  final EmailVerificationService emailVerificationService;
  final ChangeEmailService changeEmailService;

  AuthBlocProvider({
    required this.authService,
    required this.otpVerificationService,
    required this.changePasswordService,
    required this.emailVerificationService,
    required this.changeEmailService,
  });
}
