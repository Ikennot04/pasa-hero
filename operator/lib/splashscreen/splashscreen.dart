import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart';

import '../core/services/operator_session_service.dart';
import '../shared/nav_bar.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> {
  @override
  void initState() {
    super.initState();
    _routeFromAuthState();
  }

  /// Resume home when a valid Mongo/API JWT session exists, or legacy Firebase Auth.
  Future<void> _routeFromAuthState() async {
    await Future.delayed(const Duration(seconds: 1));
    if (!mounted) return;

    await OperatorSessionService.instance.loadFromPrefs();

    if (OperatorSessionService.instance.hasValidJwt) {
      var user = FirebaseAuth.instance.currentUser;
      if (user != null && user.isAnonymous) {
        await FirebaseAuth.instance.signOut();
        user = null;
      }
      if (user != null) {
        try {
          await OperatorSessionService.instance.mergeMongoProfileIntoFirestoreUsersCollection();
        } catch (_) {}
        if (!mounted) return;
        Navigator.pushReplacementNamed(context, NavBar.routeName);
        return;
      }
      // Valid Mongo JWT but no persisted Firebase email session — operator must sign in again.
      if (mounted) {
        Navigator.pushReplacementNamed(context, '/login');
      }
      return;
    }

    final staleAnon = FirebaseAuth.instance.currentUser;
    if (staleAnon != null && staleAnon.isAnonymous) {
      await FirebaseAuth.instance.signOut();
    }

    User? user;
    try {
      user = await FirebaseAuth.instance
          .authStateChanges()
          .first
          .timeout(const Duration(seconds: 5));
    } catch (_) {
      user = FirebaseAuth.instance.currentUser;
    }

    if (!mounted) return;
    if (user != null) {
      Navigator.pushReplacementNamed(context, NavBar.routeName);
    } else {
      Navigator.pushReplacementNamed(context, '/login');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: Center(
        child: Image.asset(
          'assets/images/logo1.png',
          height: 120,
          fit: BoxFit.contain,
        ),
      ),
    );
  }
}
