import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../screen/profile_information/profile_information.dart';
import '../../auth/auth_bloc/auth_bloc_bloc.dart';

class ProfileInformationModule {
  static void navigateToProfileInformation(BuildContext context) {
    // Try to get the existing AuthBloc from context
    AuthBlocBloc? authBloc;
    try {
      authBloc = BlocProvider.of<AuthBlocBloc>(context, listen: false);
    } catch (e) {
      // AuthBloc not found in context, that's okay
      authBloc = null;
    }

    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (context) => authBloc != null
            ? BlocProvider.value(
                value: authBloc,
                child: const ProfileInformationScreen(),
              )
            : const ProfileInformationScreen(),
      ),
    );
  }
}
