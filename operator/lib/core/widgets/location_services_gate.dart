import 'package:flutter/foundation.dart'
    show defaultTargetPlatform, kIsWeb, TargetPlatform;
import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';

import '../services/location_service.dart';

bool _isMobilePlatform() {
  return !kIsWeb &&
      (defaultTargetPlatform == TargetPlatform.android ||
          defaultTargetPlatform == TargetPlatform.iOS);
}

enum _LocationGateCause { none, permission, locationServices }

/// On Android/iOS: requests location via the **system** permission dialog on first check,
/// then blocks with a full-screen screen if permission is denied or device location is off.
/// [Open Settings] opens app settings (permission) or system location settings (GPS off).
/// Does not exit the app.
class LocationServicesGate extends StatefulWidget {
  const LocationServicesGate({
    super.key,
    required this.child,
  });

  final Widget child;

  @override
  State<LocationServicesGate> createState() => _LocationServicesGateState();
}

class _LocationServicesGateState extends State<LocationServicesGate>
    with WidgetsBindingObserver {
  final LocationService _locationService = LocationService();

  bool _checking = true;
  _LocationGateCause _cause = _LocationGateCause.none;
  bool _permissionPermanentlyDenied = false;

  /// Single automatic system prompt per app session (launch + warm start).
  bool _didAutoRequest = false;

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
    if (!mounted) return;

    if (kIsWeb || !_isMobilePlatform()) {
      if (mounted) {
        setState(() {
          _checking = false;
          _cause = _LocationGateCause.none;
          _permissionPermanentlyDenied = false;
        });
      }
      return;
    }

    try {
      var permission = await Geolocator.checkPermission();

      final needsInitialPrompt = permission == LocationPermission.denied ||
          permission == LocationPermission.unableToDetermine;
      if (needsInitialPrompt && !_didAutoRequest) {
        _didAutoRequest = true;
        permission = await Geolocator.requestPermission();
      }

      if (permission == LocationPermission.denied ||
          permission == LocationPermission.deniedForever) {
        if (mounted) {
          setState(() {
            _checking = false;
            _cause = _LocationGateCause.permission;
            _permissionPermanentlyDenied =
                permission == LocationPermission.deniedForever;
          });
        }
        return;
      }

      final servicesOn = await _locationService.isLocationServiceEnabled();
      if (!servicesOn) {
        if (mounted) {
          setState(() {
            _checking = false;
            _cause = _LocationGateCause.locationServices;
            _permissionPermanentlyDenied = false;
          });
        }
        return;
      }

      if (mounted) {
        setState(() {
          _checking = false;
          _cause = _LocationGateCause.none;
          _permissionPermanentlyDenied = false;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _checking = false;
          _cause = _LocationGateCause.permission;
          _permissionPermanentlyDenied = false;
        });
      }
    }
  }

  Future<void> _onRetry() async {
    if (!mounted || kIsWeb || !_isMobilePlatform()) return;
    setState(() => _checking = true);
    try {
      if (_cause == _LocationGateCause.permission) {
        await Geolocator.requestPermission();
      }
      await _syncGate();
    } catch (_) {
      if (mounted) {
        setState(() => _checking = false);
      }
    }
  }

  Future<void> _onOpenSettings() async {
    if (_cause == _LocationGateCause.permission) {
      await _locationService.openAppSettings();
    } else {
      await _locationService.openLocationSettings();
    }
  }

  @override
  Widget build(BuildContext context) {
    if (kIsWeb || !_isMobilePlatform()) {
      return widget.child;
    }

    return Stack(
      fit: StackFit.expand,
      children: [
        widget.child,
        if (_checking)
          const ColoredBox(
            color: Colors.white,
            child: Center(child: CircularProgressIndicator()),
          ),
        if (!_checking && _cause != _LocationGateCause.none)
          _LocationRequiredScreen(
            permanentlyDenied: _permissionPermanentlyDenied,
            settingsPrimary: _permissionPermanentlyDenied ||
                _cause == _LocationGateCause.permission,
            onOpenSettings: _onOpenSettings,
            onRetry: _onRetry,
          ),
      ],
    );
  }
}

class _LocationRequiredScreen extends StatelessWidget {
  const _LocationRequiredScreen({
    required this.permanentlyDenied,
    required this.settingsPrimary,
    required this.onOpenSettings,
    required this.onRetry,
  });

  final bool permanentlyDenied;
  final bool settingsPrimary;
  final Future<void> Function() onOpenSettings;
  final Future<void> Function() onRetry;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final cs = theme.colorScheme;

    final settingsButton = FilledButton(
      onPressed: () => onOpenSettings(),
      style: FilledButton.styleFrom(
        minimumSize: const Size(double.infinity, 48),
        padding: const EdgeInsets.symmetric(horizontal: 24),
      ),
      child: const Text('Open Settings'),
    );

    final retryButton = OutlinedButton(
      onPressed: () => onRetry(),
      style: OutlinedButton.styleFrom(
        minimumSize: const Size(double.infinity, 48),
        padding: const EdgeInsets.symmetric(horizontal: 24),
      ),
      child: const Text('Retry'),
    );

    return Material(
      color: cs.surface,
      child: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 28),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Icon(Icons.location_off_outlined, size: 56, color: cs.primary),
              const SizedBox(height: 28),
              Text(
                'Location is required to use this app.',
                textAlign: TextAlign.center,
                style: theme.textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.w600,
                  height: 1.35,
                ),
              ),
              if (permanentlyDenied) ...[
                const SizedBox(height: 12),
                Text(
                  'Permission was denied. Open Settings to enable location for this app.',
                  textAlign: TextAlign.center,
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: cs.onSurfaceVariant,
                    height: 1.4,
                  ),
                ),
              ],
              const SizedBox(height: 40),
              if (settingsPrimary) ...[
                settingsButton,
                const SizedBox(height: 12),
                retryButton,
              ] else ...[
                retryButton,
                const SizedBox(height: 12),
                settingsButton,
              ],
            ],
          ),
        ),
      ),
    );
  }
}
