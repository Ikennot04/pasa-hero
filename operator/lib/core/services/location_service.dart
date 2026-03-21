import 'dart:async';

import 'package:flutter/foundation.dart' show TargetPlatform, defaultTargetPlatform, kIsWeb;
import 'package:geolocator/geolocator.dart';
import 'package:permission_handler/permission_handler.dart' as permission_handler;
import 'location_cache_service.dart';

/// Service class for handling location permissions and GPS operations.
/// 
/// This service provides a clean interface for:
/// - Requesting location permissions
/// - Getting current GPS position
/// - Checking permission status
/// - Opening app settings when permission is permanently denied
class LocationService {
  /// Requests location permission from the user.
  /// 
  /// Returns:
  /// - `true` if permission is granted
  /// - `false` if permission is denied
  /// 
  /// Throws [MissingPluginException] if the native plugin is not properly linked.
  Future<bool> requestPermission() async {
    print('🔍 [LocationService] requestPermission() called');
    try {
      // Check if location services are enabled
      print('🔍 [LocationService] Checking if location services are enabled...');
      bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
      print('   📍 Location services enabled: $serviceEnabled');
      
      if (!serviceEnabled) {
        print('   ❌ Location services are DISABLED');
        throw Exception(
          'Location services are disabled. Please enable location services in your device settings.',
        );
      }

      // Check current permission status
      print('🔍 [LocationService] Checking current permission status...');
      LocationPermission permission = await Geolocator.checkPermission();
      print('   📍 Current permission: $permission');
      
      if (permission == LocationPermission.denied) {
        print('   ⚠️ Permission is DENIED, requesting permission...');
        // Request permission
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

      // Permission is granted
      print('   ✅ Permission is GRANTED');
      return true;
    } catch (e) {
      print('   ❌ [LocationService] requestPermission() ERROR: $e');
      print('   📋 Error type: ${e.runtimeType}');
      print('   📋 Error toString: ${e.toString()}');
      
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

  /// Opens the app settings page where the user can manually enable location permission.
  /// 
  /// This is useful when permission is permanently denied.
  Future<void> openAppSettings() async {
    await permission_handler.openAppSettings();
  }

  /// Checks if location services are enabled on the device.
  /// 
  /// Returns `true` if location services are enabled, `false` otherwise.
  /// 
  /// Throws [MissingPluginException] if the native plugin is not properly linked.
  /// This usually means the app needs to be rebuilt after adding the geolocator plugin.
  Future<bool> isLocationServiceEnabled() async {
    print('🔍 [LocationService] isLocationServiceEnabled() called');
    try {
      final result = await Geolocator.isLocationServiceEnabled();
      print('   📍 Location services enabled: $result');
      return result;
    } catch (e) {
      print('   ❌ [LocationService] isLocationServiceEnabled() ERROR: $e');
      print('   📋 Error type: ${e.runtimeType}');
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

  /// Opens device location settings (e.g. to turn on GPS / high accuracy).
  Future<bool> openLocationSettings() => Geolocator.openLocationSettings();

  /// Gets the current permission status without requesting permission.
  /// 
  /// Returns a [LocationPermission] enum value.
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

  /// Checks if location permission is permanently denied.
  /// 
  /// Returns `true` if permission is permanently denied (user selected "Don't ask again").
  Future<bool> isPermissionPermanentlyDenied() async {
    try {
      LocationPermission permission = await Geolocator.checkPermission();
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

  /// Last known (cached) position — instant but may be outdated.
  Future<Position?> getLastKnownPosition() async {
    return Geolocator.getLastKnownPosition();
  }

  /// Gets the current GPS position of the operator.
  /// 
  /// Parameters:
  /// - [preferLowAccuracy]: If true, uses low accuracy only (faster, less battery). Default: false.
  /// - [useCachedPosition]: If true, uses cached position if less than 5 minutes old. Default: true.
  /// - [forceRefresh]: If true, ignores cache and fetches fresh location. Default: false.
  /// 
  /// Throws an exception if:
  /// - Location services are disabled
  /// - Permission is denied
  /// - GPS timeout occurs
  /// - Native plugin is not properly linked
  /// 
  /// Returns a [Position] object with latitude and longitude.
  Future<Position> getCurrentPosition({
    bool preferLowAccuracy = false,
    bool useCachedPosition = true,
    bool forceRefresh = false,
  }) async {
    print(
      '🔍 [LocationService] getCurrentPosition(forceRefresh: $forceRefresh, '
      'useCachedPosition: $useCachedPosition, preferLowAccuracy: $preferLowAccuracy)',
    );

    // PRIORITY 0: App-level in-memory cache (1 minute)
    if (!forceRefresh && useCachedPosition) {
      final cachedLocation = LocationCacheService.instance.getValidCachedLocation();
      if (cachedLocation != null) {
        print('📦 [LocationService] Using app-level cached location (<1 minute old)');
        return cachedLocation;
      }
    }

    try {
      // Check if location services are enabled
      print('🔍 [LocationService] Checking if location services are enabled...');
      final serviceEnabled = await Geolocator.isLocationServiceEnabled();
      print('   📍 Location services enabled: $serviceEnabled');

      if (!serviceEnabled) {
        throw Exception(
          'Location services are disabled. Please enable location services in your device settings.',
        );
      }

      // Check permission (and request once if needed)
      print('🔍 [LocationService] Checking permission...');
      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }

      if (permission == LocationPermission.denied || permission == LocationPermission.deniedForever) {
        throw Exception(
          'Location permission is denied. Please grant location permission to use this feature.',
        );
      }

      print('   ✅ Permission granted: $permission');

      final bool isAndroid = !kIsWeb && defaultTargetPlatform == TargetPlatform.android;

      // (Optional) log if precise location is off on Android/iOS
      try {
        final accStatus = await Geolocator.getLocationAccuracy();
        print('   📍 Location accuracy status: $accStatus');
      } catch (_) {}

      // PRIORITY 1: last known position
      Position? lastPosition;
      try {
        lastPosition = await Geolocator.getLastKnownPosition()
            .timeout(const Duration(seconds: 5));
      } catch (_) {}

      if (lastPosition != null) {
        final age = DateTime.now().difference(lastPosition.timestamp);
        print(
          '   📍 Last known position: age=${age.inSeconds}s, accuracy=${lastPosition.accuracy}m',
        );
        final maxReasonableAge = preferLowAccuracy
            ? const Duration(hours: 2)
            : const Duration(minutes: 30);
        if (age <= maxReasonableAge) {
          await LocationCacheService.instance.saveLocation(lastPosition);
          return lastPosition;
        }
      } else {
        print('   ⚠️ No last known position returned by Geolocator');
      }

      // PRIORITY 2: fresh fix (one-shot), with a better order on Android
      final order = isAndroid
          ? <LocationAccuracy>[
              LocationAccuracy.high,
              LocationAccuracy.best,
              LocationAccuracy.medium,
              LocationAccuracy.low,
            ]
          : (preferLowAccuracy
              ? <LocationAccuracy>[
                  LocationAccuracy.low,
                  LocationAccuracy.medium,
                  LocationAccuracy.high,
                  LocationAccuracy.best,
                ]
              : <LocationAccuracy>[
                  LocationAccuracy.medium,
                  LocationAccuracy.high,
                  LocationAccuracy.best,
                  LocationAccuracy.low,
                ]);

      Duration timeLimitFor(LocationAccuracy a) {
        switch (a) {
          case LocationAccuracy.low:
            return const Duration(seconds: 25);
          case LocationAccuracy.reduced:
            return const Duration(seconds: 25);
          case LocationAccuracy.medium:
            return const Duration(seconds: 25);
          case LocationAccuracy.high:
            return const Duration(seconds: 35);
          case LocationAccuracy.best:
          case LocationAccuracy.bestForNavigation:
            return const Duration(seconds: 40);
          case LocationAccuracy.lowest:
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

      // On some devices, Google Play Services / fused location can be unreliable.
      // Prefer legacy LocationManager first; if it fails, try fused as a fallback.
      final passes = isAndroid ? <bool>[true, false] : <bool>[false];

      for (final forceAndroidLocationManager in passes) {
        for (final accuracy in order) {
          print('   🔄 One-shot: $accuracy (forceLM=$forceAndroidLocationManager)...');
          final pos = await tryOnce(
            accuracy: accuracy,
            forceAndroidLocationManager: forceAndroidLocationManager,
          );
          if (pos != null) {
            await LocationCacheService.instance.saveLocation(pos);
            return pos;
          }
        }
      }

      // PRIORITY 3: position stream fallback
      Future<Position?> tryStream({
        required LocationAccuracy accuracy,
        required Duration wait,
      }) async {
        try {
          final locationSettings = isAndroid
              ? AndroidSettings(
                  forceLocationManager: true,
                  accuracy: accuracy,
                  distanceFilter: 0,
                  intervalDuration: const Duration(seconds: 1),
                )
              : LocationSettings(
                  accuracy: accuracy,
                  distanceFilter: 0,
                );

          return await Geolocator.getPositionStream(
            locationSettings: locationSettings,
          ).first.timeout(wait);
        } catch (e) {
          print('   ⚠️ Stream ($accuracy) failed: $e');
          return null;
        }
      }

      final streamOrder = <LocationAccuracy>[
        LocationAccuracy.best,
        LocationAccuracy.high,
        LocationAccuracy.medium,
        LocationAccuracy.low,
      ];

      for (final accuracy in streamOrder) {
        print('   🔄 Stream: $accuracy ...');
        final pos = await tryStream(
          accuracy: accuracy,
          wait: const Duration(seconds: 25),
        );
        if (pos != null) {
          await LocationCacheService.instance.saveLocation(pos);
          return pos;
        }
      }

      // PRIORITY 4: last-known fallback (avoid hard fail)
      if (lastPosition != null) {
        final age = DateTime.now().difference(lastPosition.timestamp);
        const maxStale = Duration(days: 7);
        if (age <= maxStale) {
          print('   ⚠️ Using last-known position as last resort (age=${age.inHours}h)');
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
}
