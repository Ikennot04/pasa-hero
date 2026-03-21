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

/// Available routes for operators.
class AvailableRoutes {
  static const String route1Code = 'Route1';

  static const List<RouteInfo> routes = [
    RouteInfo(
      code: route1Code,
      name: 'Route1',
      description: 'UCLM → … → City Hall (10 stops, one highlighted path)',
    ),
    RouteInfo(
      code: '25',
      name: 'Liloan - White Gold Terminal',
      description: 'Route from Liloan to White Gold Terminal',
    ),
  ];

  /// Bus stop data with name and position for Route1 (saved to Firestore).
  /// Order matches the official stop sequence (1 → 10); highlight follows this order only.
  static const List<({String name, LatLng position})> route1Stops = [
    (name: 'UCLM', position: LatLng(10.32467, 123.95312)),
    (name: "nature's spring", position: LatLng(10.32702, 123.95190)),
    (name: 'MCWD', position: LatLng(10.32744, 123.95144)),
    (name: 'MGA Arcade', position: LatLng(10.32984, 123.94857)),
    (name: 'Cortes Ave.', position: LatLng(10.32923, 123.94709)),
    (name: 'School right', position: LatLng(10.32476, 123.94417)),
    (name: 'School left', position: LatLng(10.32457, 123.94420)),
    (name: 'Badminton', position: LatLng(10.32411, 123.94209)),
    (name: 'Centro Barangay', position: LatLng(10.32454, 123.94166)),
    (name: 'City Hall', position: LatLng(10.32730, 123.94312)),
  ];

  /// Terminals for legacy fallbacks (indices in [route1Stops]: UCLM = 0, City Hall = 9).
  static const String route1TerminusStart = 'City Hall';
  static const String route1TerminusEnd = 'UCLM';

  /// Canonical order for markers + Directions waypoints (must match [route1Stops] sequence).
  static const List<String> route1HighlightStopNamesInOrder = [
    'UCLM',
    "nature's spring",
    'MCWD',
    'MGA Arcade',
    'Cortes Ave.',
    'School right',
    'School left',
    'Badminton',
    'Centro Barangay',
    'City Hall',
  ];

  /// Stops between City Hall and UCLM in travel order (matches [route1Stops] segment, City Hall first).
  static List<({String name, LatLng position})> route1StopsOrderedCityHallToUclm(
    List<({String name, LatLng position})> stops,
  ) {
    int? idxStart;
    int? idxEnd;
    for (int i = 0; i < stops.length; i++) {
      final n = _normalizeStopNameKey(stops[i].name);
      if (n == _normalizeStopNameKey(route1TerminusStart)) idxStart = i;
      if (n == _normalizeStopNameKey(route1TerminusEnd)) idxEnd = i;
    }
    if (idxStart == null || idxEnd == null) {
      return List<({String name, LatLng position})>.from(stops);
    }
    if (idxStart == idxEnd) return [stops[idxStart]];
    final lo = idxStart < idxEnd ? idxStart : idxEnd;
    final hi = idxStart < idxEnd ? idxEnd : idxStart;
    final segment = stops.sublist(lo, hi + 1);
    if (idxStart > idxEnd) {
      return segment.reversed.toList();
    }
    return segment;
  }

  /// Waypoints for Directions / map: same order as [route1HighlightStopNamesInOrder] only.
  static List<({String name, LatLng position})> route1StopsForHighlightRoad(
    List<({String name, LatLng position})> stops,
  ) {
    final byName = <String, ({String name, LatLng position})>{};
    for (final s in stops) {
      byName[_normalizeStopNameKey(s.name)] = s;
    }
    final out = <({String name, LatLng position})>[];
    for (final name in route1HighlightStopNamesInOrder) {
      final found = byName[_normalizeStopNameKey(name)];
      if (found != null) out.add(found);
    }
    if (out.length >= 2) return out;
    return route1StopsOrderedCityHallToUclm(stops);
  }

  static String _normalizeStopNameKey(String name) {
    return name
        .trim()
        .toLowerCase()
        .replaceAll('\u2019', "'")
        .replaceAll('\u2018', "'");
  }

