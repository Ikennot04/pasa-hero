import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';

import '../../../core/services/bus_stops_service.dart';
import '../../../core/services/route_path_coordinates_service.dart';

/// Live [Marker]s from Firestore: either [bus_stops] or route-scoped stops on [routes]/[route_code].
class FirestoreBusStopMarkersStream {
  FirestoreBusStopMarkersStream._();

  /// Firestore nested maps are often [Map<Object?, Object?>], not [Map<String, dynamic>].
  static Map<String, dynamic>? asStringKeyedMap(dynamic value) {
    if (value == null) return null;
    if (value is Map<String, dynamic>) return value;
    if (value is Map) {
      return value.map((k, v) => MapEntry(k.toString(), v));
    }
    return null;
  }

  /// When [routeCode] is null/empty, listens to the [bus_stops] collection.
  /// Otherwise resolves [routes] or [route_code] and listens to that document's stop list.
  static Stream<List<Marker>> watchStopMarkers({
    FirebaseFirestore? firestore,
    String? routeCode,
    required BitmapDescriptor icon,
  }) {
    final db = firestore ?? FirebaseFirestore.instance;
    final rc = routeCode?.trim();
    if (rc == null || rc.isEmpty) {
      return _watchBusStopsCollection(db, icon);
    }
    return _watchResolvedRouteDocument(db, rc, icon);
  }

  static Stream<List<Marker>> _watchBusStopsCollection(
    FirebaseFirestore db,
    BitmapDescriptor icon,
  ) {
    return db.collection(busStopsCollection).snapshots().map((snap) {
      final used = <String>{};
      final list = <Marker>[];
      for (final doc in snap.docs) {
        final data = asStringKeyedMap(doc.data());
        if (data == null) continue;
        final m = markerFromFirestoreDoc(doc.id, data, icon, used);
        if (m != null) list.add(m);
      }
      return list;
    });
  }

  static Stream<List<Marker>> _watchResolvedRouteDocument(
    FirebaseFirestore db,
    String code,
    BitmapDescriptor icon,
  ) {
    return Stream.fromFuture(_resolveRouteDocument(db, code)).asyncExpand((target) {
      if (target == null) {
        return Stream<List<Marker>>.value(const <Marker>[]);
      }
      return db.collection(target.collection).doc(target.docId).snapshots().map((snap) {
        final data = asStringKeyedMap(snap.data());
        if (data == null) return const <Marker>[];
        if (target.collection == RoutePathCoordinatesService.routesCollection) {
          return markersFromStopsArray(data['stops'] ?? data['bus_stop'], icon);
        }
        return markersFromRouteCodeDocument(data, icon);
      });
    });
  }

  static Future<({String collection, String docId})?> _resolveRouteDocument(
    FirebaseFirestore db,
    String code,
  ) async {
    final variants = _docIdVariants(code);
    for (final id in variants) {
      try {
        final routesSnap = await db
            .collection(RoutePathCoordinatesService.routesCollection)
            .doc(id)
            .get();
        final rcSnap = await db
            .collection(RoutePathCoordinatesService.routeCodeCollection)
            .doc(id)
            .get();

        final routesData = asStringKeyedMap(routesSnap.data());
        final stopsField = routesData?['stops'] ?? routesData?['bus_stop'];
        final hasStopsArray =
            stopsField is List && stopsField.isNotEmpty;

        if (hasStopsArray) {
          return (collection: RoutePathCoordinatesService.routesCollection, docId: id);
        }
        if (rcSnap.exists) {
          return (collection: RoutePathCoordinatesService.routeCodeCollection, docId: id);
        }
        if (routesSnap.exists) {
          return (collection: RoutePathCoordinatesService.routesCollection, docId: id);
        }
      } catch (_) {}
    }
    return null;
  }

  static Set<String> _docIdVariants(String code) {
    final t = code.trim();
    if (t.isEmpty) return const {};
    return {t, t.toUpperCase(), t.toLowerCase()};
  }

  /// Stops array inside a [routes] document.
  static List<Marker> markersFromStopsArray(dynamic raw, BitmapDescriptor icon) {
    if (raw is! List) return const [];
    final used = <String>{};
    final out = <Marker>[];
    for (var i = 0; i < raw.length; i++) {
      final item = raw[i];
      final itemMap = asStringKeyedMap(item);
      if (itemMap == null) continue;
      final name = itemMap['name'] as String? ?? 'Stop ${i + 1}';
      final pos = latLngFromStopMap(itemMap);
      if (pos == null) continue;
      final idVal = allocateMarkerId(name, 'r$i', used);
      used.add(idVal);
      out.add(
        Marker(
          markerId: MarkerId(idVal),
          position: pos,
          icon: icon,
          infoWindow: InfoWindow(
            title: name,
            snippet: buildSnippet(
              route: itemMap['route'] as String?,
              status: itemMap['status'] as String?,
            ),
          ),
        ),
      );
    }
    return out;
  }

