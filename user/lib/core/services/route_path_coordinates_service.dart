import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';

/// Reads route geometry from Firestore [routes] and [route_code] for map fit + highlight.
class RoutePathCoordinatesService {
  RoutePathCoordinatesService({FirebaseFirestore? firestore})
      : _db = firestore ?? FirebaseFirestore.instance;

  final FirebaseFirestore _db;

  static const String routesCollection = 'routes';
  static const String routeCodeCollection = 'route_code';

  /// Converts Firestore [GeoPoint] values to [LatLng].
  static List<LatLng> geoPointsToLatLng(Iterable<GeoPoint> geo) =>
      geo.map((g) => LatLng(g.latitude, g.longitude)).toList();

  /// Ordered path for polyline + bounds: prefers [coordinates], then [routes.stops], then [route_code].
  Future<List<LatLng>> fetchRoutePathLatLng(String routeCode) async {
    final code = routeCode.trim();
    if (code.isEmpty) return const [];

    final routesData = await _getRoutesDocumentData(code);
    if (routesData != null) {
      final fromCoords = _latLngsFromCoordinatesField(routesData['coordinates']);
      if (fromCoords.length >= 2) return _dedupeConsecutive(fromCoords);

      final fromStops = _latLngsFromStopsField(routesData['stops']);
      if (fromStops.length >= 2) return _dedupeConsecutive(fromStops);
    }

    final rcData = await _getRouteCodeDocumentData(code);
    if (rcData != null) {
      final fromRc = _latLngsFromRouteCodeMap(rcData);
      if (fromRc.length >= 2) return _dedupeConsecutive(fromRc);
    }

    return const [];
  }

  /// Stop positions for camera bounds (routes [stops] + route_code [busStops] / endpoints).
  Future<List<LatLng>> fetchRouteStopPositionsLatLng(String routeCode) async {
    final code = routeCode.trim();
    if (code.isEmpty) return const [];

    final out = <LatLng>[];
    final routesData = await _getRoutesDocumentData(code);
    if (routesData != null) {
      out.addAll(_latLngsFromStopsField(routesData['stops']));
    }
    final rcData = await _getRouteCodeDocumentData(code);
    if (rcData != null) {
      out.addAll(_busStopsOnlyFromRouteCode(rcData));
    }
    return _dedupeConsecutive(out);
  }

  static List<LatLng> _busStopsOnlyFromRouteCode(Map<String, dynamic> data) {
    final rawBs = data['busStops'] ?? data['bus_stop'];
    final stopsList = rawBs is List ? List<dynamic>.from(rawBs) : <dynamic>[];
    final fromStops = <LatLng>[];
    for (final s in stopsList) {
      if (s is GeoPoint) {
        fromStops.add(LatLng(s.latitude, s.longitude));
        continue;
      }
      if (s is! Map) continue;
      final lat = (s['latitude'] as num?)?.toDouble();
      final lng = (s['longitude'] as num?)?.toDouble();
      if (lat != null && lng != null) {
        fromStops.add(LatLng(lat, lng));
      }
    }
    if (fromStops.isNotEmpty) return fromStops;

    final a = _latLngFromPointField(data['pointA']);
    final b = _latLngFromPointField(data['pointB']);
    if (a != null && b != null) return [a, b];
    return const [];
  }

  /// Fetches the [coordinates] array from `routes/{routeCode}` (GeoPoint or lat/lng maps).
  Future<List<GeoPoint>> fetchCoordinatesGeoPoints(String routeCode) async {
    final code = routeCode.trim();
    if (code.isEmpty) return const [];

    final data = await _getRoutesDocumentData(code);
    if (data == null) return const [];

    final raw = data['coordinates'];
    if (raw is! List<dynamic>) return const [];

    final out = <GeoPoint>[];
    for (final item in raw) {
      if (item is GeoPoint) {
        out.add(item);
        continue;
      }
      if (item is Map) {
        final lat = item['latitude'] ?? item['lat'];
        final lng = item['longitude'] ?? item['lng'];
        if (lat is num && lng is num) {
          out.add(GeoPoint(lat.toDouble(), lng.toDouble()));
        }
      }
    }
    return out;
  }

  Future<Map<String, dynamic>?> _getRoutesDocumentData(String code) async {
    for (final id in _docIdVariants(code)) {
      try {
        final doc = await _db.collection(routesCollection).doc(id).get();
        if (doc.exists && doc.data() != null) {
          return doc.data();
        }
      } catch (_) {}
    }
    return null;
  }

