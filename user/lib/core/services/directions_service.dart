import 'dart:convert';

import 'package:flutter/services.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:http/http.dart' as http;

import '../config/api_config.dart';

const _apiKeyChannel = MethodChannel('pasa_hero/google_api');

/// Fetches route polyline from Google Directions API (origin → destination).
/// Requires Directions API enabled in Google Cloud Console.
class DirectionsService {
  static const _baseUrl = 'https://maps.googleapis.com/maps/api/directions/json';

  static Future<String> _getApiKey() async {
    try {
      final fromPlatform = await _apiKeyChannel.invokeMethod<String>('getGoogleApiKey');
      if (fromPlatform != null && fromPlatform.isNotEmpty) return fromPlatform;
    } catch (_) {}
    return kGoogleApiKey;
  }

  /// Gets driving route from [origin] to [destination]. Returns list of points for the polyline,
  /// or empty list if request fails or no route found.
  Future<List<LatLng>> getRoutePolyline(LatLng origin, LatLng destination) async {
    final key = await _getApiKey();
    if (key.isEmpty) return [];
    try {
      final uri = Uri.parse(_baseUrl).replace(
        queryParameters: {
          'origin': '${origin.latitude},${origin.longitude}',
          'destination': '${destination.latitude},${destination.longitude}',
          'key': key,
        },
      );
      final response = await http.get(uri).timeout(const Duration(seconds: 15));
      final data = jsonDecode(response.body) as Map<String, dynamic>;
      final status = data['status'] as String?;
      if (status != 'OK') {
        print('⚠️ [Directions] status: $status ${data['error_message'] ?? ''}');
        return [];
      }
      final routes = data['routes'] as List<dynamic>?;
      if (routes == null || routes.isEmpty) return [];
      final overview = routes.first['overview_polyline'] as Map<String, dynamic>?;
      final encoded = overview?['points'] as String?;
      if (encoded == null || encoded.isEmpty) return [];
      return _decodePolyline(encoded);
    } catch (e) {
      print('⚠️ [Directions] getRoutePolyline: $e');
      return [];
    }
  }

  /// Decode Google's encoded polyline format.
  static List<LatLng> _decodePolyline(String encoded) {
    final List<LatLng> points = [];
    int index = 0;
    int lat = 0;
    int lng = 0;
    while (index < encoded.length) {
      int b;
      int shift = 0;
      int result = 0;
      do {
        b = encoded.codeUnitAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      final dlat = (result & 1) != 0 ? ~(result >> 1) : (result >> 1);
      lat += dlat;

      shift = 0;
      result = 0;
      do {
        b = encoded.codeUnitAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      final dlng = (result & 1) != 0 ? ~(result >> 1) : (result >> 1);
      lng += dlng;

      points.add(LatLng(lat / 1e5, lng / 1e5));
    }
    return points;
  }
}
