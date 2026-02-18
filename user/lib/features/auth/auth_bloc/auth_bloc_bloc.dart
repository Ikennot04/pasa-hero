import 'package:bloc/bloc.dart';
import 'auth_bloc_event.dart';
import 'auth_bloc_state.dart';
import 'auth_bloc_provider.dart';

class AuthBlocBloc extends Bloc<AuthBlocEvent, AuthBlocState> {
  AuthBlocBloc({
    required this.provider,
    AuthBlocState? initialState,
  }) : super(initialState ?? const AuthBlocState()) {
    on<LoginEvent>(_onLoginEvent);
    on<RegisterEvent>(_onRegisterEvent);
    on<GoogleSignInEvent>(_onGoogleSignInEvent);
    on<GoogleSignUpEvent>(_onGoogleSignUpEvent);
    on<LogoutEvent>(_onLogoutEvent);
    on<CheckAuthStateEvent>(_onCheckAuthStateEvent);
    on<SendOTPEvent>(_onSendOTPEvent);
    on<VerifyOTPAndRegisterEvent>(_onVerifyOTPAndRegisterEvent);
    on<VerifyOTPAndLoginEvent>(_onVerifyOTPAndLoginEvent);
    on<SendEmailVerificationEvent>(_onSendEmailVerificationEvent);
    on<CheckEmailVerificationEvent>(_onCheckEmailVerificationEvent);
    on<VerifyOTPAndGoogleSignUpEvent>(_onVerifyOTPAndGoogleSignUpEvent);
    on<SendPasswordResetEmailEvent>(_onSendPasswordResetEmailEvent);
    on<ResetPasswordEvent>(_onResetPasswordEvent);
    on<ReauthenticateUserEvent>(_onReauthenticateUserEvent);
    on<SendOTPToNewEmailEvent>(_onSendOTPToNewEmailEvent);
    on<VerifyOTPForNewEmailEvent>(_onVerifyOTPForNewEmailEvent);
    on<UpdateEmailEvent>(_onUpdateEmailEvent);
  }

  final AuthBlocProvider provider;
  
  // Temporary storage for Google sign-up info (used before OTP verification)
  String? _pendingGoogleEmail;
  String? _pendingGoogleDisplayName;
  
  String? get pendingGoogleEmail => _pendingGoogleEmail;
  String? get pendingGoogleDisplayName => _pendingGoogleDisplayName;
  
  void resetPendingGoogleInfo() {
    _pendingGoogleEmail = null;
    _pendingGoogleDisplayName = null;
  }

  Future<void> _onLoginEvent(
    LoginEvent event,
    Emitter<AuthBlocState> emit,
  ) async {
    emit(state.copyWithoutError(isLoading: true));
    try {
      // Direct login without OTP verification
      final credential = await provider.authService.signInWithEmailAndPassword(
        email: event.email,
        password: event.password,
      );
      
      emit(state.copyWithoutError(
        isLoading: false,
        user: credential.user,
      ));
    } catch (error) {
      emit(state.copy(error: error, isLoading: false));
    }
  }

  Future<void> _onRegisterEvent(
    RegisterEvent event,
    Emitter<AuthBlocState> emit,
  ) async {
    emit(state.copyWithoutError(isLoading: true));
    try {
      print('📝 RegisterEvent: Checking if email is already registered...');
      // Check if email is already registered BEFORE sending OTP
      final isRegistered = await provider.authService.isEmailAlreadyRegistered(event.email);
      if (isRegistered) {
        print('   ❌ Email is already registered, throwing error');
        throw Exception('Account is already registered');
      }
      
      print('   ✅ Email is not registered, sending OTP...');
      // Send OTP only if email is not already registered
      await provider.otpVerificationService.sendOTP(email: event.email);
      print('   ✅ OTP sent successfully');
      emit(state.copyWithoutError(isLoading: false));
      // Note: Registration will be completed in VerifyOTPAndRegisterEvent
    } catch (error) {
      print('   ❌ Error in RegisterEvent: $error');
      emit(state.copy(error: error, isLoading: false));
    }
  }

  Future<void> _onGoogleSignInEvent(
    GoogleSignInEvent event,
    Emitter<AuthBlocState> emit,
  ) async {
    emit(state.copyWithoutError(isLoading: true));
    try {
      final credential = await provider.authService.signInWithGoogle();
      emit(state.copyWithoutError(
        isLoading: false,
        user: credential.user,
      ));
    } catch (error) {
      emit(state.copy(error: error, isLoading: false));
    }
  }

