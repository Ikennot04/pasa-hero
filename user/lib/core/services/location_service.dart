import 'dart:async';

import 'package:flutter/foundation.dart' show TargetPlatform, defaultTargetPlatform, kIsWeb;
import 'package:geolocator/geolocator.dart';
import 'package:permission_handler/permission_handler.dart' as permission_handler;

import 'location_cache_service.dart';

/// Service class for handling location permissions and GPS operations.
class LocationService {
  static bool _plausiblePosition(Position? p) {
    if (p == null) return false;
    final lat = p.latitude;
    final lng = p.longitude;
    if (lat.isNaN || lng.isNaN || !lat.isFinite || !lng.isFinite) return false;
    if (lat.abs() < 1e-7 && lng.abs() < 1e-7) return false;
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return false;
    return true;
  }

  /// Requests location permission from the user.
  ///
  /// Does **not** bail out when location services are off — users often grant
  /// permission first, then turn on GPS; last-known can still be used.
  Future<bool> requestPermission() async {
    print('🔍 [LocationService] requestPermission() called');
    try {
      LocationPermission permission = await Geolocator.checkPermission();
      print('   📍 Current permission: $permission');

      if (permission == LocationPermission.denied) {
        print('   ⚠️ Permission is DENIED, requesting permission...');
        permission = await Geolocator.requestPermission();
        print('   📍 Permission after request: $permission');
        if (permission == LocationPermission.denied) {
          print('   ❌ Permission still DENIED after request');
          return false;
        }
      }

      if (permission == LocationPermission.deniedForever) {
        print('   ❌ Permission is PERMANENTLY DENIED');
        return false;
      }

      print('   ✅ Permission is GRANTED');
      return true;
    } catch (e) {
      print('   ❌ [LocationService] requestPermission() ERROR: $e');
      if (e.toString().contains('MissingPluginException')) {
        throw Exception(
          'Geolocator plugin not found. Please rebuild the app:\n'
          '1. Stop the app completely\n'
          '2. Run: flutter clean\n'
          '3. Run: flutter pub get\n'
          '4. Rebuild and run the app (not hot reload)',
        );
      }
      print('   ⚠️ [LocationService] requestPermission treating error as denied: $e');
      return false;
    }
  }

  /// Opens system location settings (toggle GPS / high accuracy).
  Future<bool> openLocationSettings() => Geolocator.openLocationSettings();

