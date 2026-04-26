import 'dart:async';
import 'dart:developer' as developer;

import 'package:flutter_bloc/flutter_bloc.dart';
import 'auth_bloc_event.dart';
import 'auth_bloc_state.dart';

class AuthBlocBloc extends Bloc<AuthBlocEvent, AuthBlocState> {
  // todo: check singleton for logic in project
  // use GetIt for DI in projct
  static final AuthBlocBloc _authBlocBlocSingleton = AuthBlocBloc._internal();
  factory AuthBlocBloc() {
    return _authBlocBlocSingleton;
  }
  
  AuthBlocBloc._internal(): super(UnAuthBlocState(0)){
    on<AuthBlocEvent>((event, emit) {
      return emit.forEach<AuthBlocState>(
        event.applyAsync(currentState: state, bloc: this),
        onData: (state) => state,
        onError: (error, stackTrace) {
          developer.log('$error', name: 'AuthBlocBloc', error: error, stackTrace: stackTrace);
          return ErrorAuthBlocState(0, error.toString());
        },
      );
    });
  }
  
  @override
  Future<void> close() async{
    // dispose objects
    await super.close();
  }


}