  Future<void> _onGoogleSignUpEvent(
    GoogleSignUpEvent event,
    Emitter<AuthBlocState> emit,
  ) async {
    emit(state.copyWithoutError(isLoading: true));
    try {
      // Get Google user email without authenticating
      final googleUserInfo = await provider.authService.getGoogleUserEmail();
      final email = googleUserInfo['email'] ?? '';
      final displayName = googleUserInfo['displayName'] ?? '';
      
      if (email.isEmpty) {
        throw Exception('Failed to get email from Google account.');
      }
      
      // Check if email is already registered BEFORE sending OTP
      final isRegistered = await provider.authService.isEmailAlreadyRegistered(email);
      if (isRegistered) {
        throw Exception('Account is already registered');
      }
      
      // Store Google user info temporarily
      _pendingGoogleEmail = email;
      _pendingGoogleDisplayName = displayName;
      
      // Send OTP to the email only if not already registered
      try {
        await provider.otpVerificationService.sendOTP(email: email);
      } catch (otpError) {
        _pendingGoogleEmail = null;
        _pendingGoogleDisplayName = null;
        throw Exception('Failed to send OTP: $otpError');
      }
      
      emit(state.copyWithoutError(
        isLoading: false,
      ));
    } catch (error) {
      _pendingGoogleEmail = null;
      _pendingGoogleDisplayName = null;
      emit(state.copy(error: error, isLoading: false));
    }
  }

  Future<void> _onVerifyOTPAndGoogleSignUpEvent(
    VerifyOTPAndGoogleSignUpEvent event,
    Emitter<AuthBlocState> emit,
  ) async {
    print('🎯 AuthBloc: VerifyOTPAndGoogleSignUpEvent received');
    print('   Email: ${event.email}');
    print('   OTP Code: ${event.otpCode}');
    print('   OTP Length: ${event.otpCode.length}');
    
    emit(state.copyWithoutError(isLoading: true));
    try {
      // First verify OTP
      print('   🔍 Verifying OTP...');
      await provider.otpVerificationService.verifyOTP(
        email: event.email,
        otpCode: event.otpCode,
      );
      print('   ✅ OTP verified successfully');
      
      // If OTP is verified, complete Google sign-up
      print('   🔐 Completing Google sign-up...');
      final credential = await provider.authService.signUpWithGoogle();
      print('   ✅ Google sign-up successful');
      print('   📤 Emitting authenticated state with user: ${credential.user?.email ?? "null"}');
      
      final newState = state.copyWithoutError(
        isLoading: false,
        user: credential.user,
      );
      print('   📤 New state - isAuthenticated: ${newState.isAuthenticated}, user: ${newState.user?.email ?? "null"}, isLoading: ${newState.isLoading}');
      emit(newState);
      print('   ✅ State emitted successfully');
    } catch (error) {
      print('   ❌ Error in VerifyOTPAndGoogleSignUpEvent: $error');
      print('   ❌ Error type: ${error.runtimeType}');
      emit(state.copy(error: error, isLoading: false));
    }
  }

  Future<void> _onLogoutEvent(
    LogoutEvent event,
    Emitter<AuthBlocState> emit,
  ) async {
    emit(state.copyWithoutError(isLoading: true));
    try {
      await provider.authService.signOut();
      emit(state.copyWithoutData(isLoading: false));
    } catch (error) {
      emit(state.copy(error: error, isLoading: false));
    }
  }

  Future<void> _onCheckAuthStateEvent(
    CheckAuthStateEvent event,
    Emitter<AuthBlocState> emit,
  ) async {
    final user = provider.authService.currentUser;
    emit(state.copyWithoutError(user: user));
  }

  Future<void> _onSendOTPEvent(
    SendOTPEvent event,
    Emitter<AuthBlocState> emit,
  ) async {
    print('📧 AuthBloc: SendOTPEvent received');
    print('   Email: ${event.email}');
    
    emit(state.copyWithoutError(isLoading: true));
    try {
      print('   📤 Sending OTP to ${event.email}...');
      await provider.otpVerificationService.sendOTP(email: event.email);
      print('   ✅ OTP sent successfully');
      emit(state.copyWithoutError(isLoading: false));
    } catch (error) {
      print('   ❌ Failed to send OTP: $error');
      print('   ❌ Error type: ${error.runtimeType}');
      emit(state.copy(error: error, isLoading: false));
    }
  }

  Future<void> _onVerifyOTPAndRegisterEvent(
    VerifyOTPAndRegisterEvent event,
    Emitter<AuthBlocState> emit,
  ) async {
    print('🎯 AuthBloc: VerifyOTPAndRegisterEvent received');
    print('   Email: ${event.email}');
    print('   OTP Code: ${event.otpCode}');
    print('   OTP Length: ${event.otpCode.length}');
    
    emit(state.copyWithoutError(isLoading: true));
    try {
      // First verify OTP
      print('   🔍 Verifying OTP...');
      await provider.otpVerificationService.verifyOTP(
        email: event.email,
        otpCode: event.otpCode,
      );
      print('   ✅ OTP verified successfully');
      
      // If OTP is verified, create the account
      print('   📝 Creating account...');
      final credential = await provider.authService.registerWithEmailAndPassword(
        email: event.email,
        password: event.password,
        firstName: event.firstName,
        lastName: event.lastName,
      );
      print('   ✅ Account created successfully');
      
      emit(state.copyWithoutError(
        isLoading: false,
        user: credential.user,
      ));
    } catch (error) {
      print('   ❌ Error in VerifyOTPAndRegisterEvent: $error');
      print('   ❌ Error type: ${error.runtimeType}');
      emit(state.copy(error: error, isLoading: false));
    }
  }

