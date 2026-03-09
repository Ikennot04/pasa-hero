import 'dart:async';
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

  /// Gets the current GPS position of the user.
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
    print('🔍 [LocationService] getCurrentPosition() called (forceRefresh: $forceRefresh)');
    
    // PRIORITY 0: Check app-level cache (1 minute cache to avoid recalibration)
    if (!forceRefresh) {
      final cachedLocation = LocationCacheService.instance.getValidCachedLocation();
      if (cachedLocation != null) {
        print('📦 [LocationService] Using app-level cached location (less than 1 minute old)');
        print('   This prevents recalibration when navigating between pages');
        return cachedLocation;
      }
    }
    
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

      // Check permission
      print('🔍 [LocationService] Checking permission...');
      LocationPermission permission = await Geolocator.checkPermission();
      print('   📍 Permission status: $permission');
      
      if (permission == LocationPermission.denied ||
          permission == LocationPermission.deniedForever) {
        print('   ❌ Permission is DENIED or PERMANENTLY DENIED');
        throw Exception(
          'Location permission is denied. Please grant location permission to use this feature.',
        );
      }

      print('   ✅ Permission is GRANTED');

      // PRIORITY 1: Get last known position FIRST (fastest, no GPS needed)
      print('🔍 [LocationService] Getting last known position (priority 1 - fastest)...');
      Position? lastPosition;
      try {
        lastPosition = await Geolocator.getLastKnownPosition()
            .timeout(const Duration(seconds: 2)); // Quick timeout for cached position
      } catch (e) {
        print('   ⚠️ Error getting last known position: $e');
      }
      
      if (lastPosition != null) {
        final age = DateTime.now().difference(lastPosition.timestamp);
        print('   📍 Last known position found:');
        print('      Latitude: ${lastPosition.latitude}');
        print('      Longitude: ${lastPosition.longitude}');
        print('      Age: ${age.inMinutes} minutes old');
        print('      Accuracy: ${lastPosition.accuracy}m');
        
        // VERY AGGRESSIVE: Use cached position if it's less than 30 minutes old
        // This prevents most GPS timeouts on slow devices
        final maxCacheAge = preferLowAccuracy ? 30 : 15; // 30 min for low accuracy, 15 for normal
        if (age.inMinutes < maxCacheAge) {
          print('   ✅ Using cached position (${age.inSeconds} seconds old) - instant, no GPS needed!');
          // Save to app-level cache for 1 minute
          await LocationCacheService.instance.saveLocation(lastPosition);
          return lastPosition;
        }
        
        // If cached position is older but still reasonable, use it for low accuracy mode
        if (preferLowAccuracy && age.inHours < 2) {
          print('   ✅ Using older cached position (${age.inMinutes} min old) - preferLowAccuracy mode');
          // Save to app-level cache for 1 minute
          await LocationCacheService.instance.saveLocation(lastPosition);
          return lastPosition;
        }
      } else {
        print('   ⚠️ No last known position available');
      }
      
      // PRIORITY 2: Try to get CURRENT position (only if cached is too old or unavailable)
      // Use SHORT timeouts to fail fast and fall back to cached position
      print('🔍 [LocationService] Attempting to get CURRENT position (priority 2)...');
      if (preferLowAccuracy) {
        print('   📍 Strategy: Low accuracy only with SHORT timeout (fail fast, use cache if timeout)');
      } else {
        print('   📍 Strategy: Low accuracy first, then medium if needed');
      }
      final startTime = DateTime.now();
      
      try {
        // Try low accuracy with SHORT timeout (5 seconds)
        // If it times out quickly, we'll use cached position
        print('   🔄 Attempt: Low accuracy (network/WiFi, 5s timeout)...');
        try {
          Position currentPosition = await Geolocator.getCurrentPosition(
            desiredAccuracy: LocationAccuracy.low,
            timeLimit: const Duration(seconds: 5), // SHORT timeout - fail fast
          ).timeout(
            const Duration(seconds: 5), // SHORT timeout
            onTimeout: () {
              print('   ⏱️ Low accuracy timed out after 5s - will use cached if available');
              throw TimeoutException('Low accuracy timeout', const Duration(seconds: 5));
            },
          );
          
          final elapsed = DateTime.now().difference(startTime);
          print('   ✅ Got position with LOW accuracy in ${elapsed.inSeconds} seconds');
          // Save to cache for future use (1 minute cache)
          await LocationCacheService.instance.saveLocation(currentPosition);
          return currentPosition;
        } on TimeoutException {
          // Low accuracy timed out
          if (preferLowAccuracy) {
            // If preferLowAccuracy, don't try medium - use cached instead
            print('   ⏱️ Low accuracy timed out, preferLowAccuracy=true - will use cached position');
            throw TimeoutException('Low accuracy timeout', const Duration(seconds: 5));
          }
          // Try medium accuracy only if preferLowAccuracy is false
          print('   🔄 Trying medium accuracy (GPS, 8s timeout)...');
        }
        
        // Try medium accuracy with SHORT timeout (8 seconds)
        Position currentPosition = await Geolocator.getCurrentPosition(
          desiredAccuracy: LocationAccuracy.medium,
          timeLimit: const Duration(seconds: 8), // SHORT timeout
        ).timeout(
          const Duration(seconds: 8), // SHORT timeout
          onTimeout: () {
            print('   ⏱️ Medium accuracy also timed out after 8s');
            throw TimeoutException('Medium accuracy timeout', const Duration(seconds: 8));
          },
        );
        
        final elapsed = DateTime.now().difference(startTime);
        print('   ✅ Got position with MEDIUM accuracy in ${elapsed.inSeconds} seconds');
        // Save to cache for future use (1 minute cache)
        await LocationCacheService.instance.saveLocation(currentPosition);
        return currentPosition;
      } on TimeoutException {
        // GPS timed out - use cached position as fallback
        print('   ❌ GPS timed out - falling back to cached position');
        if (lastPosition != null) {
          final age = DateTime.now().difference(lastPosition.timestamp);
          print('   ✅ Using cached position (${age.inMinutes} min old) - better than timeout!');
          // Save to cache even if it's from last known position
          await LocationCacheService.instance.saveLocation(lastPosition);
          return lastPosition;
        }
        // No cached position available - throw timeout
        print('   ❌ No cached position available - throwing TimeoutException');
        rethrow;
      }
    } catch (e) {
      print('   ❌ [LocationService] getCurrentPosition() ERROR: $e');
      print('   📋 Error type: ${e.runtimeType}');
      print('   📋 Error toString: ${e.toString()}');
      if (e is TimeoutException) {
        print('   📋 TimeoutException details:');
        print('      Duration: ${e.duration}');
        print('      Message: ${e.message}');
      }
      
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
}
