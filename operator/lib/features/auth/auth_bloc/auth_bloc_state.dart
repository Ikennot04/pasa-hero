import 'package:equatable/equatable.dart';

abstract class AuthBlocState extends Equatable {
  AuthBlocState(this.version);
 
  /// notify change state without deep clone state
  final int version;

  /// Copy object for use in action
  /// if need use deep clone
  AuthBlocState getStateCopy();

  AuthBlocState getNewVersion();

  @override
  List<Object> get props => [version];
}

/// UnInitialized
class UnAuthBlocState extends AuthBlocState {

  UnAuthBlocState(int version) : super(version);

  @override
  String toString() => 'UnAuthBlocState';

  @override
  UnAuthBlocState getStateCopy() {
    return UnAuthBlocState(0);
  }

  @override
  UnAuthBlocState getNewVersion() {
    return UnAuthBlocState(version+1);
  }
}

/// Initialized
class InAuthBlocState extends AuthBlocState {
  
  InAuthBlocState(int version, this.hello) : super(version);
 
  final String hello;

  @override
  String toString() => 'InAuthBlocState $hello';

  @override
  InAuthBlocState getStateCopy() {
    return InAuthBlocState(version, hello);
  }

  @override
  InAuthBlocState getNewVersion() {
    return InAuthBlocState(version+1, hello);
  }

  @override
  List<Object> get props => [version, hello];
}

class ErrorAuthBlocState extends AuthBlocState {
  ErrorAuthBlocState(int version, this.errorMessage): super(version);
 
  final String errorMessage;
  
  @override
  String toString() => 'ErrorAuthBlocState';

  @override
  ErrorAuthBlocState getStateCopy() {
    return ErrorAuthBlocState(version, errorMessage);
  }

  @override
  ErrorAuthBlocState getNewVersion() {
    return ErrorAuthBlocState(version+1, 
    errorMessage);
  }

  @override
  List<Object> get props => [version, errorMessage];
}
