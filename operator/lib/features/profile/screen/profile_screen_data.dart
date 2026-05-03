import 'dart:async';
import 'dart:convert';

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/foundation.dart' show debugPrint;
import 'package:geolocator/geolocator.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:http/http.dart' as http;

/// Firestore often returns [Map<Object?, Object?>]; normalize for parsing.
Map<String, dynamic>? firestoreMap(dynamic value) {
  if (value == null) return null;
  if (value is Map<String, dynamic>) return value;
  if (value is Map) {
    return value.map((k, v) => MapEntry(k.toString(), v));
  }
  return null;
}

/// Route information model for operator profiles.
class RouteInfo {
  final String code;
  final String name;
  final String description;

  const RouteInfo({
    required this.code,
    required this.name,
    required this.description,
  });
}

/// Route coordinates for mapping.
class RouteCoordinates {
  final LatLng startPoint;
  final LatLng endPoint;
  final List<LatLng> stops;

  const RouteCoordinates({
    required this.startPoint,
    required this.endPoint,
    this.stops = const [],
  });
}

/// Result of loading the route catalog (Vercel API, with optional Firestore fallback).
class RouteCatalogFetchResult {
  const RouteCatalogFetchResult({
    required this.routes,
    this.apiFailureMessage,
  });

  final List<RouteInfo> routes;
  /// Present when the route list is empty and the API reported failure or was unreachable.
  final String? apiFailureMessage;

  String get emptySelectionMessage {
    if (routes.isNotEmpty) return '';
    final api = apiFailureMessage?.trim();
    if (api != null && api.isNotEmpty) {
      return 'Could not load routes from the server (Vercel API).\n\n$api\n\n'
          'Check your connection or try again. If routes exist only in Firestore, '
          'ensure `route_code` or `routes` is populated.';
    }
    return 'No routes are available. The server list was empty and no routes '
        'were found in Firestore (`route_code` / `routes`).';
  }
}

/// Dynamic route catalog used by operator profile, map, and route screens.
///
/// Loads from the published Vercel/Mongo `GET /api/routes` first; if that yields
/// no routes (unreachable, error, or empty), falls back to Firestore `route_code`
/// then `routes` so operators can still select a code when the API is down.
class RouteCatalogService {
  static const String _routeCodeCollection = 'route_code';
  static const String _routesCollection = 'routes';
  static const String _routesApiUrl =
      'https://pasa-hero-server.vercel.app/api/routes';

  static Map<String, dynamic>? _jsonObject(dynamic value) {
    if (value is Map<String, dynamic>) return value;
    if (value is Map) {
      return Map<String, dynamic>.from(value);
    }
    return null;
  }

  static String? _firstNonEmptyField(Map<String, dynamic> row, List<String> keys) {
    for (final k in keys) {
      final v = row[k];
      if (v == null) continue;
      final s = v.toString().trim();
      if (s.isNotEmpty) return s;
    }
    return null;
  }

  static List<dynamic> _routeRowListFromDecoded(Map<String, dynamic> decoded) {
    final data = decoded['data'];
    if (data is List) return data;
    final routes = decoded['routes'];
    if (routes is List) return routes;
    return const [];
  }

  static void _put(
    Map<String, RouteInfo> out, {
    required String codeRaw,
    String? nameRaw,
    String? descriptionRaw,
  }) {
    final code = codeRaw.trim();
    if (code.isEmpty) return;
    final key = code.toUpperCase();
    final name = (nameRaw ?? '').trim().isEmpty ? code : nameRaw!.trim();
    final description = (descriptionRaw ?? '').trim().isEmpty
        ? 'Dynamic route from Firestore'
        : descriptionRaw!.trim();
    out[key] = RouteInfo(code: code, name: name, description: description);
  }

