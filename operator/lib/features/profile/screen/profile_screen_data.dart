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
      description: 'Bus route with 10 stops (UCLM to MCWD)',
    ),
    RouteInfo(
      code: '25',
      name: 'Liloan - White Gold Terminal',
      description: 'Route from Liloan to White Gold Terminal',
    ),
  ];

  /// Bus stop data with name and position for Route1 (saved to Firestore).
  static const List<({String name, LatLng position})> route1Stops = [
    (name: 'UCLM', position: LatLng(10.32467, 123.95312)),
    (name: "nature's spring", position: LatLng(10.32702, 123.95190)),
    (name: 'MGA Arcade', position: LatLng(10.32984, 123.94857)),
    (name: 'Cortes Ave.', position: LatLng(10.32923, 123.94709)),
    (name: 'School right', position: LatLng(10.32476, 123.94417)),
    (name: 'School left', position: LatLng(10.32457, 123.94420)),
    (name: 'Badminton', position: LatLng(10.32411, 123.94209)),
    (name: 'Centro Barangay', position: LatLng(10.32454, 123.94166)),
    (name: 'City Hall', position: LatLng(10.32730, 123.94312)),
    (name: 'MCWD', position: LatLng(10.32744, 123.95144)),
  ];

  /// Get route coordinates by code.
  /// Returns the start and end points for drawing the route on the map.
  static RouteCoordinates? getRouteCoordinates(String code) {
    switch (code) {
      case route1Code:
        if (route1Stops.isEmpty) return null;
        return RouteCoordinates(
          startPoint: route1Stops.first.position,
          endPoint: route1Stops.last.position,
          stops: route1Stops.map((s) => s.position).toList(),
        );
      case '25':
        return const RouteCoordinates(
          startPoint: LatLng(10.32467, 123.95312),
          endPoint: LatLng(10.32744, 123.95144),
          stops: [
            LatLng(10.32467, 123.95312),
            LatLng(10.32702, 123.95190),
            LatLng(10.32984, 123.94857),
            LatLng(10.32923, 123.94709),
            LatLng(10.32476, 123.94417),
            LatLng(10.32457, 123.94420),
            LatLng(10.32411, 123.94209),
            LatLng(10.32454, 123.94166),
            LatLng(10.32730, 123.94312),
            LatLng(10.32744, 123.95144),
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
  /// Call on app start so the route is saved in the database.
  static Future<bool> ensureRoute1InFirestore() async {
    try {
      final docRef = FirebaseFirestore.instance
          .collection(_routesCollection)
          .doc(AvailableRoutes.route1Code);

      final doc = await docRef.get();
      if (doc.exists) {
        print('✅ [RouteDataService] Route1 already exists in Firestore');
        return true;
      }

      final stopsData = AvailableRoutes.route1Stops.map((stop) => {
        'name': stop.name,
        'latitude': stop.position.latitude,
        'longitude': stop.position.longitude,
      }).toList();

      await docRef.set({
        'code': AvailableRoutes.route1Code,
        'name': 'Route1',
        'description': 'Bus route with 10 stops (UCLM to MCWD)',
        'stops': stopsData,
        'updatedAt': FieldValue.serverTimestamp(),
      });

      print('✅ [RouteDataService] Route1 saved to Firestore with ${stopsData.length} bus stops');
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
