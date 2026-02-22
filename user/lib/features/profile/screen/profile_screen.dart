import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../auth/auth_bloc/auth_bloc_bloc.dart';
import '../../auth/auth_bloc/auth_bloc_provider.dart';
import '../../auth/auth_bloc/auth_bloc_event.dart';
import '../../auth/auth_bloc/auth_bloc_state.dart';
import '../../../core/services/auth_service.dart';
import '../../../core/services/otp_verification_service.dart';
import '../../../core/services/change_password_service.dart';
import '../../../core/services/email_verification_service.dart';
import '../../../core/services/change_email_service.dart';
import '../../../core/themes/validation_theme.dart';
import '../../../splashscreen/splash_screen.dart';
import '../module/change_email.dart';
import '../module/profile_information.dart';
import '../module/change_password.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});
  
  @override
  Widget build(BuildContext context) {
    // Create a bloc provider for the profile screen
    return BlocProvider(
      create: (context) => AuthBlocBloc(
        provider: AuthBlocProvider(
          authService: AuthService(),
          otpVerificationService: OTPVerificationService(),
          changePasswordService: ChangePasswordService(),
          emailVerificationService: EmailVerificationService(),
          changeEmailService: ChangeEmailService(),
        ),
      )..add(CheckAuthStateEvent()), // Check current auth state
      child: BlocConsumer<AuthBlocBloc, AuthBlocState>(
        listener: (context, state) {
          // When user is logged out, navigate to splash screen
          if (!state.isAuthenticated && !state.isLoading && state.user == null) {
            // Navigate to splash screen and clear navigation stack
            WidgetsBinding.instance.addPostFrameCallback((_) {
              if (context.mounted) {
                Navigator.of(context).pushAndRemoveUntil(
                  MaterialPageRoute(
                    builder: (context) => const SplashScreen(),
                  ),
                  (route) => false,
                );
              }
            });
          }
          
          // Show error if logout fails
          if (state.error != null) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(
                  state.error.toString().replaceAll('Exception: ', ''),
                ),
                backgroundColor: ValidationTheme.errorRed,
              ),
            );
          }
        },
        builder: (context, state) {
          return Scaffold(
            body: Container(
              width: double.infinity,
              height: double.infinity,
              decoration: ValidationTheme.gradientDecoration,
              child: SafeArea(
                child: SingleChildScrollView(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Header with Profile title
                      const Padding(
                        padding: EdgeInsets.only(top: 20, bottom: 20),
                        child: Center(
                          child: Text(
                            'Profile',
                            style: TextStyle(
                              fontSize: 28,
                              fontWeight: FontWeight.bold,
                              color: ValidationTheme.textLight,
                            ),
                          ),
                        ),
                      ),
                      
                      // User Info Card
                      if (state.user != null) ...[
                        Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 16.0),
                          child: Card(
                            elevation: 0,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(16),
                            ),
                            color: ValidationTheme.backgroundWhite,
                            child: Padding(
                              padding: const EdgeInsets.all(16.0),
                              child: Row(
                                children: [
                                  // Profile Picture
                                  CircleAvatar(
                                    radius: 35,
                                    backgroundColor: ValidationTheme.primaryBlue,
                                    child: Text(
                                      state.user!.displayName
                                              ?.substring(0, 1)
                                              .toUpperCase() ??
                                          state.user!.email
                                              ?.substring(0, 1)
                                              .toUpperCase() ??
                                          'U',
                                      style: const TextStyle(
                                        color: ValidationTheme.textLight,
                                        fontSize: 28,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                  ),
                                  const SizedBox(width: 16),
                                  // User Name and Email
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          state.user!.displayName ?? 'User',
                                          style: const TextStyle(
                                            fontSize: 18,
                                            fontWeight: FontWeight.bold,
                                            color: ValidationTheme.textDark,
                                          ),
                                        ),
                                        const SizedBox(height: 4),
                                        Text(
                                          state.user!.email ?? '',
                                          style: const TextStyle(
                                            fontSize: 14,
                                            color: ValidationTheme.textSecondary,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(height: 24),
                      ],
                      
                      // Settings Section
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 16.0),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'Settings',
                              style: TextStyle(
                                fontSize: 20,
                                fontWeight: FontWeight.bold,
                                color: ValidationTheme.textDark,
                              ),
                            ),
                            const SizedBox(height: 12),
                            
                            // Settings Card
                            Card(
                              elevation: 0,
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(16),
                              ),
                              color: ValidationTheme.backgroundWhite,
                              child: Column(
                                children: [
                                  // Profile Information
                                  ListTile(
                                    leading: const Icon(
                                      Icons.person_outline,
                                      color: ValidationTheme.textSecondary,
                                    ),
                                    title: const Text(
                                      'Profile Information',
                                      style: TextStyle(
                                        fontSize: 16,
                                        fontWeight: FontWeight.w500,
                                        color: ValidationTheme.textDark,
                                      ),
                                    ),
                                    trailing: const Icon(
                                      Icons.chevron_right,
                                      color: ValidationTheme.textSecondary,
                                    ),
                                    onTap: () {
                                      ProfileInformationModule.navigateToProfileInformation(context);
                                    },
                                  ),
                                  const Divider(height: 1),
                                  
                                  // Change Email Address
                                  ListTile(
                                    leading: const Icon(
                                      Icons.email_outlined,
                                      color: ValidationTheme.textSecondary,
                                    ),
                                    title: const Text(
                                      'Change Email Address',
                                      style: TextStyle(
                                        fontSize: 16,
                                        fontWeight: FontWeight.w500,
                                        color: ValidationTheme.textDark,
                                      ),
                                    ),
                                    trailing: const Icon(
                                      Icons.chevron_right,
                                      color: ValidationTheme.textSecondary,
                                    ),
                                    onTap: () {
                                      ChangeEmailModule.navigateToChangeEmail(context);
                                    },
                                  ),
                                  const Divider(height: 1),
                                  
                                  // Change Password
                                  ListTile(
                                    leading: const Icon(
                                      Icons.lock_outline,
                                      color: ValidationTheme.textSecondary,
                                    ),
                                    title: const Text(
                                      'Change Password',
                                      style: TextStyle(
                                        fontSize: 16,
                                        fontWeight: FontWeight.w500,
                                        color: ValidationTheme.textDark,
                                      ),
                                    ),
                                    trailing: const Icon(
                                      Icons.chevron_right,
                                      color: ValidationTheme.textSecondary,
                                    ),
                                    onTap: () {
                                      ChangePasswordModule.navigateToChangePassword(context);
                                    },
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(height: 16),
                            
                            // Log Out Card
                            Card(
                              elevation: 0,
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(16),
                              ),
                              color: ValidationTheme.backgroundWhite,
                              child: ListTile(
                                leading: const Icon(
                                  Icons.logout,
                                  color: ValidationTheme.errorRed,
                                ),
                                title: const Text(
                                  'Log Out',
                                  style: TextStyle(
                                    fontSize: 16,
                                    fontWeight: FontWeight.w500,
                                    color: ValidationTheme.errorRed,
                                  ),
                                ),
                                trailing: state.isLoading
                                    ? const SizedBox(
                                        width: 20,
                                        height: 20,
                                        child: CircularProgressIndicator(
                                          strokeWidth: 2,
                                          color: ValidationTheme.errorRed,
                                        ),
                                      )
                                    : const Icon(
                                        Icons.chevron_right,
                                        color: ValidationTheme.textSecondary,
                                      ),
                                onTap: state.isLoading
                                    ? null
                                    : () {
                                        // Show confirmation dialog
                                        showDialog(
                                          context: context,
                                          builder: (BuildContext dialogContext) {
                                            return AlertDialog(
                                              shape: RoundedRectangleBorder(
                                                borderRadius: BorderRadius.circular(16),
                                              ),
                                              title: const Text(
                                                'Logout',
                                                style: TextStyle(
                                                  fontWeight: FontWeight.bold,
                                                ),
                                              ),
                                              content: const Text(
                                                'Are you sure you want to logout?',
                                              ),
                                              actions: [
                                                TextButton(
                                                  onPressed: () {
                                                    Navigator.of(dialogContext).pop();
                                                  },
                                                  child: const Text('Cancel'),
                                                ),
                                                TextButton(
                                                  onPressed: () async {
                                                    // Close dialog first
                                                    Navigator.of(dialogContext).pop();
                                                    
                                                    try {
                                                      // Sign out directly from Firebase Auth
                                                      final authService = AuthService();
                                                      await authService.signOut();
                                                      
                                                      // Use root navigator to navigate to splash screen
                                                      if (context.mounted) {
                                                        final rootNavigator = Navigator.of(context, rootNavigator: true);
                                                        rootNavigator.pushAndRemoveUntil(
                                                          MaterialPageRoute(
                                                            builder: (context) => const SplashScreen(),
                                                          ),
                                                          (route) => false,
                                                        );
                                                      }
                                                    } catch (e) {
                                                      // Show error if logout fails
                                                      if (context.mounted) {
                                                        ScaffoldMessenger.of(context).showSnackBar(
                                                          SnackBar(
                                                            content: Text('Logout failed: ${e.toString()}'),
                                                            backgroundColor: ValidationTheme.errorRed,
                                                          ),
                                                        );
                                                      }
                                                    }
                                                  },
                                                  style: TextButton.styleFrom(
                                                    foregroundColor: ValidationTheme.errorRed,
                                                  ),
                                                  child: const Text('Logout'),
                                                ),
                                              ],
                                            );
                                          },
                                        );
                                      },
                              ),
                            ),
                            const SizedBox(height: 24),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}
