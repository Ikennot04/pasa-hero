import 'package:app_settings/app_settings.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter/foundation.dart'
    show defaultTargetPlatform, kIsWeb, TargetPlatform;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart' show SystemNavigator;

import '../services/location_service.dart';

/// When device location services (GPS) are off, blocks the app with a dialog.
/// "Open location settings" uses the system Location settings screen ([AppSettings]).
class LocationServicesGate extends StatefulWidget {
  const LocationServicesGate({
    super.key,
    required this.child,
    this.productName = 'PasaHero',
  });

  final Widget child;
  final String productName;

  @override
  State<LocationServicesGate> createState() => _LocationServicesGateState();
}

class _LocationServicesGateState extends State<LocationServicesGate>
    with WidgetsBindingObserver {
  final LocationService _locationService = LocationService();
  BuildContext? _blockerDialogContext;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    WidgetsBinding.instance.addPostFrameCallback((_) => _syncGate());
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      _syncGate();
    }
  }

  Future<void> _syncGate() async {
    if (!mounted || kIsWeb) return;

    final bool enabled;
    try {
      enabled = await _locationService.isLocationServiceEnabled();
    } catch (_) {
      return;
    }
    if (!mounted) return;

    if (enabled) {
      final d = _blockerDialogContext;
      if (d != null && d.mounted) {
        Navigator.of(d, rootNavigator: true).pop();
      }
      _blockerDialogContext = null;
      return;
    }

    if (_blockerDialogContext != null) return;

    final message =
        'Turn on location services on this device to use ${widget.productName}.';
    final isIos = !kIsWeb && defaultTargetPlatform == TargetPlatform.iOS;

    if (isIos) {
      await showCupertinoDialog<void>(
        context: context,
        barrierDismissible: false,
        builder: (ctx) {
          _blockerDialogContext = ctx;
          return CupertinoAlertDialog(
            title: const Text('Location is off'),
            content: Text(message),
            actions: [
              CupertinoDialogAction(
                onPressed: () {
                  SystemNavigator.pop();
                },
                child: const Text('Cancel'),
              ),
              CupertinoDialogAction(
                isDefaultAction: true,
                onPressed: () {
                  AppSettings.openAppSettings(type: AppSettingsType.location);
                },
                child: const Text('Open location settings'),
              ),
            ],
          );
        },
      );
    } else {
      await showDialog<void>(
        context: context,
        barrierDismissible: false,
        builder: (ctx) {
          _blockerDialogContext = ctx;
          return AlertDialog(
            title: const Text('Location is off'),
            content: Text(message),
            actions: [
              TextButton(
                onPressed: () {
                  SystemNavigator.pop();
                },
                child: const Text('Cancel'),
              ),
              FilledButton(
                onPressed: () {
                  AppSettings.openAppSettings(type: AppSettingsType.location);
                },
                child: const Text('Open location settings'),
              ),
            ],
          );
        },
      );
    }
    _blockerDialogContext = null;
  }

  @override
  Widget build(BuildContext context) => widget.child;
}
