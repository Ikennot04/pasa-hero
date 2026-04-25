import 'package:geolocator/geolocator.dart';

/// Service for saving user location to server.
/// 
/// This service handles:
/// - Saving location to backend API
/// - Error handling for network failures
/// - Retry logic if needed
class LocationApiService {
  static LocationApiService? _instance;
  static LocationApiService get instance {
    _instance ??= LocationApiService._();
    return _instance!;
  }

  LocationApiService._();

  /// Saves user location to the server.
  /// 
  /// Parameters:
  /// - [position]: The GPS position to save
  /// - [userId]: Optional user ID (if you have user authentication)
  /// 
  /// Returns `true` if successful, `false` otherwise.
  /// 
  /// This method is non-blocking and won't throw errors.
  Future<bool> saveLocationToServer(
    Position position, {
    String? userId,
  }) async {
    try {
      print('🌐 [LocationApiService] Saving location to server...');
      print('   Latitude: ${position.latitude}');
      print('   Longitude: ${position.longitude}');
      print('   Accuracy: ${position.accuracy}m');
      print('   Timestamp: ${position.timestamp}');
      
    
      // Example implementation:
      /*
      final response = await http.post(
        Uri.parse('https://your-api.com/api/user/location'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $authToken', // If you have auth
        },
        body: jsonEncode({
          'latitude': position.latitude,
          'longitude': position.longitude,
          'accuracy': position.accuracy,
          'timestamp': position.timestamp.toIso8601String(),
          'altitude': position.altitude,
          'speed': position.speed,
          'heading': position.heading,
          'userId': userId,
        }),
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        print('✅ [LocationApiService] Location saved successfully');
        return true;
      } else {
        print('❌ [LocationApiService] Failed to save location: ${response.statusCode}');
        return false;
      }
      */
      
      // Placeholder - replace with actual API call
      print('📝 [LocationApiService] API call placeholder - implement your endpoint here');
      print('   Endpoint: POST /api/user/location');
      print('   Body: { latitude, longitude, accuracy, timestamp, ... }');
      
      // Simulate API call delay
      await Future.delayed(const Duration(milliseconds: 100));
      
      // For now, return true (success) - replace with actual API response check
      return true;
    } catch (e) {
      print('❌ [LocationApiService] Error saving location to server: $e');
      // Don't throw - server save failure shouldn't break the app
      return false;
    }
  }

  /// Gets the last saved location from server.
  /// 
  /// This can be used to restore location if app cache is cleared.
  /// 
  /// Parameters:
  /// - [userId]: Optional user ID
  /// 
  /// Returns [Position] if found, `null` otherwise.
  Future<Position?> getLastSavedLocation({String? userId}) async {
    try {
      print('🌐 [LocationApiService] Getting last saved location from server...');
      
      
      // Example:
      /*
      final response = await http.get(
        Uri.parse('https://your-api.com/api/user/location/last'),
        headers: {
          'Authorization': 'Bearer $authToken',
        },
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return Position(
          latitude: data['latitude'],
          longitude: data['longitude'],
          timestamp: DateTime.parse(data['timestamp']),
          accuracy: data['accuracy'] ?? 0.0,
          altitude: data['altitude'] ?? 0.0,
          speed: data['speed'] ?? 0.0,
          heading: data['heading'] ?? 0.0,
        );
      }
      */
      
      print('📝 [LocationApiService] API call placeholder - implement your endpoint here');
      return null;
    } catch (e) {
      print('❌ [LocationApiService] Error getting location from server: $e');
      return null;
    }
  }
}