  Future<Map<String, dynamic>?> _getRouteCodeDocumentData(String code) async {
    for (final id in _docIdVariants(code)) {
      try {
        final doc = await _db.collection(routeCodeCollection).doc(id).get();
        if (doc.exists && doc.data() != null) {
          return doc.data();
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

  static List<LatLng> _latLngsFromCoordinatesField(dynamic raw) {
    if (raw is! List) return const [];
    final out = <LatLng>[];
    for (final item in raw) {
      if (item is GeoPoint) {
        out.add(LatLng(item.latitude, item.longitude));
        continue;
      }
      if (item is Map) {
        final lat = item['latitude'] ?? item['lat'];
        final lng = item['longitude'] ?? item['lng'];
        if (lat is num && lng is num) {
          out.add(LatLng(lat.toDouble(), lng.toDouble()));
        }
      }
    }
    return out;
  }

  static List<LatLng> _latLngsFromStopsField(dynamic raw) {
    if (raw is! List) return const [];
    final out = <LatLng>[];
    for (final item in raw) {
      if (item is GeoPoint) {
        out.add(LatLng(item.latitude, item.longitude));
        continue;
      }
      if (item is! Map) continue;
      final lat = item['latitude'] ?? item['lat'];
      final lng = item['longitude'] ?? item['lng'];
      if (lat is num && lng is num) {
        out.add(LatLng(lat.toDouble(), lng.toDouble()));
      }
    }
    return out;
  }

  static List<LatLng> _latLngsFromRouteCodeMap(Map<String, dynamic> data) {
    final rawBs = data['busStops'] ?? data['bus_stop'];
    final stopsList = rawBs is List ? List<dynamic>.from(rawBs) : <dynamic>[];
    final fromStops = <LatLng>[];
    for (final s in stopsList) {
      if (s is GeoPoint) {
        fromStops.add(LatLng(s.latitude, s.longitude));
        continue;
      }
      if (s is! Map) continue;
      final lat = (s['latitude'] as num?)?.toDouble();
      final lng = (s['longitude'] as num?)?.toDouble();
      if (lat != null && lng != null) {
        fromStops.add(LatLng(lat, lng));
      }
    }
    if (fromStops.length >= 2) return fromStops;

    final pointA = data['pointA'];
    final pointB = data['pointB'];
    final LatLng? a = _latLngFromPointField(pointA);
    final LatLng? b = _latLngFromPointField(pointB);
    if (a != null && b != null) {
      return [a, b];
    }
    return const [];
  }

  static LatLng? _latLngFromPointField(dynamic v) {
    if (v is GeoPoint) return LatLng(v.latitude, v.longitude);
    if (v is Map) {
      final lat = (v['latitude'] as num?)?.toDouble();
      final lng = (v['longitude'] as num?)?.toDouble();
      if (lat != null && lng != null) return LatLng(lat, lng);
    }
    return null;
  }

  static List<LatLng> _dedupeConsecutive(List<LatLng> points) {
    if (points.isEmpty) return points;
    final out = <LatLng>[points.first];
    for (var i = 1; i < points.length; i++) {
      final p = points[i];
      final q = out.last;
      if (p.latitude != q.latitude || p.longitude != q.longitude) {
        out.add(p);
      }
    }
    return out;
  }

  /// Non-empty [points] only. Expands degenerate bounds so [newLatLngBounds] is valid.
  static LatLngBounds latLngBoundsFromPoints(List<LatLng> points) {
    assert(points.isNotEmpty, 'points must be non-empty');
    var minLat = points.first.latitude;
    var maxLat = points.first.latitude;
    var minLng = points.first.longitude;
    var maxLng = points.first.longitude;
    for (final p in points) {
      if (p.latitude < minLat) minLat = p.latitude;
      if (p.latitude > maxLat) maxLat = p.latitude;
      if (p.longitude < minLng) minLng = p.longitude;
      if (p.longitude > maxLng) maxLng = p.longitude;
    }
    const pad = 0.002;
    if ((maxLat - minLat).abs() < 1e-9) {
      minLat -= pad;
      maxLat += pad;
    }
    if ((maxLng - minLng).abs() < 1e-9) {
      minLng -= pad;
      maxLng += pad;
    }
    return LatLngBounds(
      southwest: LatLng(minLat, minLng),
      northeast: LatLng(maxLat, maxLng),
    );
  }
}