  /// Get route coordinates by code.
  /// Returns the start and end points for drawing the route on the map.
  static RouteCoordinates? getRouteCoordinates(String code) {
    switch (code) {
      case route1Code:
        if (route1Stops.isEmpty) return null;
        final ordered = route1StopsForHighlightRoad(route1Stops);
        if (ordered.isEmpty) return null;
        return RouteCoordinates(
          startPoint: ordered.first.position,
          endPoint: ordered.last.position,
          stops: ordered.map((s) => s.position).toList(),
        );
      case '25':
        return const RouteCoordinates(
          startPoint: LatLng(10.32467, 123.95312),
          endPoint: LatLng(10.32730, 123.94312),
          stops: [
            LatLng(10.32467, 123.95312),
            LatLng(10.32702, 123.95190),
            LatLng(10.32744, 123.95144),
            LatLng(10.32984, 123.94857),
            LatLng(10.32923, 123.94709),
            LatLng(10.32476, 123.94417),
            LatLng(10.32457, 123.94420),
            LatLng(10.32411, 123.94209),
            LatLng(10.32454, 123.94166),
            LatLng(10.32730, 123.94312),
          ],
        );
      default:
        return null;
    }
  }

  /// Get route by code.
  static RouteInfo? getRouteByCode(String code) {
    try {
      return routes.firstWhere((route) => route.code == code);
    } catch (_) {
      return null;
    }
  }

  /// Get all route codes.
  static List<String> getRouteCodes() {
    return routes.map((route) => route.code).toList();
  }
}

/// Service for managing operator profile data in Firestore.
class ProfileDataService {
  static const String _usersCollection = 'users';

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
        final data = doc.data();
        // Try both field names for compatibility
        return data?['routeCode'] as String? ?? data?['route_code'] as String?;
      }
      return null;
    } catch (e) {
      print('❌ [ProfileDataService] Error getting route code: $e');
      return null;
    }
  }

  /// Update operator's route code in Firestore.
  static Future<bool> updateOperatorRouteCode(String routeCode) async {
    final user = FirebaseAuth.instance.currentUser;
    if (user == null) return false;

    try {
      await FirebaseFirestore.instance
          .collection(_usersCollection)
          .doc(user.uid)
          .update({
        'routeCode': routeCode.trim().toUpperCase(),
        'route_code': routeCode.trim().toUpperCase(), // Also store as snake_case
        'updatedAt': FieldValue.serverTimestamp(),
      });
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
  /// Ensures Route1 exists in Firestore with all bus stop coordinates.
  /// Also seeds the route_code table with Route1 (point A, point B, bus stops).
  static Future<bool> ensureRoute1InFirestore() async {
    try {
      final docRef = FirebaseFirestore.instance
          .collection(_routesCollection)
          .doc(AvailableRoutes.route1Code);

      final stopsData = AvailableRoutes.route1Stops.map((stop) => {
        'name': stop.name,
        'latitude': stop.position.latitude,
        'longitude': stop.position.longitude,
      }).toList();

      final doc = await docRef.get();
      if (doc.exists) {
        print('✅ [RouteDataService] Route1 exists; merging latest stops (${stopsData.length})');
      } else {
        print('✅ [RouteDataService] Creating Route1 in Firestore with ${stopsData.length} bus stops');
      }

      await docRef.set(
        {
          'code': AvailableRoutes.route1Code,
          'name': 'Route1',
          'description': 'Bus route: UCLM → City Hall (10 stops, canonical order)',
          'stops': stopsData,
          'updatedAt': FieldValue.serverTimestamp(),
        },
        SetOptions(merge: true),
      );

      // Save hardcoded bus stop pin locations into route_code for Route1 (always update so pins are in the table)
      final ordered = AvailableRoutes.route1StopsForHighlightRoad(
        AvailableRoutes.route1Stops.map((s) => (name: s.name, position: s.position)).toList(),
      );
      await RouteCodeService.save(
        routeCode: AvailableRoutes.route1Code,
        pointA: ordered.first.position,
        pointB: ordered.last.position,
        busStops: ordered,
        name: 'Route1',
        description: 'UCLM → City Hall (10 stops, canonical order)',
      );

      return true;
    } catch (e) {
      print('❌ [RouteDataService] Error ensuring Route1 in Firestore: $e');
      return false;
    }
  }

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