  /// If `route_code` is empty, seed it from `routes` so both apps can stay dynamic.
  static Future<void> ensureRouteCodeSeededFromRoutes() async {
    try {
      final rcRef = FirebaseFirestore.instance.collection(_routeCodeCollection);
      final existing = await rcRef.limit(1).get();
      if (existing.docs.isNotEmpty) return;

      final routesSnap = await FirebaseFirestore.instance.collection(_routesCollection).get();
      for (final doc in routesSnap.docs) {
        final data = firestoreMap(doc.data());
        if (data == null) continue;
        final code = ((data['code'] as String?)?.trim().isNotEmpty ?? false)
            ? (data['code'] as String).trim()
            : doc.id.trim();
        if (code.isEmpty) continue;
        final stops = RouteDataService.stopsFromRoutesDocument(data);
        final payload = <String, dynamic>{
          'routeCode': code,
          if ((data['name'] as String?)?.trim().isNotEmpty ?? false)
            'name': (data['name'] as String).trim(),
          if ((data['description'] as String?)?.trim().isNotEmpty ?? false)
            'description': (data['description'] as String).trim(),
          'updatedAt': FieldValue.serverTimestamp(),
        };
        if (stops.length >= 2) {
          payload['pointA'] = {
            'latitude': stops.first.position.latitude,
            'longitude': stops.first.position.longitude,
          };
          payload['pointB'] = {
            'latitude': stops.last.position.latitude,
            'longitude': stops.last.position.longitude,
          };
          payload['busStops'] = stops
              .map(
                (s) => {
                  'name': s.name,
                  'latitude': s.position.latitude,
                  'longitude': s.position.longitude,
                },
              )
              .toList();
        }
        await rcRef.doc(code).set(payload, SetOptions(merge: true));
      }

    } catch (_) {
      // Ignore seed errors; fetch method returns Firestore rows (or empty).
    }
  }

  static void _mergeRowsInto(
    Map<String, RouteInfo> byCode,
    List<dynamic> rows, {
    required String sourceLabel,
  }) {
    for (final row in rows) {
      final sm = _jsonObject(row);
      if (sm == null) continue;
      final code = _firstNonEmptyField(sm, const [
        'route_code',
        'routeCode',
        'code',
      ]);
      if (code == null || code.isEmpty) continue;
      final name = _firstNonEmptyField(sm, const [
        'route_name',
        'routeName',
        'name',
      ]);
      final status = _firstNonEmptyField(sm, const ['status']);
      _put(
        byCode,
        codeRaw: code,
        nameRaw: (name == null || name.isEmpty) ? code : name,
        descriptionRaw: (status == null || status.isEmpty)
            ? (sourceLabel == 'api' ? 'Live route from API' : 'Route from Firestore')
            : 'Status: $status',
      );
    }
  }

  static Future<void> _mergeFirestoreRouteCatalog(Map<String, RouteInfo> byCode) async {
    try {
      final snap =
          await FirebaseFirestore.instance.collection(_routeCodeCollection).get();
      for (final doc in snap.docs) {
        final m = firestoreMap(doc.data());
        if (m == null) continue;
        final name = m['name'] as String?;
        final desc = m['description'] as String?;
        _put(
          byCode,
          codeRaw: doc.id,
          nameRaw: name ?? doc.id,
          descriptionRaw: desc,
        );
      }
    } catch (e) {
      debugPrint('⚠️ [RouteCatalog] route_code Firestore read failed: $e');
    }

    try {
      final snap =
          await FirebaseFirestore.instance.collection(_routesCollection).get();
      for (final doc in snap.docs) {
        final m = firestoreMap(doc.data());
        if (m == null) continue;
        final fromField = (m['code'] as String?)?.trim();
        final code =
            (fromField != null && fromField.isNotEmpty) ? fromField : doc.id.trim();
        if (code.isEmpty) continue;
        final name = m['name'] as String?;
        final desc = m['description'] as String?;
        _put(
          byCode,
          codeRaw: code,
          nameRaw: name ?? code,
          descriptionRaw: desc,
        );
      }
    } catch (e) {
      debugPrint('⚠️ [RouteCatalog] routes Firestore read failed: $e');
    }
  }

