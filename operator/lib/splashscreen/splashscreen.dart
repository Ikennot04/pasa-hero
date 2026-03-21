import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart';

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

  /// Firebase Auth persists the session on device; after restart we resume here
  /// instead of forcing login. User sees login only after explicit sign-out.
  Future<void> _routeFromAuthState() async {
    await Future.delayed(const Duration(seconds: 1));
    if (!mounted) return;

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