  /// Rider-focused: permission + last-known (even if OS says services off) + network-first
  /// Android ladder + stream fallbacks + stale last-known up to [maxStaleLastKnownAge].
  Future<Position> getCurrentPosition({
    bool preferLowAccuracy = false,
    bool useCachedPosition = true,
    bool forceRefresh = false,
    Duration maxStaleLastKnownAge = const Duration(days: 7),
  }) async {
    print(
      '🔍 [LocationService] getCurrentPosition(forceRefresh: $forceRefresh, '
      'useCachedPosition: $useCachedPosition, preferLowAccuracy: $preferLowAccuracy)',
    );

    if (!forceRefresh && useCachedPosition) {
      final cached = LocationCacheService.instance.getValidCachedLocation();
      if (cached != null) {
        print('📦 [LocationService] Using app-level cached location (<1 minute old)');
        return cached;
      }
    }

    try {
      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }
      if (permission == LocationPermission.denied ||
          permission == LocationPermission.deniedForever) {
        throw Exception(
          'Location permission is denied. Please grant location permission to use this feature.',
        );
      }

      final bool isAndroid = !kIsWeb && defaultTargetPlatform == TargetPlatform.android;

      try {
        final accStatus = await Geolocator.getLocationAccuracy();
        print('   📍 Location accuracy status: $accStatus');
      } catch (_) {}

      // Last-known BEFORE isLocationServiceEnabled — OS flag can be wrong; cache still helps.
      Position? lastPosition;
      if (!forceRefresh) {
        try {
          lastPosition = await Geolocator.getLastKnownPosition()
              .timeout(const Duration(seconds: 10));
        } catch (_) {}

        if (_plausiblePosition(lastPosition)) {
          final age = DateTime.now().difference(lastPosition!.timestamp);
          print(
            '   📍 Last known: age=${age.inMinutes}m, accuracy=${lastPosition.accuracy}m',
          );
          if (age <= maxStaleLastKnownAge) {
            await LocationCacheService.instance.saveLocation(lastPosition);
            return lastPosition;
          }
        } else {
          print('   ⚠️ No plausible last known position from Geolocator');
        }
      } else {
        print('   🔄 forceRefresh: skipping last-known shortcut');
        try {
          lastPosition = await Geolocator.getLastKnownPosition()
              .timeout(const Duration(seconds: 10));
        } catch (_) {}
      }

      final serviceEnabled = await Geolocator.isLocationServiceEnabled();
      print('   📍 Location services enabled (OS): $serviceEnabled');

      if (!serviceEnabled) {
        if (_plausiblePosition(lastPosition)) {
          final age = DateTime.now().difference(lastPosition!.timestamp);
          if (age <= maxStaleLastKnownAge) {
            print('   ⚠️ Services off — returning stale last-known (${age.inHours}h old)');
            await LocationCacheService.instance.saveLocation(lastPosition);
            return lastPosition;
          }
        }
        throw Exception(
          'Location services are disabled. Please enable location in device settings.',
        );
      }

      // Android: network / fused fixes first (passenger app); then GPS-heavy modes.
      final order = isAndroid
          ? <LocationAccuracy>[
              LocationAccuracy.low,
              LocationAccuracy.lowest,
              LocationAccuracy.reduced,
              LocationAccuracy.medium,
              LocationAccuracy.high,
              LocationAccuracy.best,
              LocationAccuracy.bestForNavigation,
            ]
          : (preferLowAccuracy
              ? <LocationAccuracy>[
                  LocationAccuracy.low,
                  LocationAccuracy.medium,
                  LocationAccuracy.high,
                  LocationAccuracy.best,
                ]
              : <LocationAccuracy>[
                  LocationAccuracy.high,
                  LocationAccuracy.medium,
                  LocationAccuracy.best,
                  LocationAccuracy.low,
                ]);

      Duration timeLimitFor(LocationAccuracy a) {
        switch (a) {
          case LocationAccuracy.low:
          case LocationAccuracy.lowest:
          case LocationAccuracy.reduced:
            return const Duration(seconds: 25);
          case LocationAccuracy.medium:
            return const Duration(seconds: 20);
          case LocationAccuracy.high:
            return const Duration(seconds: 20);
          case LocationAccuracy.best:
          case LocationAccuracy.bestForNavigation:
            return const Duration(seconds: 25);
        }
      }

      Future<Position?> tryOnce({
        required LocationAccuracy accuracy,
        required bool forceAndroidLocationManager,
      }) async {
        try {
          return await Geolocator.getCurrentPosition(
            desiredAccuracy: accuracy,
            timeLimit: timeLimitFor(accuracy),
            forceAndroidLocationManager: forceAndroidLocationManager,
          );
        } on TimeoutException {
          return null;
        } catch (e) {
          print('   ⚠️ One-shot ($accuracy) failed: $e');
          return null;
        }
      }

      final passes = isAndroid ? <bool>[false, true] : <bool>[false];

      for (final forceAndroidLocationManager in passes) {
        for (final accuracy in order) {
          print('   🔄 One-shot: $accuracy (forceLM=$forceAndroidLocationManager)...');
          final pos = await tryOnce(
            accuracy: accuracy,
            forceAndroidLocationManager: forceAndroidLocationManager,
          );
          if (pos != null && _plausiblePosition(pos)) {
            await LocationCacheService.instance.saveLocation(pos);
            return pos;
          }
        }
      }

      Future<Position?> tryStream({
        required LocationAccuracy accuracy,
        required Duration wait,
        required bool forceLocationManager,
      }) async {
        StreamSubscription<Position>? sub;
        try {
          final locationSettings = isAndroid
              ? AndroidSettings(
                  forceLocationManager: forceLocationManager,
                  accuracy: accuracy,
                  distanceFilter: 0,
                  intervalDuration: const Duration(milliseconds: 800),
                )
              : LocationSettings(
                  accuracy: accuracy,
                  distanceFilter: 0,
                );

          final stream = Geolocator.getPositionStream(locationSettings: locationSettings);
          final completer = Completer<Position>();
          sub = stream.listen(
            (p) {
              if (_plausiblePosition(p) && !completer.isCompleted) {
                completer.complete(p);
              }
            },
            onError: (e, _) {
              if (!completer.isCompleted) completer.completeError(e);
            },
          );
          return await completer.future.timeout(wait);
        } on TimeoutException {
          return null;
        } catch (e) {
          print('   ⚠️ Stream ($accuracy, forceLM=$forceLocationManager) failed: $e');
          return null;
        } finally {
          await sub?.cancel();
        }
      }

      const streamOrder = <LocationAccuracy>[
        LocationAccuracy.low,
        LocationAccuracy.medium,
        LocationAccuracy.high,
        LocationAccuracy.best,
        LocationAccuracy.bestForNavigation,
      ];

      final streamPasses = isAndroid ? <bool>[false, true] : <bool>[false];
      const streamWait = Duration(seconds: 28);

      for (final accuracy in streamOrder) {
        for (final forceLM in streamPasses) {
          print('   🔄 Stream: $accuracy (forceLM=$forceLM)...');
          final pos = await tryStream(
            accuracy: accuracy,
            wait: streamWait,
            forceLocationManager: forceLM,
          );
          if (pos != null && _plausiblePosition(pos)) {
            await LocationCacheService.instance.saveLocation(pos);
            return pos;
          }
        }
      }

      if (_plausiblePosition(lastPosition)) {
        final age = DateTime.now().difference(lastPosition!.timestamp);
        if (age <= maxStaleLastKnownAge) {
          print('   ⚠️ Using last-known after failed fixes (age=${age.inHours}h)');
          await LocationCacheService.instance.saveLocation(lastPosition);
          return lastPosition;
        }
      }

      throw TimeoutException(
        'GPS timeout: no location fix after one-shot + stream + fallback',
      );
    } catch (e) {
      print('   ❌ [LocationService] getCurrentPosition() ERROR: $e');
      if (e.toString().contains('MissingPluginException')) {
        throw Exception(
          'Geolocator plugin not found. Please rebuild the app:\n'
          '1. Stop the app completely\n'
          '2. Run: flutter clean\n'
          '3. Run: flutter pub get\n'
          '4. Rebuild and run the app (not hot reload)',
        );
      }
      rethrow;
    }
  }

  Future<bool> isPermissionPermanentlyDenied() async {
    try {
      final permission = await Geolocator.checkPermission();
      return permission == LocationPermission.deniedForever;
    } catch (e) {
      if (e.toString().contains('MissingPluginException')) {
        throw Exception(
          'Geolocator plugin not found. Please rebuild the app:\n'
          '1. Stop the app completely\n'
          '2. Run: flutter clean\n'
          '3. Run: flutter pub get\n'
          '4. Rebuild and run the app (not hot reload)',
        );
      }
      rethrow;
    }
  }

  Future<void> openAppSettings() async {
    await permission_handler.openAppSettings();
  }

  Future<bool> isLocationServiceEnabled() async {
    print('🔍 [LocationService] isLocationServiceEnabled() called');
    try {
      final result = await Geolocator.isLocationServiceEnabled();
      print('   📍 Location services enabled: $result');
      return result;
    } catch (e) {
      print('   ❌ [LocationService] isLocationServiceEnabled() ERROR: $e');
      if (e.toString().contains('MissingPluginException')) {
        throw Exception(
          'Geolocator plugin not found. Please rebuild the app:\n'
          '1. Stop the app completely\n'
          '2. Run: flutter clean\n'
          '3. Run: flutter pub get\n'
          '4. Rebuild and run the app (not hot reload)',
        );
      }
      rethrow;
    }
  }

  Future<LocationPermission> getPermissionStatus() async {
    try {
      return await Geolocator.checkPermission();
    } catch (e) {
      if (e.toString().contains('MissingPluginException')) {
        throw Exception(
          'Geolocator plugin not found. Please rebuild the app:\n'
          '1. Stop the app completely\n'
          '2. Run: flutter clean\n'
          '3. Run: flutter pub get\n'
          '4. Rebuild and run the app (not hot reload)',
        );
      }
      rethrow;
    }
  }
}
