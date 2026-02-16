import 'package:flutter/material.dart';
import 'auth_bloc_bloc.dart';
import 'auth_bloc_event.dart';
import 'auth_bloc_screen.dart';
import 'auth_bloc_provider.dart';
import '../../../core/services/auth_service.dart';
import '../../../core/services/otp_verification_service.dart';
import '../../../core/services/change_password_service.dart';
import '../../../core/services/email_verification_service.dart';

class AuthBlocPage extends StatefulWidget {
  const AuthBlocPage({
    required this.bloc,
    super.key
  });
  static const String routeName = '/authBloc';
  
  final AuthBlocBloc? bloc;

  @override
  State<AuthBlocPage> createState() => _AuthBlocPageState();
}

class _AuthBlocPageState extends State<AuthBlocPage> {
  AuthBlocBloc? _bloc;
  AuthBlocBloc get bloc {
    // get it by DI in real code.
    _bloc ??= widget.bloc ?? AuthBlocBloc(
      provider: AuthBlocProvider(
        authService: AuthService(),
        otpVerificationService: OTPVerificationService(),
        changePasswordService: ChangePasswordService(),
        emailVerificationService: EmailVerificationService(),
      ),
    );
    return _bloc!;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        centerTitle: true,
        title: const Text('Auth Bloc'),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () {
              bloc.add(LogoutEvent());
            },
            tooltip: 'Logout',
          ),
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () {
              bloc.add(CheckAuthStateEvent());
            },
            tooltip: 'Refresh Auth State',
          ),
        ],
      ),
      body: AuthBlocScreen(bloc: bloc),
    );
  }
}