  static Future<RouteCatalogFetchResult> fetchRouteCatalog() async {
    final byCode = <String, RouteInfo>{};
    String? apiFailure;

    try {
      final uri = Uri.parse(_routesApiUrl);
      final response = await http
          .get(
            uri,
            headers: const {'Accept': 'application/json'},
          )
          .timeout(const Duration(seconds: 20));

      Map<String, dynamic>? decoded;
      try {
        decoded = _jsonObject(jsonDecode(response.body));
      } catch (_) {
        apiFailure =
            'Could not parse server response (HTTP ${response.statusCode}).';
      }

      if (decoded != null && decoded['success'] == false) {
        final raw = decoded['message'] ?? decoded['error'];
        final msg = raw?.toString().trim();
        apiFailure =
            (msg != null && msg.isNotEmpty) ? msg : 'Server returned an error.';
      }

      final okHttp = response.statusCode >= 200 && response.statusCode < 300;

      if (okHttp &&
          decoded != null &&
          decoded['success'] != false) {
        _mergeRowsInto(byCode, _routeRowListFromDecoded(decoded), sourceLabel: 'api');
      } else if (apiFailure == null && !okHttp) {
        apiFailure =
            'HTTP ${response.statusCode} from routes service.';
      }
    } on TimeoutException {
      apiFailure = 'Request to the routes service timed out.';
    } catch (e) {
      apiFailure = 'Network error while loading routes: $e';
    }

    if (byCode.isEmpty) {
      await _mergeFirestoreRouteCatalog(byCode);
    }

    final list = byCode.values.toList();
    list.sort((a, b) => a.name.toLowerCase().compareTo(b.name.toLowerCase()));

    return RouteCatalogFetchResult(
      routes: list,
      apiFailureMessage: list.isEmpty ? apiFailure : null,
    );
  }

  static Future<List<RouteInfo>> fetchAvailableRoutes() async {
    final r = await fetchRouteCatalog();
    return r.routes;
  }
}

/// Service for managing operator profile data in Firestore.
class ProfileDataService {
  static const String _usersCollection = 'users';

  /// Last route seen from Firestore or UI (Route tab). Used when publishing [operator_locations]
  /// so riders see the same code as the route dropdown even if a field type in [users] breaks reads.
  static String? _locationSyncRouteFallback;

  static void setLocationSyncRouteFallback(String? code) {
    final t = code?.trim();
    _locationSyncRouteFallback = (t == null || t.isEmpty) ? null : t;
  }

  static String? get locationSyncRouteFallback => _locationSyncRouteFallback;

  static String? _routeFieldFromMap(Map<String, dynamic>? data) {
    if (data == null) return null;
    final v = data['routeCode'] ?? data['route_code'];
    if (v == null) return null;
    if (v is String) return v;
    return v.toString();
  }

  /// Get current operator's route code from Firestore.
  static Future<String?> getOperatorRouteCode() async {
    final user = FirebaseAuth.instance.currentUser;
    if (user == null) return null;

    try {
      final doc = await FirebaseFirestore.instance
          .collection(_usersCollection)
          .doc(user.uid)
          .get();

      if (doc.exists) {
        final s = _routeFieldFromMap(doc.data())?.trim();
        if (s != null && s.isNotEmpty) {
          setLocationSyncRouteFallback(s);
          return s;
        }
      }
      return null;
    } catch (e) {
      print('❌ [ProfileDataService] Error getting route code: $e');
      return null;
    }
  }

  /// Canonical uppercase code for [operator_locations] (profile first, then Route-tab fallback).
  static Future<String> resolveRouteCodeForLocationPublish() async {
    final fromDoc = (await getOperatorRouteCode())?.trim();
    if (fromDoc != null && fromDoc.isNotEmpty) {
      return fromDoc.toUpperCase();
    }
    final fb = _locationSyncRouteFallback?.trim();
    if (fb != null && fb.isNotEmpty) return fb.toUpperCase();
    return '';
  }

  /// Update operator's route code in Firestore.
  static Future<bool> updateOperatorRouteCode(String routeCode) async {
    final user = FirebaseAuth.instance.currentUser;
    if (user == null) return false;

    try {
      final trimmed = routeCode.trim();
      await FirebaseFirestore.instance
          .collection(_usersCollection)
          .doc(user.uid)
          .update({
        'routeCode': trimmed.toUpperCase(),
        'route_code': trimmed.toUpperCase(), // Also store as snake_case
        'updatedAt': FieldValue.serverTimestamp(),
      });
      setLocationSyncRouteFallback(trimmed);
      print('✅ [ProfileDataService] Route code updated: $routeCode');
      unawaited(
        RouteCodeService.syncRouteCodeWithGpsAndRoutes(trimmed.toUpperCase()),
      );
      return true;
    } catch (e) {
      print('❌ [ProfileDataService] Error updating route code: $e');
      return false;
    }
  }

