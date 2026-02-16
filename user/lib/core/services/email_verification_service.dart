import 'package:firebase_auth/firebase_auth.dart';

class EmailVerificationService {
  final FirebaseAuth _auth = FirebaseAuth.instance;

  // Send email verification
  Future<void> sendEmailVerification() async {
    try {
      final user = _auth.currentUser;
      if (user == null) {
        throw Exception('No user is currently signed in.');
      }
      if (user.emailVerified) {
        throw Exception('Email is already verified.');
      }
      await user.sendEmailVerification();
    } on FirebaseAuthException catch (e) {
      throw _handleAuthException(e);
    } catch (e) {
      if (e.toString().contains('already verified')) {
        rethrow;
      }
      throw Exception('Failed to send email verification: $e');
    }
  }

  // Check if email is verified
  bool isEmailVerified() {
    final user = _auth.currentUser;
    return user?.emailVerified ?? false;
  }

  // Reload user to get latest email verification status
  Future<void> reloadUser() async {
    try {
      final user = _auth.currentUser;
      if (user != null) {
        await user.reload();
      }
    } catch (e) {
      throw Exception('Failed to reload user: $e');
    }
  }

  // Handle Firebase Auth exceptions and return user-friendly messages
  Exception _handleAuthException(FirebaseAuthException e) {
    switch (e.code) {
      case 'weak-password':
        return Exception('The password provided is too weak.');
      case 'email-already-in-use':
        return Exception('Account is already registered');
      case 'user-not-found':
        return Exception('No user found for that email.');
      case 'wrong-password':
        return Exception('Wrong password provided.');
      case 'invalid-email':
        return Exception('The email address is invalid.');
      case 'user-disabled':
        return Exception('This user account has been disabled.');
      case 'too-many-requests':
        return Exception('Too many requests. Please try again later.');
      case 'operation-not-allowed':
        return Exception('This operation is not allowed.');
      default:
        return Exception('Authentication failed: ${e.message}');
    }
  }
}
