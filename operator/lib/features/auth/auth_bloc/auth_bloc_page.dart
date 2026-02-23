import 'package:flutter/material.dart';
import 'auth_bloc_bloc.dart';
import 'auth_bloc_screen.dart';

class AuthBlocPage extends StatefulWidget {
  static const String routeName = '/authBloc';

  @override
  _AuthBlocPageState createState() => _AuthBlocPageState();
}

class _AuthBlocPageState extends State<AuthBlocPage> {
  final _authBlocBloc = AuthBlocBloc();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('AuthBloc'),
      ),
      body: AuthBlocScreen(authBlocBloc: _authBlocBloc),
    );
  }
}