  /// Get operator's full profile data.
  static Future<Map<String, dynamic>?> getOperatorProfile() async {
    final user = FirebaseAuth.instance.currentUser;
    if (user == null) return null;

    try {
      final doc = await FirebaseFirestore.instance
          .collection(_usersCollection)
          .doc(user.uid)
          .get();

      if (doc.exists) {
        return doc.data();
      }
      return null;
    } catch (e) {
      print('❌ [ProfileDataService] Error getting profile: $e');
      return null;
    }
  }
}

/// Firestore collection for route definitions (bus stop coordinates).
const String _routesCollection = 'routes';

/// Service to save and load route definitions (e.g. Route1 with bus stops) in Firestore.
class RouteDataService {
  static const String _routesApiBase = 'https://pasa-hero-server.vercel.app/api';

  static Map<String, dynamic>? _apiJsonObject(dynamic value) {
    if (value is Map<String, dynamic>) return value;
    if (value is Map) return Map<String, dynamic>.from(value);
    return null;
  }

  /// Mongo [_id] from list/detail JSON (string or extended JSON map).
  static String? _mongoIdToString(dynamic raw) {
    if (raw == null) return null;
    if (raw is String) {
      final t = raw.trim();
      return t.isEmpty ? null : t;
    }
    if (raw is Map) {
      final m = Map<String, dynamic>.from(raw);
      for (final k in const [r'$oid', 'oid', '_id']) {
        final v = m[k];
        if (v is String && v.trim().isNotEmpty) return v.trim();
      }
    }
    final s = raw.toString().trim();
    if (s.isEmpty || s == 'null') return null;
    return s;
  }

  /// Loads ordered bus stops from the same Vercel/Mongo API as the admin app
  /// (`GET /api/routes`, then `GET /api/routes/:id` with [route_stops]).
  static Future<List<({String name, LatLng position})>> _getRouteStopsFromVercelApi(
    String routeCode,
  ) async {
    final want = routeCode.trim().toUpperCase();
    if (want.isEmpty) return const [];

    try {
      final listUri = Uri.parse('${_routesApiBase}/routes');
      final listResp = await http
          .get(listUri, headers: const {'Accept': 'application/json'})
          .timeout(const Duration(seconds: 20));
      if (listResp.statusCode < 200 || listResp.statusCode >= 300) {
        return const [];
      }

      final listDecoded = _apiJsonObject(jsonDecode(listResp.body));
      if (listDecoded == null || listDecoded['success'] == false) {
        return const [];
      }

      final rowsRaw = listDecoded['data'] ?? listDecoded['routes'];
      if (rowsRaw is! List) return const [];

      String? routeId;
      for (final row in rowsRaw) {
        final sm = _apiJsonObject(row);
        if (sm == null) continue;
        final code =
            (sm['route_code'] ?? sm['routeCode'])?.toString().trim() ?? '';
        if (code.toUpperCase() != want) continue;
        routeId = _mongoIdToString(sm['_id'] ?? sm['id']);
        break;
      }
      if (routeId == null || routeId.isEmpty) return const [];

      final detailUri = Uri.parse('${_routesApiBase}/routes/$routeId');
      final detailResp = await http
          .get(detailUri, headers: const {'Accept': 'application/json'})
          .timeout(const Duration(seconds: 20));
      if (detailResp.statusCode < 200 || detailResp.statusCode >= 300) {
        return const [];
      }

      final detailDecoded = _apiJsonObject(jsonDecode(detailResp.body));
      if (detailDecoded == null || detailDecoded['success'] == false) {
        return const [];
      }

      final payload = _apiJsonObject(detailDecoded['data']);
      if (payload == null) return const [];

      final rawStops = payload['route_stops'] ?? payload['routeStops'];
      if (rawStops is! List || rawStops.isEmpty) return const [];

      final parsed = <({String name, LatLng position, int order})>[];
      for (var i = 0; i < rawStops.length; i++) {
        final sm = _apiJsonObject(rawStops[i]);
        if (sm == null) continue;
        final order = (sm['stop_order'] as num?)?.toInt() ??
            (sm['route_order'] as num?)?.toInt() ??
            (sm['order'] as num?)?.toInt() ??
            i;
        final nameRaw =
            (sm['stop_name'] ?? sm['name'])?.toString().trim() ?? '';
        final lat = (sm['latitude'] as num?)?.toDouble();
        final lng = (sm['longitude'] as num?)?.toDouble();
        if (lat == null || lng == null) continue;
        parsed.add((
          name: nameRaw.isNotEmpty ? nameRaw : 'Stop ${i + 1}',
          position: LatLng(lat, lng),
          order: order,
        ));
      }
      if (parsed.isEmpty) return const [];
      parsed.sort((a, b) => a.order.compareTo(b.order));
      return parsed.map((e) => (name: e.name, position: e.position)).toList();
    } catch (e) {
      debugPrint('⚠️ [RouteDataService] Vercel route stops failed: $e');
      return const [];
    }
  }