  Future<void> _onVerifyOTPAndLoginEvent(
    VerifyOTPAndLoginEvent event,
    Emitter<AuthBlocState> emit,
  ) async {
    print('🎯 AuthBloc: VerifyOTPAndLoginEvent received');
    print('   Email: ${event.email}');
    print('   OTP Code: ${event.otpCode}');
    print('   OTP Length: ${event.otpCode.length}');
    
    emit(state.copyWithoutError(isLoading: true));
    try {
      // First verify OTP
      print('   🔍 Verifying OTP...');
      await provider.otpVerificationService.verifyOTP(
        email: event.email,
        otpCode: event.otpCode,
      );
      print('   ✅ OTP verified successfully');
      
      // If OTP is verified, proceed with login
      print('   🔐 Signing in...');
      final credential = await provider.authService.signInWithEmailAndPassword(
        email: event.email,
        password: event.password,
      );
      print('   ✅ Login successful');
      
      emit(state.copyWithoutError(
        isLoading: false,
        user: credential.user,
      ));
    } catch (error) {
      print('   ❌ Error in VerifyOTPAndLoginEvent: $error');
      print('   ❌ Error type: ${error.runtimeType}');
      emit(state.copy(error: error, isLoading: false));
    }
  }

  Future<void> _onSendEmailVerificationEvent(
    SendEmailVerificationEvent event,
    Emitter<AuthBlocState> emit,
  ) async {
    emit(state.copyWithoutError(isLoading: true));
    try {
      await provider.emailVerificationService.sendEmailVerification();
      emit(state.copyWithoutError(isLoading: false));
    } catch (error) {
      emit(state.copy(error: error, isLoading: false));
    }
  }

  Future<void> _onCheckEmailVerificationEvent(
    CheckEmailVerificationEvent event,
    Emitter<AuthBlocState> emit,
  ) async {
    emit(state.copyWithoutError(isLoading: true));
    try {
      // Reload user to get latest verification status
      await provider.emailVerificationService.reloadUser();
      final user = provider.authService.currentUser;
      emit(state.copyWithoutError(
        isLoading: false,
        user: user,
      ));
    } catch (error) {
      emit(state.copy(error: error, isLoading: false));
    }
  }

  Future<void> _onSendPasswordResetEmailEvent(
    SendPasswordResetEmailEvent event,
    Emitter<AuthBlocState> emit,
  ) async {
    emit(state.copyWithoutError(isLoading: true));
    try {
      await provider.changePasswordService.sendPasswordResetEmail(event.email);
      emit(state.copyWithoutError(isLoading: false));
    } catch (error) {
      emit(state.copy(error: error, isLoading: false));
    }
  }

  Future<void> _onResetPasswordEvent(
    ResetPasswordEvent event,
    Emitter<AuthBlocState> emit,
  ) async {
    emit(state.copyWithoutError(isLoading: true));
    try {
      await provider.changePasswordService.resetPassword(
        email: event.email,
        newPassword: event.newPassword,
      );
      emit(state.copyWithoutError(isLoading: false));
    } catch (error) {
      emit(state.copy(error: error, isLoading: false));
    }
  }

  Future<void> _onReauthenticateUserEvent(
    ReauthenticateUserEvent event,
    Emitter<AuthBlocState> emit,
  ) async {
    emit(state.copyWithoutError(isLoading: true));
    try {
      await provider.changeEmailService.reauthenticateUser(event.password);
      emit(state.copyWithoutError(isLoading: false));
    } catch (error) {
      emit(state.copy(error: error, isLoading: false));
    }
  }

  Future<void> _onSendOTPToNewEmailEvent(
    SendOTPToNewEmailEvent event,
    Emitter<AuthBlocState> emit,
  ) async {
    emit(state.copyWithoutError(isLoading: true));
    try {
      await provider.changeEmailService.sendOTPToNewEmail(event.newEmail);
      emit(state.copyWithoutError(isLoading: false));
    } catch (error) {
      emit(state.copy(error: error, isLoading: false));
    }
  }

  Future<void> _onVerifyOTPForNewEmailEvent(
    VerifyOTPForNewEmailEvent event,
    Emitter<AuthBlocState> emit,
  ) async {
    emit(state.copyWithoutError(isLoading: true));
    try {
      await provider.changeEmailService.verifyOTPForNewEmail(
        newEmail: event.newEmail,
        otpCode: event.otpCode,
      );
      emit(state.copyWithoutError(isLoading: false));
    } catch (error) {
      emit(state.copy(error: error, isLoading: false));
    }
  }

  Future<void> _onUpdateEmailEvent(
    UpdateEmailEvent event,
    Emitter<AuthBlocState> emit,
  ) async {
    emit(state.copyWithoutError(isLoading: true));
    try {
      await provider.changeEmailService.updateEmail(newEmail: event.newEmail);
      // Reload user to get updated email
      final user = provider.authService.currentUser;
      if (user != null) {
        await user.reload();
      }
      emit(state.copyWithoutError(
        isLoading: false,
        user: provider.authService.currentUser,
      ));
    } catch (error) {
      emit(state.copy(error: error, isLoading: false));
    }
  }
}
