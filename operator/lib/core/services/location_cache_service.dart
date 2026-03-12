import 'package:geolocator/geolocator.dart';

/// Service for caching operator location to avoid recalibration when navigating.
/// 
/// This service:
/// - Caches location in memory with timestamp
/// - Checks if cached location is still valid (less than 1 minute old)
/// - Provides methods to save/retrieve cached location
class LocationCacheService {
  static LocationCacheService? _instance;
  static LocationCacheService get instance {
    _instance ??= LocationCacheService._();
    return _instance!;
  }

  LocationCacheService._();

  // In-memory cache
  Position? _cachedPosition;
  DateTime? _cacheTimestamp;
  
  // Cache duration - 1 minute
  static const Duration _cacheDuration = Duration(minutes: 1);

  /// Gets the cached location if it's still valid (less than 1 minute old).
  /// 
  /// Returns:
  /// - [Position] if cached location exists and is less than 1 minute old
  /// - `null` if no cache or cache is expired
  Position? getCachedLocation() {
    if (_cachedPosition == null || _cacheTimestamp == null) {
      print('📦 [LocationCache] No cached location available');
      return null;
    }

    final age = DateTime.now().difference(_cacheTimestamp!);
    
    if (age < _cacheDuration) {
      print('📦 [LocationCache] Using cached location (${age.inSeconds} seconds old)');
      return _cachedPosition;
    } else {
      print('📦 [LocationCache] Cached location expired (${age.inSeconds} seconds old, max: ${_cacheDuration.inSeconds}s)');
      // Clear expired cache
      _cachedPosition = null;
      _cacheTimestamp = null;
      return null;
    }
  }

  /// Saves a location to cache with current timestamp.
  /// 
  /// Parameters:
  /// - [position]: The position to cache
  Future<void> saveLocation(Position position) async {
    _cachedPosition = position;
    _cacheTimestamp = DateTime.now();
    
    print('📦 [LocationCache] Location cached:');
    print('   Latitude: ${position.latitude}');
    print('   Longitude: ${position.longitude}');
    print('   Timestamp: $_cacheTimestamp');
  }

  /// Checks if cached location is still valid.
  /// 
  /// Returns `true` if cached location exists and is less than 1 minute old.
  bool hasValidCache() {
    if (_cachedPosition == null || _cacheTimestamp == null) {
      return false;
    }
    
    final age = DateTime.now().difference(_cacheTimestamp!);
    return age < _cacheDuration;
  }

  /// Gets cached location or null if expired/not available.
  /// 
  /// This is a convenience method that combines getCachedLocation() and hasValidCache().
  Position? getValidCachedLocation() {
    if (hasValidCache()) {
      return getCachedLocation();
    }
    return null;
  }

  /// Clears the cached location.
  void clearCache() {
    print('📦 [LocationCache] Cache cleared');
    _cachedPosition = null;
    _cacheTimestamp = null;
  }
}