  /// Mongo/API stops only (no Firestore). Used when syncing `route_code` from the backend catalog.
  static Future<List<({String name, LatLng position})>> fetchBackendRouteStopsOnly(
    String routeCode,
  ) =>
      _getRouteStopsFromVercelApi(routeCode);

  /// Fetches a route definition from Firestore by code.
  /// Returns map with code, name, description, stops (list of { name, latitude, longitude }).
  static Future<Map<String, dynamic>?> getRouteFromFirestore(String code) async {
    final variants = _routeDocIdVariants(code);
    try {
      for (final id in variants) {
        final doc = await FirebaseFirestore.instance
            .collection(_routesCollection)
            .doc(id)
            .get();
        if (doc.exists && doc.data() != null) {
          return firestoreMap(doc.data());
        }
      }
      return null;
    } catch (e) {
      print('❌ [RouteDataService] Error getting route $code: $e');
      return null;
    }
  }

  static Set<String> _routeDocIdVariants(String code) {
    final t = code.trim();
    if (t.isEmpty) return const {};
    return {t, t.toUpperCase(), t.toLowerCase()};
  }

  /// Stops list from a `routes` document (or any map with a [stops] array).
  static List<({String name, LatLng position})> stopsFromRoutesDocument(
    Map<String, dynamic>? data,
  ) {
    return _parseStopsFromRoutesDoc(data);
  }

  /// Position from a stop map (routes / route_code [busStops] item).
  static LatLng? stopPositionFromFirestoreMap(Map<String, dynamic> stop) {
    for (final key in ['location', 'position', 'geo']) {
      final v = stop[key];
      if (v is GeoPoint) return LatLng(v.latitude, v.longitude);
    }
    final lat = (stop['latitude'] as num?)?.toDouble() ??
        (stop['lat'] as num?)?.toDouble();
    final lng = (stop['longitude'] as num?)?.toDouble() ??
        (stop['lng'] as num?)?.toDouble();
    if (lat != null && lng != null) return LatLng(lat, lng);
    return null;
  }

  static List<({String name, LatLng position})> _parseStopsFromRoutesDoc(
    Map<String, dynamic>? data,
  ) {
    if (data == null) return const [];
    final raw = data['stops'] ?? data['bus_stop'];
    final stopsList = raw is List ? List<dynamic>.from(raw) : <dynamic>[];
    if (stopsList.isEmpty) return const [];
    final out = <({String name, LatLng position})>[];
    for (var i = 0; i < stopsList.length; i++) {
      final stop = stopsList[i];
      if (stop is GeoPoint) {
        out.add((name: 'Stop ${i + 1}', position: LatLng(stop.latitude, stop.longitude)));
        continue;
      }
      final sm = firestoreMap(stop);
      if (sm == null) continue;
      final name = (sm['name'] as String?)?.trim();
      final pos = stopPositionFromFirestoreMap(sm);
      if (pos == null) continue;
      out.add((name: (name != null && name.isNotEmpty) ? name : 'Stop ${i + 1}', position: pos));
    }
    return out;
  }

