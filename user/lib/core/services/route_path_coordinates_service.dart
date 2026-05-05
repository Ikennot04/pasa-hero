import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';

import 'backend_route_geometry.dart';
import 'directions_service.dart';
import 'route_stop_display_utils.dart';

/// Route geometry for map fit + highlight: **Mongo (Vercel `/api/routes`) first**, then
/// Firestore [`routes`]/[`route_code`] only if the API has no usable points.
/// Highlight polylines use Google **Directions** (`mode=driving`) when anchor points are
/// sparse so the line follows roads; dense pre-recorded coordinate arrays skip rerouting.
class RoutePathCoordinatesService {
  RoutePathCoordinatesService({
    FirebaseFirestore? firestore,
    DirectionsService? directionsService,
  })  : _db = firestore ?? FirebaseFirestore.instance,
        _directions = directionsService ?? DirectionsService();

  final FirebaseFirestore _db;
  final DirectionsService _directions;

  static const String routesCollection = 'routes';
  static const String routeCodeCollection = 'route_code';

  /// Converts Firestore [GeoPoint] values to [LatLng].
  static List<LatLng> geoPointsToLatLng(Iterable<GeoPoint> geo) =>
      geo.map((g) => LatLng(g.latitude, g.longitude)).toList();

  /// Polyline: Mongo/Vercel route detail first (aligned with map pins), then Firestore
  /// [`routes.coordinates`], [`route_code`] stops, [`routes`] stops.
  ///
  /// Sparse anchor lists are snapped to roads via [DirectionsService.getRoadFollowingPolyline].
  Future<List<LatLng>> fetchRoutePathLatLng(String routeCode) async {
    final code = routeCode.trim();
    if (code.isEmpty) return const [];

    final detail = await BackendRouteGeometry.fetchRouteDetailByCode(code);
    if (detail != null) {
      final anchors = BackendRouteGeometry.pathLatLngFromDetail(detail);
      if (anchors.length >= 2) {
        final path = await _snapAnchorsToRoads(anchors);
        return _dedupeConsecutive(path);
      }
    }

    final routesData = await _getRoutesDocumentData(code);
    if (routesData != null) {
      final fromCoords = _latLngsFromCoordinatesField(routesData['coordinates']);
      if (fromCoords.length >= 2) {
        final path = await _snapAnchorsToRoads(fromCoords);
        return _dedupeConsecutive(path);
      }
    }

    final rcData = await _getRouteCodeDocumentData(code);
    if (rcData != null) {
      final fromRc = _latLngsFromRouteCodeMap(rcData);
      if (fromRc.length >= 2) {
        final path = await _snapAnchorsToRoads(fromRc);
        return _dedupeConsecutive(path);
      }
    }

    if (routesData != null) {
      final fromStops =
          _latLngsFromStopsField(routesData['stops'] ?? routesData['bus_stop']);
      if (fromStops.length >= 2) {
        final path = await _snapAnchorsToRoads(fromStops);
        return _dedupeConsecutive(path);
      }
    }

    return const [];
  }

  /// Uses Directions API when there are few anchors; leaves dense polylines unchanged.
  Future<List<LatLng>> _snapAnchorsToRoads(List<LatLng> anchors) async {
    if (anchors.length < 2) return anchors;
    const densePolylineThreshold = 72;
    if (anchors.length > densePolylineThreshold) return anchors;
    try {
      final road = await _directions.getRoadFollowingPolyline(anchors);
      if (road != null && road.length >= 2) return road;
    } catch (_) {}
    return anchors;
  }

  /// Stop positions for camera bounds: Mongo anchors first, then Firestore fallbacks.
  Future<List<LatLng>> fetchRouteStopPositionsLatLng(String routeCode) async {
    final code = routeCode.trim();
    if (code.isEmpty) return const [];

    final out = <LatLng>[];

    final detail = await BackendRouteGeometry.fetchRouteDetailByCode(code);
    if (detail != null) {
      out.addAll(BackendRouteGeometry.allAnchorPointsFromDetail(detail));
    }

    if (out.length >= 2) return _dedupeConsecutive(out);

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
    final stopsList = rawBs is List
        ? RouteStopDisplayUtils.orderRawStopList(List<dynamic>.from(rawBs))
        : <dynamic>[];
    final fromStops = <LatLng>[];
    for (final s in stopsList) {
      if (s is GeoPoint) {
        fromStops.add(LatLng(s.latitude, s.longitude));
        continue;
      }
      if (s is! Map) continue;
      final lat = (s['latitude'] as num?)?.toDouble() ??
          (s['lat'] as num?)?.toDouble();
      final lng = (s['longitude'] as num?)?.toDouble() ??
          (s['lng'] as num?)?.toDouble();
      if (lat != null && lng != null) {
        fromStops.add(LatLng(lat, lng));
      }
    }
    if (fromStops.isNotEmpty) return fromStops;

    final se = RouteStopDisplayUtils.terminalsFromRouteDocument(data);
    if (se.start != null && se.end != null) return [se.start!, se.end!];
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
    final ordered = RouteStopDisplayUtils.orderRawStopList(List<dynamic>.from(raw));
    final out = <LatLng>[];
    for (final item in ordered) {
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
    final stopsList = rawBs is List
        ? RouteStopDisplayUtils.orderRawStopList(List<dynamic>.from(rawBs))
        : <dynamic>[];
    final fromStops = <LatLng>[];
    for (final s in stopsList) {
      if (s is GeoPoint) {
        fromStops.add(LatLng(s.latitude, s.longitude));
        continue;
      }
      if (s is! Map) continue;
      final lat = (s['latitude'] as num?)?.toDouble() ??
          (s['lat'] as num?)?.toDouble();
      final lng = (s['longitude'] as num?)?.toDouble() ??
          (s['lng'] as num?)?.toDouble();
      if (lat != null && lng != null) {
        fromStops.add(LatLng(lat, lng));
      }
    }
    if (fromStops.length >= 2) return fromStops;

    final se = RouteStopDisplayUtils.terminalsFromRouteDocument(data);
    if (se.start != null && se.end != null) {
      return [se.start!, se.end!];
    }
    return const [];
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
