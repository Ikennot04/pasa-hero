import 'dart:convert';

import 'package:flutter/services.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:http/http.dart' as http;

import '../config/api_config.dart';

const _apiKeyChannel = MethodChannel('pasa_hero/google_api');

/// Result of a route calculation from Google Directions API.
class RouteResult {
  /// List of points for the route polyline.
  final List<LatLng> polyline;
  
  /// Distance in meters (accurate street distance from Google Maps).
  final double distanceMeters;
  
  /// Distance as a formatted string (e.g., "2.5 km" or "500 m").
  final String distanceText;
  
  /// Duration in seconds.
  final int? durationSeconds;
  
  /// Duration as a formatted string (e.g., "5 mins").
  final String? durationText;

  const RouteResult({
    required this.polyline,
    required this.distanceMeters,
    required this.distanceText,
    this.durationSeconds,
    this.durationText,
  });
}

/// Fetches route information from Google Directions API (origin → destination).
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

  /// Gets driving route from [origin] to [destination] with accurate distance.
  /// Returns null if request fails or no route found.
  Future<RouteResult?> getRouteWithDistance(
    LatLng origin,
    LatLng destination,
  ) async {
    final key = await _getApiKey();
    if (key.isEmpty) {
     
      return null;
    }
    
    try {
      final uri = Uri.parse(_baseUrl).replace(
        queryParameters: {
          'origin': '${origin.latitude},${origin.longitude}',
          'destination': '${destination.latitude},${destination.longitude}',
          'key': key,
          'mode': 'driving',
          'region': 'ph',
        },
      );
      
      final response = await http.get(uri).timeout(const Duration(seconds: 15));
      final data = jsonDecode(response.body) as Map<String, dynamic>;
      final status = data['status'] as String?;
      
      if (status != 'OK') {
        print('⚠️ [Directions] status: $status ${data['error_message'] ?? ''}');
        return null;
      }
      
      final routes = data['routes'] as List<dynamic>?;
      if (routes == null || routes.isEmpty) {
        print('⚠️ [Directions] No routes found');
        return null;
      }
      
      final route = routes.first as Map<String, dynamic>;
      final overview = route['overview_polyline'] as Map<String, dynamic>?;
      final encoded = overview?['points'] as String?;
      
      if (encoded == null || encoded.isEmpty) {
        print('⚠️ [Directions] No polyline found');
        return null;
      }
      
      final polyline = _decodePolyline(encoded);
      
      // Extract distance and duration from legs
      double totalDistanceMeters = 0.0;
      int totalDurationSeconds = 0;
      
      final legs = route['legs'] as List<dynamic>?;
      if (legs != null && legs.isNotEmpty) {
        for (final leg in legs) {
          final legMap = leg as Map<String, dynamic>;
          
          // Extract distance
          final distance = legMap['distance'] as Map<String, dynamic>?;
          if (distance != null) {
            final value = distance['value'] as num?;
            if (value != null) {
              totalDistanceMeters += value.toDouble();
            }
          }
          
          // Extract duration
          final duration = legMap['duration'] as Map<String, dynamic>?;
          if (duration != null) {
            final value = duration['value'] as num?;
            if (value != null) {
              totalDurationSeconds += value.toInt();
            }
          }
        }
      }
      
      // Get formatted distance text from the first leg (or calculate if needed)
      String distanceText = '';
      if (legs != null && legs.isNotEmpty) {
        final firstLeg = legs.first as Map<String, dynamic>;
        final distance = firstLeg['distance'] as Map<String, dynamic>?;
        distanceText = distance?['text'] as String? ?? _formatDistance(totalDistanceMeters);
      } else {
        distanceText = _formatDistance(totalDistanceMeters);
      }
      
      // Get formatted duration text from the first leg
      String? durationText;
      if (legs != null && legs.isNotEmpty) {
        final firstLeg = legs.first as Map<String, dynamic>;
        final duration = firstLeg['duration'] as Map<String, dynamic>?;
        durationText = duration?['text'] as String?;
      }
      
      return RouteResult(
        polyline: polyline,
        distanceMeters: totalDistanceMeters,
        distanceText: distanceText,
        durationSeconds: totalDurationSeconds > 0 ? totalDurationSeconds : null,
        durationText: durationText,
      );
    } catch (e) {
      print('⚠️ [Directions] getRouteWithDistance error: $e');
      return null;
    }
  }

  /// Gets driving route along streets from first stop to last stop, with intermediate stops as waypoints.
  /// Returns the road polyline (highway/street) or null if the request fails.
  Future<RouteResult?> getRouteWithWaypoints(List<LatLng> orderedStops) async {
    if (orderedStops.length < 2) return null;
    final key = await _getApiKey();
    if (key.isEmpty) {
      print('⚠️ [Directions] No API key available');
      return null;
    }
    final origin = orderedStops.first;
    final destination = orderedStops.last;
    final waypoints = orderedStops.length > 2
        ? orderedStops.sublist(1, orderedStops.length - 1)
        : <LatLng>[];
    try {
      final params = <String, String>{
        'origin': '${origin.latitude},${origin.longitude}',
        'destination': '${destination.latitude},${destination.longitude}',
        'key': key,
        'mode': 'driving',
        'region': 'ph',
      };
      if (waypoints.isNotEmpty) {
        params['waypoints'] = waypoints
            .map((p) => '${p.latitude},${p.longitude}')
            .join('|');
      }
      final uri = Uri.parse(_baseUrl).replace(queryParameters: params);
      final response = await http.get(uri).timeout(const Duration(seconds: 20));
      final data = jsonDecode(response.body) as Map<String, dynamic>;
      final status = data['status'] as String?;
      if (status != 'OK') {
        print('⚠️ [Directions] getRouteWithWaypoints status: $status');
        return null;
      }
      final routes = data['routes'] as List<dynamic>?;
      if (routes == null || routes.isEmpty) return null;
      final route = routes.first as Map<String, dynamic>;
      final overview = route['overview_polyline'] as Map<String, dynamic>?;
      final encoded = overview?['points'] as String?;
      if (encoded == null || encoded.isEmpty) return null;
      final polyline = _decodePolyline(encoded);
      double totalDistanceMeters = 0.0;
      int totalDurationSeconds = 0;
      final legs = route['legs'] as List<dynamic>?;
      if (legs != null) {
        for (final leg in legs) {
          final legMap = leg as Map<String, dynamic>;
          final dist = legMap['distance'] as Map<String, dynamic>?;
          if (dist != null && dist['value'] != null) {
            totalDistanceMeters += (dist['value'] as num).toDouble();
          }
          final dur = legMap['duration'] as Map<String, dynamic>?;
          if (dur != null && dur['value'] != null) {
            totalDurationSeconds += (dur['value'] as num).toInt();
          }
        }
      }
      String? durationText;
      if (legs != null && legs.isNotEmpty) {
        final firstLeg = legs.first as Map<String, dynamic>;
        final duration = firstLeg['duration'] as Map<String, dynamic>?;
        durationText = duration?['text'] as String?;
      }
      return RouteResult(
        polyline: polyline,
        distanceMeters: totalDistanceMeters,
        distanceText: _formatDistance(totalDistanceMeters),
        durationSeconds: totalDurationSeconds > 0 ? totalDurationSeconds : null,
        durationText: durationText,
      );
    } catch (e) {
      print('⚠️ [Directions] getRouteWithWaypoints error: $e');
      return null;
    }
  }

  /// Gets driving route from [origin] to [destination]. Returns list of points for the polyline,
  /// or empty list if request fails or no route found.
  /// 
  /// This method is kept for backward compatibility. For accurate distance, use [getRouteWithDistance].
  Future<List<LatLng>> getRoutePolyline(LatLng origin, LatLng destination) async {
    final result = await getRouteWithDistance(origin, destination);
    return result?.polyline ?? [];
  }

  /// Follows drivable roads through [anchors] in order. Chunks requests past the
  /// Directions waypoint limit (origin + up to 25 intermediates + destination).
  Future<List<LatLng>?> getRoadFollowingPolyline(List<LatLng> anchors) async {
    if (anchors.length < 2) {
      return anchors.isEmpty ? const <LatLng>[] : List<LatLng>.from(anchors);
    }
    final key = await _getApiKey();
    if (key.isEmpty) {
      print('⚠️ [Directions] getRoadFollowingPolyline: no API key');
      return null;
    }

    const maxPointsPerRequest = 27;

    final merged = <LatLng>[];
    var startIdx = 0;
    while (startIdx < anchors.length - 1) {
      final endIdx = (startIdx + maxPointsPerRequest - 1) < anchors.length - 1
          ? startIdx + maxPointsPerRequest - 1
          : anchors.length - 1;
      final chunk = anchors.sublist(startIdx, endIdx + 1);
      final segment = await _fetchDirectionsForAnchorChunk(chunk, key);
      if (segment == null || segment.isEmpty) {
        print('⚠️ [Directions] getRoadFollowingPolyline: chunk failed ($startIdx→$endIdx)');
        return null;
      }
      if (merged.isEmpty) {
        merged.addAll(segment);
      } else if (_coordsVeryClose(merged.last, segment.first)) {
        merged.addAll(segment.skip(1));
      } else {
        merged.addAll(segment);
      }
      startIdx = endIdx;
    }
    return merged;
  }

  Future<List<LatLng>?> _fetchDirectionsForAnchorChunk(
    List<LatLng> chunk,
    String key,
  ) async {
    if (chunk.length < 2) return null;
    try {
      final origin = chunk.first;
      final dest = chunk.last;
      final params = <String, String>{
        'origin': '${origin.latitude},${origin.longitude}',
        'destination': '${dest.latitude},${dest.longitude}',
        'key': key,
        'mode': 'driving',
        'region': 'ph',
      };
      if (chunk.length > 2) {
        params['waypoints'] = chunk
            .sublist(1, chunk.length - 1)
            .map((p) => '${p.latitude},${p.longitude}')
            .join('|');
      }

      final uri = Uri.parse(_baseUrl).replace(queryParameters: params);
      final response = await http.get(uri).timeout(const Duration(seconds: 20));
      final data = jsonDecode(response.body) as Map<String, dynamic>;
      final status = data['status'] as String?;
      if (status != 'OK') {
        print(
          '⚠️ [Directions] chunk status: $status ${data['error_message'] ?? ''}',
        );
        return null;
      }
      final routes = data['routes'] as List<dynamic>?;
      if (routes == null || routes.isEmpty) return null;
      final route = routes.first as Map<String, dynamic>;
      final overview = route['overview_polyline'] as Map<String, dynamic>?;
      final encoded = overview?['points'] as String?;
      if (encoded == null || encoded.isEmpty) return null;
      return _decodePolyline(encoded);
    } catch (e) {
      print('⚠️ [Directions] _fetchDirectionsForAnchorChunk: $e');
      return null;
    }
  }

  static bool _coordsVeryClose(LatLng a, LatLng b) {
    const eps = 1e-5;
    return (a.latitude - b.latitude).abs() < eps &&
        (a.longitude - b.longitude).abs() < eps;
  }

  /// Formats distance in meters to a human-readable string.
  static String _formatDistance(double meters) {
    if (meters < 1000) {
      return '${meters.round()} m';
    } else {
      final km = meters / 1000;
      return '${km.toStringAsFixed(1)} km';
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