  /// Route stops: **Mongo (Vercel API) first** when it returns a full path, then Firestore
  /// `route_code` / `routes`, so the driver map matches the admin backend for the selected code.
  static Future<List<({String name, LatLng position})>> getRouteStops(
    String routeCode,
  ) async {
    final code = routeCode.trim();
    if (code.isEmpty) return const [];

    final apiStops = await _getRouteStopsFromVercelApi(code);
    if (apiStops.length >= 2) return apiStops;

    try {
      final fromRouteCode = await RouteCodeService.get(code);
      final rcStops = fromRouteCode?.busStops ?? const <({String name, LatLng position})>[];
      if (rcStops.length >= 2) return rcStops;
    } catch (_) {}

    final routeDoc = await getRouteFromFirestore(code);
    final fsStops = _parseStopsFromRoutesDoc(routeDoc);
    if (fsStops.length >= 2) return fsStops;

    if (apiStops.isNotEmpty) return apiStops;

    try {
      final fromRouteCode = await RouteCodeService.get(code);
      final rcStops = fromRouteCode?.busStops ?? const <({String name, LatLng position})>[];
      if (rcStops.isNotEmpty) return rcStops;
    } catch (_) {}

    return fsStops;
  }

  /// Route polyline / endpoints: same stop ordering as [getRouteStops] (Mongo-first when available).
  static Future<RouteCoordinates?> getRouteCoordinatesFromFirestore(String routeCode) async {
    final code = routeCode.trim();
    if (code.isEmpty) return null;

    final stops = await getRouteStops(code);
    if (stops.length >= 2) {
      return RouteCoordinates(
        startPoint: stops.first.position,
        endPoint: stops.last.position,
        stops: stops.map((s) => s.position).toList(),
      );
    }

    try {
      final fromRouteCode = await RouteCodeService.get(code);
      if (fromRouteCode != null) {
        if (stops.length == 1) {
          final p = stops.first.position;
          return RouteCoordinates(
            startPoint: p,
            endPoint: fromRouteCode.pointB,
            stops: [p, fromRouteCode.pointB],
          );
        }
        return RouteCoordinates(
          startPoint: fromRouteCode.pointA,
          endPoint: fromRouteCode.pointB,
          stops: [fromRouteCode.pointA, fromRouteCode.pointB],
        );
      }
    } catch (_) {}

    if (stops.length == 1) {
      final p = stops.first.position;
      return RouteCoordinates(startPoint: p, endPoint: p, stops: [p]);
    }

    return null;
  }

  /// Saves or updates a route in Firestore (e.g. Route1 with stops).
  static Future<bool> saveRouteToFirestore({
    required String code,
    required String name,
    required String description,
    required List<({String name, LatLng position})> stops,
  }) async {
    try {
      final stopsData = stops.map((stop) => {
        'name': stop.name,
        'latitude': stop.position.latitude,
        'longitude': stop.position.longitude,
      }).toList();

      await FirebaseFirestore.instance.collection(_routesCollection).doc(code).set({
        'code': code,
        'name': name,
        'description': description,
        'stops': stopsData,
        'bus_stop': stopsData,
        'updatedAt': FieldValue.serverTimestamp(),
      });

      print('✅ [RouteDataService] Route $code saved with ${stops.length} stops');
      return true;
    } catch (e) {
      print('❌ [RouteDataService] Error saving route: $e');
      return false;
    }
  }
}

// =============================================================================
// route_code collection - driver route codes: point A, point B, bus stops
// =============================================================================

/// Firestore collection name for driver route codes (point A, point B, bus stops).
const String routeCodeCollection = 'route_code';

/// Data for one route in the route_code table.
class RouteCodeData {
  final String routeCode;
  final LatLng pointA;
  final LatLng pointB;
  final List<({String name, LatLng position})> busStops;

  const RouteCodeData({
    required this.routeCode,
    required this.pointA,
    required this.pointB,
    this.busStops = const [],
  });

  Map<String, dynamic> toMap() {
    return {
      'routeCode': routeCode,
      'pointA': {'latitude': pointA.latitude, 'longitude': pointA.longitude},
      'pointB': {'latitude': pointB.latitude, 'longitude': pointB.longitude},
      'busStops': busStops.map((s) => {
        'name': s.name,
        'latitude': s.position.latitude,
        'longitude': s.position.longitude,
      }).toList(),
      'updatedAt': FieldValue.serverTimestamp(),
    };
  }

