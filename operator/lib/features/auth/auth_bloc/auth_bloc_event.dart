import 'dart:async';
import 'dart:developer' as developer;

import 'package:meta/meta.dart';
import 'auth_bloc_state.dart';
import 'auth_bloc_bloc.dart';
import 'auth_bloc_repository.dart';

@immutable
abstract class AuthBlocEvent {
  Stream<AuthBlocState> applyAsync(
      {AuthBlocState currentState, AuthBlocBloc bloc});
  final AuthBlocRepository _authBlocRepository = AuthBlocRepository();
}

class UnAuthBlocEvent extends AuthBlocEvent {
  @override
  Stream<AuthBlocState> applyAsync({AuthBlocState? currentState, AuthBlocBloc? bloc}) async* {
    yield UnAuthBlocState(0);
  }
}

class LoadAuthBlocEvent extends AuthBlocEvent {
   
  final bool isError;
  @override
  String toString() => 'LoadAuthBlocEvent';

  LoadAuthBlocEvent(this.isError);

  @override
  Stream<AuthBlocState> applyAsync(
      {AuthBlocState? currentState, AuthBlocBloc? bloc}) async* {
    try {
      yield UnAuthBlocState(0);
      await Future.delayed(const Duration(seconds: 1));
      _authBlocRepository.test(isError);
      yield InAuthBlocState(0, 'Hello world');
    } catch (error, stackTrace) {
      developer.log('$error', name: 'LoadAuthBlocEvent', error: error, stackTrace: stackTrace);
      yield ErrorAuthBlocState(0, error.toString());
    }
  }
}
