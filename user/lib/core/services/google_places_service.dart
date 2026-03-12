import 'dart:convert';

import 'package:flutter/services.dart';
import 'package:http/http.dart' as http;

import '../config/api_config.dart';
import '../models/bus_stop.dart';

const _apiKeyChannel = MethodChannel('pasa_hero/google_api');

/// Fetches real bus/transit stops from Google Places API.
/// Uses rankby=distance for closest stop; radius + pagination for city-wide stops.
class GooglePlacesService {
  static const _baseUrl = 'https://maps.googleapis.com/maps/api/place';
  static const _maxRadiusMeters = 20000; // 20 km
  static const _pageTokenDelay = Duration(seconds: 2); // Required before using next_page_token

  static Future<String> _getApiKey() async {
    try {
      final fromPlatform = await _apiKeyChannel.invokeMethod<String>('getGoogleApiKey');
      if (fromPlatform != null && fromPlatform.isNotEmpty) return fromPlatform;
    } catch (_) {}
    return kGoogleApiKey;
  }

  /// Gets the single closest bus/transit stop to [lat], [lng] using rankby=distance (no radius).
  /// Returns null if key missing or no results.
  Future<BusStop?> getClosestBusStop(double lat, double lng) async {
    final key = await _getApiKey();
    if (key.isEmpty) return null;
    try {
      final uri = Uri.parse('$_baseUrl/nearbysearch/json').replace(
        queryParameters: {
          'location': '$lat,$lng',
          'rankby': 'distance',
          'type': 'bus_station',
          'key': key,
        },
      );
      final response = await http.get(uri).timeout(const Duration(seconds: 10));
      final data = jsonDecode(response.body) as Map<String, dynamic>;
      final status = data['status'] as String?;
      final errorMsg = data['error_message'] as String?;
      if (status != 'OK' && status != 'ZERO_RESULTS') {
        print('📍 [Places] Closest stop status: $status ${errorMsg != null ? "– $errorMsg" : ""}');
        return null;
      }
      final results = data['results'] as List<dynamic>? ?? [];
      if (results.isEmpty) return null;
      final first = _parseResults(results.take(1).toList());
      return first.isEmpty ? null : first.first;
    } catch (e) {
      print('⚠️ [Places] getClosestBusStop: $e');
      return null;
    }
  }

  /// Gets up to 60 bus/transit stops within [radiusMeters] of [lat], [lng] (3 pages of 20).
  /// Uses type=transit_station; dedupe with [excludeIds] (e.g. closest stop id).
  Future<List<BusStop>> getBusStopsInRadius(
    double lat,
    double lng, {
    int radiusMeters = 50000,
    Set<String> excludeIds = const {},
  }) async {
    final key = await _getApiKey();
    if (key.isEmpty) return [];
    final List<BusStop> all = [];
    String? pageToken;
    int page = 0;
    while (page < 3) {
      try {
        final uri = pageToken == null
            ? Uri.parse('$_baseUrl/nearbysearch/json').replace(
                queryParameters: {
                  'location': '$lat,$lng',
                  'radius': '$radiusMeters',
                  'type': 'transit_station',
                  'key': key,
                },
              )
            : Uri.parse('$_baseUrl/nearbysearch/json').replace(
                queryParameters: {'pagetoken': pageToken, 'key': key},
              );
        if (pageToken != null) await Future.delayed(_pageTokenDelay);
        final response = await http.get(uri).timeout(const Duration(seconds: 12));
        final data = jsonDecode(response.body) as Map<String, dynamic>;
        final status = data['status'] as String?;
        final errorMsg = data['error_message'] as String?;
        if (status != 'OK' && status != 'ZERO_RESULTS') {
          print('📍 [Places] Radius search status: $status ${errorMsg != null ? "– $errorMsg" : ""}');
          break;
        }
        final results = data['results'] as List<dynamic>? ?? [];
        for (final s in _parseResults(results)) {
          if (!excludeIds.contains(s.id)) all.add(s);
        }
        pageToken = data['next_page_token'] as String?;
        if (pageToken == null || pageToken.isEmpty) break;
        page++;
      } catch (e) {
        print('⚠️ [Places] getBusStopsInRadius page $page: $e');
        break;
      }
    }
    return all;
  }