  static RouteCodeData? fromMap(String code, Map<String, dynamic>? data) {
    if (data == null) return null;

    LatLng? readEndpoint(dynamic v) {
      if (v is GeoPoint) return LatLng(v.latitude, v.longitude);
      final m = firestoreMap(v);
      if (m == null) return null;
      final lat = (m['latitude'] as num?)?.toDouble();
      final lng = (m['longitude'] as num?)?.toDouble();
      if (lat != null && lng != null) return LatLng(lat, lng);
      return null;
    }

    final rawStops = data['busStops'] ?? data['bus_stop'];
    final List<dynamic> stopsList =
        rawStops is List ? List<dynamic>.from(rawStops) : <dynamic>[];
    final busStops = <({String name, LatLng position})>[];
    for (var i = 0; i < stopsList.length; i++) {
      final s = stopsList[i];
      if (s is GeoPoint) {
        busStops.add(
          (name: 'Stop ${i + 1}', position: LatLng(s.latitude, s.longitude)),
        );
        continue;
      }
      final sm = firestoreMap(s);
      if (sm == null) continue;
      final name = (sm['name'] as String?)?.trim() ?? '';
      final pos = RouteDataService.stopPositionFromFirestoreMap(sm);
      if (pos == null) continue;
      busStops.add(
        (
          name: name.isNotEmpty ? name : 'Stop ${i + 1}',
          position: pos,
        ),
      );
    }

    LatLng? pointA = readEndpoint(data['pointA']);
    LatLng? pointB = readEndpoint(data['pointB']);

    if (busStops.length >= 2) {
      pointA ??= busStops.first.position;
      pointB ??= busStops.last.position;
    } else if (busStops.length == 1) {
      pointA ??= busStops.first.position;
      pointB ??= busStops.first.position;
    }

    if (pointA == null || pointB == null) return null;

    return RouteCodeData(
      routeCode: code,
      pointA: pointA,
      pointB: pointB,
      busStops: busStops,
    );
  }
}

/// Service for the route_code collection: stores driver route code with point A, point B, and bus stops.
class RouteCodeService {
  static Future<bool> save({
    required String routeCode,
    required LatLng pointA,
    required LatLng pointB,
    required List<({String name, LatLng position})> busStops,
    String? name,
    String? description,
  }) async {
    try {
      final doc = FirebaseFirestore.instance.collection(routeCodeCollection).doc(routeCode);
      final stopMaps = busStops
          .map((s) => {
                'name': s.name,
                'latitude': s.position.latitude,
                'longitude': s.position.longitude,
              })
          .toList();
      final data = {
        'routeCode': routeCode,
        'pointA': {'latitude': pointA.latitude, 'longitude': pointA.longitude},
        'pointB': {'latitude': pointB.latitude, 'longitude': pointB.longitude},
        'busStops': stopMaps,
        // Snake_case alias (same data) for dashboards / exports.
        'bus_stop': stopMaps,
        if (name != null) 'name': name,
        if (description != null) 'description': description,
        'updatedAt': FieldValue.serverTimestamp(),
      };
      await doc.set(data, SetOptions(merge: true));
      print('✅ [RouteCodeService] Saved route_code $routeCode (point A, point B, ${busStops.length} bus stops)');
      return true;
    } catch (e) {
      print('❌ [RouteCodeService] Error saving: $e');
      return false;
    }
  }

  static Set<String> _routeCodeDocVariants(String code) {
    final t = code.trim();
    if (t.isEmpty) return const {};
    return {t, t.toUpperCase(), t.toLowerCase()};
  }

  /// Fetches one route by code. Returns null if not found or invalid.
  static Future<RouteCodeData?> get(String routeCode) async {
    try {
      for (final id in _routeCodeDocVariants(routeCode)) {
        final doc = await FirebaseFirestore.instance
            .collection(routeCodeCollection)
            .doc(id)
            .get();
        if (!doc.exists) continue;
        final data = firestoreMap(doc.data());
        final parsed = RouteCodeData.fromMap(routeCode.trim().toUpperCase(), data);
        if (parsed != null) return parsed;
      }
      return null;
    } catch (e) {
      print('❌ [RouteCodeService] Error getting $routeCode: $e');
      return null;
    }
  }

