import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'auth_bloc_bloc.dart';
import 'auth_bloc_state.dart';
import 'auth_bloc_event.dart';

class AuthBlocScreen extends StatefulWidget {
  const AuthBlocScreen({
    required AuthBlocBloc authBlocBloc,
    Key? key,
  })  : _authBlocBloc = authBlocBloc,
        super(key: key);

  final AuthBlocBloc _authBlocBloc;

  @override
  AuthBlocScreenState createState() {
    return AuthBlocScreenState();
  }
}

class AuthBlocScreenState extends State<AuthBlocScreen> {
  AuthBlocScreenState();

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<AuthBlocBloc, AuthBlocState>(
        bloc: widget._authBlocBloc,
        builder: (
          BuildContext context,
          AuthBlocState currentState,
        ) {
          if (currentState is UnAuthBlocState) {
            return Center(
              child: CircularProgressIndicator(),
            );
          }
          if (currentState is ErrorAuthBlocState) {
            return Center(
                child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: <Widget>[
                Text(currentState.errorMessage),
                Padding(
                  padding: const EdgeInsets.only(top: 32.0),
                  child: ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.blue,
                    ),
                    child: Text('reload'),
                    onPressed: _load,
                  ),
                ),
              ],
            ));
          }
           if (currentState is InAuthBlocState) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: <Widget>[
                  Text(currentState.hello),
                  const Text('Flutter files: done'),
                  Padding(
                    padding: const EdgeInsets.only(top: 32.0),
                    child: ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.red,
                      ),
                      child: Text('throw error'),
                      onPressed: () => _load(true),
                    ),
                  ),
                ],
              ),
            );
          }
          return Center(
              child: CircularProgressIndicator(),
          );
          
        });
  }

  void _load([bool isError = false]) {
    widget._authBlocBloc.add(LoadAuthBlocEvent(isError));
  }
}
