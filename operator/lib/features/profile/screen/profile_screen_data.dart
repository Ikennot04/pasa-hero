import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';

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

/// Dynamic route catalog used by operator profile/selection.
///
/// Source priority:
/// 1) `route_code` (primary)
/// 2) `routes`
class RouteCatalogService {
  static const String _routeCodeCollection = 'route_code';
  static const String _routesCollection = 'routes';

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
        final data = doc.data();
        final code = ((data['code'] as String?)?.trim().isNotEmpty ?? false)
            ? (data['code'] as String).trim()
            : doc.id.trim();
        if (code.isEmpty) continue;
        await rcRef.doc(code).set({
          'routeCode': code,
          if ((data['name'] as String?)?.trim().isNotEmpty ?? false)
            'name': (data['name'] as String).trim(),
          if ((data['description'] as String?)?.trim().isNotEmpty ?? false)
            'description': (data['description'] as String).trim(),
          'updatedAt': FieldValue.serverTimestamp(),
        }, SetOptions(merge: true));
      }

    } catch (_) {
      // Ignore seed errors; fetch method returns Firestore rows (or empty).
    }
  }

  static Future<List<RouteInfo>> fetchAvailableRoutes() async {
    final byCode = <String, RouteInfo>{};
    await ensureRouteCodeSeededFromRoutes();

    try {
      final snap = await FirebaseFirestore.instance.collection(_routeCodeCollection).get();
      for (final doc in snap.docs) {
        final m = doc.data();
        final code = ((m['routeCode'] as String?)?.trim().isNotEmpty ?? false)
            ? (m['routeCode'] as String).trim()
            : doc.id.trim();
        _put(
          byCode,
          codeRaw: code,
          nameRaw: m['name'] as String?,
          descriptionRaw: m['description'] as String?,
        );
      }
    } catch (_) {}

    try {
      final snap = await FirebaseFirestore.instance.collection(_routesCollection).get();
      for (final doc in snap.docs) {
        final m = doc.data();
        final code = ((m['code'] as String?)?.trim().isNotEmpty ?? false)
            ? (m['code'] as String).trim()
            : doc.id.trim();
        _put(
          byCode,
          codeRaw: code,
          nameRaw: m['name'] as String?,
          descriptionRaw: m['description'] as String?,
        );
      }
    } catch (_) {}

    final list = byCode.values.toList();
    list.sort((a, b) => a.name.toLowerCase().compareTo(b.name.toLowerCase()));
    return list;
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
  /// Fetches a route definition from Firestore by code.
  /// Returns map with code, name, description, stops (list of { name, latitude, longitude }).
  static Future<Map<String, dynamic>?> getRouteFromFirestore(String code) async {
    try {
      final doc = await FirebaseFirestore.instance
          .collection(_routesCollection)
          .doc(code)
          .get();

      if (doc.exists && doc.data() != null) {
        return doc.data();
      }
      return null;
    } catch (e) {
      print('❌ [RouteDataService] Error getting route $code: $e');
      return null;
    }
  }

  static List<({String name, LatLng position})> _parseStopsFromRoutesDoc(
    Map<String, dynamic>? data,
  ) {
    if (data == null) return const [];
    final stopsList = data['stops'] as List<dynamic>?;
    if (stopsList == null || stopsList.isEmpty) return const [];
    final out = <({String name, LatLng position})>[];
    for (int i = 0; i < stopsList.length; i++) {
      final stop = stopsList[i];
      if (stop is! Map<String, dynamic>) continue;
      final name = (stop['name'] as String?)?.trim();
      final lat = (stop['latitude'] as num?)?.toDouble();
      final lng = (stop['longitude'] as num?)?.toDouble();
      if (name == null || name.isEmpty || lat == null || lng == null) continue;
      out.add((name: name, position: LatLng(lat, lng)));
    }
    return out;
  }

  /// Dynamic route stops: prefer `route_code.busStops`, then `routes.stops`.
  static Future<List<({String name, LatLng position})>> getRouteStops(
    String routeCode,
  ) async {
    final code = routeCode.trim();
    if (code.isEmpty) return const [];

    try {
      final fromRouteCode = await RouteCodeService.get(code);
      final rcStops = fromRouteCode?.busStops ?? const <({String name, LatLng position})>[];
      if (rcStops.length >= 2) return rcStops;
    } catch (_) {}

    final routeDoc = await getRouteFromFirestore(code);
    return _parseStopsFromRoutesDoc(routeDoc);
  }

  /// Dynamic route coordinates used by map highlight/start-end markers.
  static Future<RouteCoordinates?> getRouteCoordinatesFromFirestore(String routeCode) async {
    final code = routeCode.trim();
    if (code.isEmpty) return null;

    try {
      final fromRouteCode = await RouteCodeService.get(code);
      if (fromRouteCode != null) {
        final stops = fromRouteCode.busStops.map((s) => s.position).toList();
        final hasStops = stops.length >= 2;
        return RouteCoordinates(
          startPoint: hasStops ? stops.first : fromRouteCode.pointA,
          endPoint: hasStops ? stops.last : fromRouteCode.pointB,
          stops: hasStops ? stops : [fromRouteCode.pointA, fromRouteCode.pointB],
        );
      }
    } catch (_) {}

    final stops = await getRouteStops(code);
    if (stops.length < 2) return null;
    return RouteCoordinates(
      startPoint: stops.first.position,
      endPoint: stops.last.position,
      stops: stops.map((s) => s.position).toList(),
    );
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
    final pointAObj = data['pointA'] as Map<String, dynamic>?;
    final pointBObj = data['pointB'] as Map<String, dynamic>?;
    if (pointAObj == null || pointBObj == null) return null;
    final latA = (pointAObj['latitude'] as num?)?.toDouble();
    final lngA = (pointAObj['longitude'] as num?)?.toDouble();
    final latB = (pointBObj['latitude'] as num?)?.toDouble();
    final lngB = (pointBObj['longitude'] as num?)?.toDouble();
    if (latA == null || lngA == null || latB == null || lngB == null) return null;
    final stopsList = data['busStops'] as List<dynamic>? ?? [];
    final busStops = <({String name, LatLng position})>[];
    for (final s in stopsList) {
      if (s is! Map<String, dynamic>) continue;
      final name = s['name'] as String? ?? '';
      final lat = (s['latitude'] as num?)?.toDouble();
      final lng = (s['longitude'] as num?)?.toDouble();
      if (lat != null && lng != null) busStops.add((name: name, position: LatLng(lat, lng)));
    }
    return RouteCodeData(
      routeCode: code,
      pointA: LatLng(latA, lngA),
      pointB: LatLng(latB, lngB),
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
      final data = {
        'routeCode': routeCode,
        'pointA': {'latitude': pointA.latitude, 'longitude': pointA.longitude},
        'pointB': {'latitude': pointB.latitude, 'longitude': pointB.longitude},
        'busStops': busStops.map((s) => {
          'name': s.name,
          'latitude': s.position.latitude,
          'longitude': s.position.longitude,
        }).toList(),
        if (name != null) 'name': name,
        if (description != null) 'description': description,
        'updatedAt': FieldValue.serverTimestamp(),
      };
      await doc.set(data);
      print('✅ [RouteCodeService] Saved route_code $routeCode (point A, point B, ${busStops.length} bus stops)');
      return true;
    } catch (e) {
      print('❌ [RouteCodeService] Error saving: $e');
      return false;
    }
  }

  /// Fetches one route by code. Returns null if not found or invalid.
  static Future<RouteCodeData?> get(String routeCode) async {
    try {
      final doc = await FirebaseFirestore.instance
          .collection(routeCodeCollection)
          .doc(routeCode)
          .get();
      return RouteCodeData.fromMap(routeCode, doc.data());
    } catch (e) {
      print('❌ [RouteCodeService] Error getting $routeCode: $e');
      return null;
    }
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