  /// Workflow: closest stop to user + up to 60 stops in city radius. [closestStopId] is set to the id of the nearest stop.
  Future<({List<BusStop> stops, String? closestStopId})> getStopsWithClosest(
    double userLat,
    double userLng, {
    int cityRadiusMeters = 50000,
  }) async {
    final key = await _getApiKey();
    if (key.isEmpty) {
      print('📍 [Places] No API key.');
      return (stops: <BusStop>[], closestStopId: null);
    }
    try {
      final closest = await getClosestBusStop(userLat, userLng);
      final excludeIds = closest != null ? {closest.id} : <String>{};
      final inCity = await getBusStopsInRadius(
        userLat,
        userLng,
        radiusMeters: cityRadiusMeters,
        excludeIds: excludeIds,
      );
      final List<BusStop> combined = <BusStop>[];
      if (closest != null) combined.add(closest);
      for (final s in inCity) {
        if (s.id != closest?.id) combined.add(s);
      }
      if (combined.isNotEmpty) {
        print('📍 [Places] ${combined.length} stops; closest: ${closest?.name}');
        return (stops: combined, closestStopId: closest?.id);
      }
      return (stops: <BusStop>[], closestStopId: null);
    } catch (e) {
      print('⚠️ [Places] getStopsWithClosest: $e');
      return (stops: <BusStop>[], closestStopId: null);
    }
  }

  /// Legacy: returns bus/transit stops near [lat], [lng] (text search + nearby).
  Future<List<BusStop>> getTransitStationsNear(double lat, double lng) async {
    final key = await _getApiKey();
    if (key.isEmpty) return [];
    try {
      final seenIds = <String>{};
      final List<BusStop> combined = [];
      final busStops = await _textSearch(lat, lng, key, 'bus stop');
      for (final s in busStops) {
        if (seenIds.add(s.id)) combined.add(s);
      }
      final jeepneyStops = await _textSearch(lat, lng, key, 'jeepney stop');
      for (final s in jeepneyStops) {
        if (seenIds.add(s.id)) combined.add(s);
      }
      final transit = await _nearbySearch(lat, lng, key);
      for (final s in transit) {
        if (!seenIds.add(s.id)) continue;
        final nameLower = s.name.toLowerCase();
        final isStopLike = nameLower.contains('stop') ||
            nameLower.contains('bus stop') ||
            (nameLower.contains('terminal') && combined.length < 15);
        if (isStopLike || combined.length < 10) combined.add(s);
      }
      return combined;
    } catch (e) {
      print('⚠️ [Places] Error: $e');
      return [];
    }
  }

  Future<List<BusStop>> _nearbySearch(double lat, double lng, String key) async {
    final uri = Uri.parse('$_baseUrl/nearbysearch/json').replace(
      queryParameters: {
        'location': '$lat,$lng',
        'radius': '$_maxRadiusMeters',
        'type': 'transit_station',
        'key': key,
      },
    );
    final response = await http.get(uri).timeout(const Duration(seconds: 10));
    final data = jsonDecode(response.body) as Map<String, dynamic>;
    final status = data['status'] as String?;
    final errorMsg = data['error_message'] as String?;
    if (status != 'OK' && status != 'ZERO_RESULTS') {
      print('📍 [Places] Nearby Search status: $status ${errorMsg != null ? "– $errorMsg" : ""}');
      return [];
    }
    return _parseResults(data['results'] as List<dynamic>? ?? []);
  }

  Future<List<BusStop>> _textSearch(double lat, double lng, String key, String query) async {
    final uri = Uri.parse('$_baseUrl/textsearch/json').replace(
      queryParameters: {
        'query': query,
        'location': '$lat,$lng',
        'radius': '$_maxRadiusMeters',
        'key': key,
      },
    );
    final response = await http.get(uri).timeout(const Duration(seconds: 10));
    final data = jsonDecode(response.body) as Map<String, dynamic>;
    final status = data['status'] as String?;
    final errorMsg = data['error_message'] as String?;
    if (status != 'OK' && status != 'ZERO_RESULTS') {
      print('📍 [Places] Text Search "$query" status: $status ${errorMsg != null ? "– $errorMsg" : ""}');
      return [];
    }
    return _parseResults(data['results'] as List<dynamic>? ?? []);
  }

  List<BusStop> _parseResults(List<dynamic> results) {
    final stops = <BusStop>[];
    for (final r in results) {
      final map = r as Map<String, dynamic>;
      final placeId = map['place_id'] as String? ?? '';
      final name = map['name'] as String? ?? 'Transit stop';
      final geo = map['geometry'] as Map<String, dynamic>?;
      final loc = geo?['location'] as Map<String, dynamic>?;
      if (loc == null) continue;
      final latStop = (loc['lat'] as num?)?.toDouble();
      final lngStop = (loc['lng'] as num?)?.toDouble();
      if (latStop == null || lngStop == null) continue;
      stops.add(BusStop(
        id: placeId,
        name: name,
        route: '',
        lat: latStop,
        lng: lngStop,
      ));
    }
    return stops;
  }
}
