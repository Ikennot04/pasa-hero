import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:google_maps_flutter_platform_interface/google_maps_flutter_platform_interface.dart';
import 'package:google_maps_flutter_android/google_maps_flutter_android.dart';
import 'firebase_options.dart';
import 'splashscreen/splashscreen.dart';
import 'features/auth/login/login.dart';
import 'features/profile/profile_screen.dart';
import 'features/profile/screen/profile_screen_data.dart';
import 'features/route/route_screen.dart';
import 'features/map/map_screen.dart';
import 'shared/nav_bar.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Use Hybrid Composition so embedded map renders on Android (e.g. in nav bar tabs).
  final platform = GoogleMapsFlutterPlatform.instance;
  if (platform is GoogleMapsFlutterAndroid) {
    platform.useAndroidViewSurface = true;
  }

  bool firebaseInitialized = false;
  String? initError;
  try {
    final options = DefaultFirebaseOptions.currentPlatform;
    await Firebase.initializeApp(options: options);
    // Keep route tables ready for both operator and passenger dynamic route flow.
    await RouteCatalogService.ensureRouteCodeSeededFromRoutes();
    firebaseInitialized = true;
  } on UnsupportedError catch (e) {
    initError = '${e.message}\n\nRun from the operator folder: cd operator && flutter run';
  } catch (e, st) {
    initError = e.toString();
    debugPrint('Firebase.initializeApp failed: $e');
    debugPrint(st.toString());
  }

  runApp(MyApp(
    firebaseInitialized: firebaseInitialized,
    initError: initError,
  ));
}

class MyApp extends StatelessWidget {
  const MyApp({
    super.key,
    this.firebaseInitialized = true,
    this.initError,
  });

  final bool? firebaseInitialized;
  final String? initError;

  @override
  Widget build(BuildContext context) {
    final didInit = firebaseInitialized ?? false;
    if (!didInit || initError != null) {
      return MaterialApp(
        debugShowCheckedModeBanner: false,
        home: _FirebaseErrorScreen(
          errorMessage: initError ?? 'Unknown error',
          onRetry: () => _retryFirebaseInit(context),
          onContinueAnyway: () => _continueWithoutFirebase(context),
        ),
      );
    }

    return MaterialApp(
      title: 'PasaHero Operator',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.blue),
        useMaterial3: true,
      ),
      initialRoute: '/',
      routes: {
        '/': (context) => const SplashScreen(),
        '/login': (context) => const LoginPage(),
        NavBar.routeName: (context) => const NavBar(),
        ProfileScreen.routeName: (context) => const ProfileScreen(),
        RouteScreen.routeName: (context) => const RouteScreen(),
        MapScreen.routeName: (context) => const MapScreen(),
      },
    );
  }

  static void _retryFirebaseInit(BuildContext context) {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Stop the app (Ctrl+C or Stop in IDE), then run: cd operator && flutter run'),
        duration: Duration(seconds: 5),
      ),
    );
  }

  static void _continueWithoutFirebase(BuildContext context) {
    // Navigate to the main app without Firebase (login will show "not initialized" if they try auth)
    final navigator = Navigator.of(context);
    navigator.pushReplacement(
      MaterialPageRoute<void>(
        builder: (_) => const MaterialApp(
          debugShowCheckedModeBanner: false,
          title: 'PasaHero Operator',
          home: _OperatorAppWithoutFirebase(),
        ),
      ),
    );
  }
}

/// Temporary app shell when user chooses "Continue anyway" (no Firebase).
class _OperatorAppWithoutFirebase extends StatelessWidget {
  const _OperatorAppWithoutFirebase();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.warning_amber_rounded, size: 48, color: Colors.orange),
              const SizedBox(height: 16),
              const Text(
                'Running without Firebase',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 8),
              const Text(
                'Login and Firestore will not work until Firebase is fixed. Run the app from the operator folder: cd operator && flutter run',
                style: TextStyle(fontSize: 14),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Error screen when Firebase fails to initialize.
class _FirebaseErrorScreen extends StatelessWidget {
  const _FirebaseErrorScreen({
    required this.errorMessage,
    required this.onRetry,
    required this.onContinueAnyway,
  });

  final String errorMessage;
  final VoidCallback onRetry;
  final VoidCallback onContinueAnyway;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const SizedBox(height: 24),
              const Icon(Icons.error_outline, size: 64, color: Colors.red),
              const SizedBox(height: 16),
              const Text(
                'Firebase could not start',
                style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 12),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.red.shade50,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: SelectableText(
                  errorMessage,
                  style: const TextStyle(fontSize: 13),
                ),
              ),
              const SizedBox(height: 24),
              const Text(
                'Operator app must be run from its folder.',
                style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 8),
              const Text(
                'In a terminal: cd operator then flutter run',
                style: TextStyle(fontSize: 13, color: Colors.grey),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 8),
              const Text(
                'Also ensure android/app/google-services.json exists and package name is com.example.admin.',
                style: TextStyle(fontSize: 12, color: Colors.grey),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 32),
              ElevatedButton.icon(
                onPressed: onRetry,
                icon: const Icon(Icons.refresh),
                label: const Text('Retry'),
                style: ElevatedButton.styleFrom(
                  minimumSize: const Size(double.infinity, 48),
                ),
              ),
              const SizedBox(height: 12),
              TextButton.icon(
                onPressed: onContinueAnyway,
                icon: const Icon(Icons.arrow_forward),
                label: const Text('Continue without Firebase'),
              ),
              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }
}