  /// Writes [pointA]/[pointB]/[busStops] from `routes` catalog + current GPS (point A when possible).
  static Future<bool> syncRouteCodeWithGpsAndRoutes(String routeCodeRaw) async {
    final logicalCode = routeCodeRaw.trim().toUpperCase();
    if (logicalCode.isEmpty) return false;

    String docId = logicalCode;
    for (final id in _routeCodeDocVariants(routeCodeRaw)) {
      final d = await FirebaseFirestore.instance
          .collection(routeCodeCollection)
          .doc(id)
          .get();
      if (d.exists) {
        docId = id;
        break;
      }
    }

    final routeDoc = await RouteDataService.getRouteFromFirestore(logicalCode);
    var catalogStops = RouteDataService.stopsFromRoutesDocument(routeDoc);
    if (catalogStops.length < 2) {
      final apiStops = await RouteDataService.fetchBackendRouteStopsOnly(logicalCode);
      if (apiStops.isNotEmpty) {
        catalogStops = apiStops;
      }
    }

    Position? gps;
    try {
      final enabled = await Geolocator.isLocationServiceEnabled();
      if (enabled) {
        var perm = await Geolocator.checkPermission();
        if (perm == LocationPermission.denied) {
          perm = await Geolocator.requestPermission();
        }
        if (perm == LocationPermission.whileInUse ||
            perm == LocationPermission.always) {
          gps = await Geolocator.getCurrentPosition(
            desiredAccuracy: LocationAccuracy.medium,
            timeLimit: const Duration(seconds: 15),
          );
        }
      }
    } catch (e) {
      debugPrint('[RouteCodeService] GPS during sync: $e');
    }

    late LatLng pointA;
    late LatLng pointB;
    var busStops = catalogStops;

    if (catalogStops.length >= 2) {
      pointA = gps != null
          ? LatLng(gps.latitude, gps.longitude)
          : catalogStops.first.position;
      pointB = catalogStops.last.position;
    } else if (catalogStops.length == 1) {
      pointA = gps != null
          ? LatLng(gps.latitude, gps.longitude)
          : catalogStops.first.position;
      pointB = catalogStops.first.position;
    } else {
      if (gps != null) {
        pointA = LatLng(gps.latitude, gps.longitude);
        pointB = LatLng(gps.latitude + 0.0045, gps.longitude + 0.0045);
        busStops = [];
      } else {
        debugPrint(
          '[RouteCodeService] No routes.stops and no GPS for $logicalCode — skip sync',
        );
        return false;
      }
    }

    final name = routeDoc != null
        ? (routeDoc['name'] as String?)?.trim()
        : null;
    final description = routeDoc != null
        ? (routeDoc['description'] as String?)?.trim()
        : null;

    return save(
      routeCode: docId,
      pointA: pointA,
      pointB: pointB,
      busStops: busStops,
      name: (name != null && name.isNotEmpty) ? name : null,
      description:
          (description != null && description.isNotEmpty) ? description : null,
    );
  }

  /// Returns all route codes in the collection.
  static Future<List<RouteCodeData>> getAll() async {
    try {
      final snap = await FirebaseFirestore.instance.collection(routeCodeCollection).get();
      final list = <RouteCodeData>[];
      for (final doc in snap.docs) {
        final data = RouteCodeData.fromMap(doc.id, doc.data());
        if (data != null) list.add(data);
      }
      return list;
    } catch (e) {
      print('❌ [RouteCodeService] Error getAll: $e');
      return [];
    }
  }

  /// Deletes a route code document.
  static Future<bool> delete(String routeCode) async {
    try {
      await FirebaseFirestore.instance.collection(routeCodeCollection).doc(routeCode).delete();
      print('✅ [RouteCodeService] Deleted $routeCode');
      return true;
    } catch (e) {
      print('❌ [RouteCodeService] Error delete: $e');
      return false;
    }
  }
}