  /// [route_code] document: [busStops] and optionally endpoints.
  static List<Marker> markersFromRouteCodeDocument(
    Map<String, dynamic> data,
    BitmapDescriptor icon,
  ) {
    final used = <String>{};
    final out = <Marker>[];
    final raw = data['busStops'] ?? data['bus_stop'];
    final stopsList = raw is List ? List<dynamic>.from(raw) : <dynamic>[];
    for (var i = 0; i < stopsList.length; i++) {
      final s = stopsList[i];
      if (s is GeoPoint) {
        final idVal = allocateMarkerId('Stop ${i + 1}', 'bs$i', used);
        used.add(idVal);
        out.add(
          Marker(
            markerId: MarkerId(idVal),
            position: LatLng(s.latitude, s.longitude),
            icon: icon,
            infoWindow: InfoWindow(title: 'Stop ${i + 1}', snippet: ''),
          ),
        );
        continue;
      }
      final sm = asStringKeyedMap(s);
      if (sm == null) continue;
      final name = sm['name'] as String? ?? 'Stop ${i + 1}';
      final pos = latLngFromStopMap(sm);
      if (pos == null) continue;
      final idVal = allocateMarkerId(name, 'bs$i', used);
      used.add(idVal);
      out.add(
        Marker(
          markerId: MarkerId(idVal),
          position: pos,
          icon: icon,
          infoWindow: InfoWindow(
            title: name,
            snippet: buildSnippet(
              route: sm['route'] as String?,
              status: sm['status'] as String?,
            ),
          ),
        ),
      );
    }
    if (out.isNotEmpty) return out;

    final a = latLngFromPointField(data['pointA']);
    final b = latLngFromPointField(data['pointB']);
    if (a != null) {
      final idA = allocateMarkerId('Point A', 'pa', used);
      used.add(idA);
      out.add(
        Marker(
          markerId: MarkerId(idA),
          position: a,
          icon: icon,
          infoWindow: const InfoWindow(title: 'Point A', snippet: 'Route start'),
        ),
      );
    }
    if (b != null) {
      final idB = allocateMarkerId('Point B', 'pb', used);
      used.add(idB);
      out.add(
        Marker(
          markerId: MarkerId(idB),
          position: b,
          icon: icon,
          infoWindow: const InfoWindow(title: 'Point B', snippet: 'Route end'),
        ),
      );
    }
    return out;
  }

  static Marker? markerFromFirestoreDoc(
    String docId,
    Map<String, dynamic> data,
    BitmapDescriptor icon,
    Set<String> used,
  ) {
    final name = data['name'] as String? ?? 'Stop';
    final pos = latLngFromStopMap(data);
    if (pos == null) return null;
    final idVal = allocateMarkerId(name, docId, used);
    used.add(idVal);
    final status = data['status'] as String? ?? '';
    final route = data['route'] as String? ?? '';
    return Marker(
      markerId: MarkerId(idVal),
      position: pos,
      icon: icon,
      infoWindow: InfoWindow(
        title: name,
        snippet: buildSnippet(route: route.isEmpty ? null : route, status: status.isEmpty ? null : status),
      ),
    );
  }

  static String allocateMarkerId(String name, String uniqueSuffix, Set<String> used) {
    var base = name.replaceAll(RegExp(r'[^a-zA-Z0-9_]'), '_');
    if (base.isEmpty) base = 'Stop';
    if (base.length > 40) base = base.substring(0, 40);
    var id = '${base}_$uniqueSuffix';
    if (!used.contains(id)) return id;
    var n = 1;
    while (used.contains('${id}_$n')) {
      n++;
    }
    return '${id}_$n';
  }

  static String buildSnippet({String? route, String? status}) {
    final parts = <String>[];
    if (route != null && route.isNotEmpty) parts.add(route);
    if (status != null && status.isNotEmpty) parts.add(status);
    return parts.join(' · ');
  }

  static LatLng? latLngFromStopMap(Map<String, dynamic> m) {
    for (final key in ['location', 'position', 'geo', 'coordinates']) {
      final v = m[key];
      if (v is GeoPoint) return LatLng(v.latitude, v.longitude);
    }
    final lat = toDouble(m['lat']) ?? toDouble(m['latitude']);
    final lng = toDouble(m['lng']) ?? toDouble(m['longitude']);
    if (lat != null && lng != null) return LatLng(lat, lng);
    return null;
  }

  static LatLng? latLngFromPointField(dynamic v) {
    if (v is GeoPoint) return LatLng(v.latitude, v.longitude);
    final m = asStringKeyedMap(v);
    if (m != null) {
      final lat = toDouble(m['latitude']);
      final lng = toDouble(m['longitude']);
      if (lat != null && lng != null) return LatLng(lat, lng);
    }
    return null;
  }

  static double? toDouble(dynamic v) {
    if (v == null) return null;
    if (v is double) return v;
    if (v is int) return v.toDouble();
    if (v is num) return v.toDouble();
    return double.tryParse(v.toString());
  }
}
