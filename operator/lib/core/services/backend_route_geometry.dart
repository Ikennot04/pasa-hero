import 'dart:convert';

import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:http/http.dart' as http;

import 'route_stop_display_utils.dart';

/// Reads route geometry from `GET /api/routes` + `GET /api/routes/:id` the same way
/// the Node backend exposes [Route] + [route_stops] (see `server/modules/route/route.model.js`).
class BackendRouteGeometry {
  BackendRouteGeometry._();

  static const String _routesApiBase =
      'https://pasa-hero-server.vercel.app/api';

  static Map<String, dynamic>? _jsonObject(dynamic value) {
    if (value is Map<String, dynamic>) return value;
    if (value is Map) return Map<String, dynamic>.from(value);
    return null;
  }

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

  /// `GET /api/routes/:id` → inner [data] map, or null.
  static Future<Map<String, dynamic>?> fetchRouteDetailByCode(String routeCode) async {
    final want = routeCode.trim().toUpperCase();
    if (want.isEmpty) return null;

    try {
      final listUri = Uri.parse('$_routesApiBase/routes');
      final listResp = await http
          .get(listUri, headers: const {'Accept': 'application/json'})
          .timeout(const Duration(seconds: 20));
      if (listResp.statusCode < 200 || listResp.statusCode >= 300) {
        return null;
      }

      final listDecoded = _jsonObject(jsonDecode(listResp.body));
      if (listDecoded == null || listDecoded['success'] == false) {
        return null;
      }

      final rowsRaw = listDecoded['data'] ?? listDecoded['routes'];
      if (rowsRaw is! List) return null;

      String? routeId;
      for (final row in rowsRaw) {
        final sm = _jsonObject(row);
        if (sm == null) continue;
        final code =
            (sm['route_code'] ?? sm['routeCode'])?.toString().trim() ?? '';
        if (code.toUpperCase() != want) continue;
        routeId = _mongoIdToString(sm['_id'] ?? sm['id']);
        break;
      }
      if (routeId == null || routeId.isEmpty) return null;

      final detailUri = Uri.parse('$_routesApiBase/routes/$routeId');
      final detailResp = await http
          .get(detailUri, headers: const {'Accept': 'application/json'})
          .timeout(const Duration(seconds: 20));
      if (detailResp.statusCode < 200 || detailResp.statusCode >= 300) {
        return null;
      }

      final detailDecoded = _jsonObject(jsonDecode(detailResp.body));
      if (detailDecoded == null || detailDecoded['success'] == false) {
        return null;
      }

      return _jsonObject(detailDecoded['data']);
    } catch (_) {
      return null;
    }
  }

  static Map<String, dynamic>? _asMap(dynamic v) {
    if (v is Map<String, dynamic>) return v;
    if (v is Map) return Map<String, dynamic>.from(v);
    return null;
  }

  static LatLng? _latLngFromLocationMap(dynamic v) {
    final m = _asMap(v);
    if (m == null) return null;
    final lat = (m['latitude'] as num?)?.toDouble() ?? (m['lat'] as num?)?.toDouble();
    final lng = (m['longitude'] as num?)?.toDouble() ?? (m['lng'] as num?)?.toDouble();
    if (lat != null && lng != null) return LatLng(lat, lng);
    return null;
  }

  /// Populated Terminal from Mongo (see `server/modules/terminal/terminal.model.js`).
  static LatLng? _latLngFromTerminalMap(dynamic v) {
    final m = _asMap(v);
    if (m == null) return null;
    final lat = (m['location_lat'] as num?)?.toDouble() ??
        (m['latitude'] as num?)?.toDouble() ??
        (m['lat'] as num?)?.toDouble();
    final lng = (m['location_lng'] as num?)?.toDouble() ??
        (m['longitude'] as num?)?.toDouble() ??
        (m['lng'] as num?)?.toDouble();
    if (lat != null && lng != null) return LatLng(lat, lng);
    for (final nk in const ['location', 'coords', 'coordinates', 'geo', 'position']) {
      final inner = _latLngFromLocationMap(m[nk]);
      if (inner != null) return inner;
    }
    final coords = m['coordinates'];
    if (coords is List && coords.length >= 2) {
      final a = coords[0];
      final b = coords[1];
      if (a is num && b is num) {
        return LatLng(b.toDouble(), a.toDouble());
      }
    }
    return null;
  }

  /// Backend [Route]: [start_location]/[end_location] or populated terminal refs.
  static ({LatLng? start, LatLng? end}) startEndFromRouteDetail(Map<String, dynamic> data) {
    LatLng? s = _latLngFromLocationMap(data['start_location']) ??
        _latLngFromLocationMap(data['startLocation']);
    LatLng? e = _latLngFromLocationMap(data['end_location']) ??
        _latLngFromLocationMap(data['endLocation']);
    if (s == null) {
      s = _latLngFromTerminalMap(data['start_terminal_id']) ??
          _latLngFromTerminalMap(data['startTerminalId']);
    }
    if (e == null) {
      e = _latLngFromTerminalMap(data['end_terminal_id']) ??
          _latLngFromTerminalMap(data['endTerminalId']);
    }
    return (start: s, end: e);
  }

  static List<LatLng> orderedStopPointsFromDetail(Map<String, dynamic> data) {
    final rawStops = data['route_stops'] ?? data['routeStops'];
    if (rawStops is! List || rawStops.isEmpty) return const [];

    final parsed = <({LatLng p, int order, int index})>[];
    for (var i = 0; i < rawStops.length; i++) {
      final sm = _jsonObject(rawStops[i]);
      if (sm == null) continue;
      final order = (sm['stop_order'] as num?)?.toInt() ??
          (sm['route_order'] as num?)?.toInt() ??
          (sm['order'] as num?)?.toInt() ??
          i;
      final lat = (sm['latitude'] as num?)?.toDouble();
      final lng = (sm['longitude'] as num?)?.toDouble();
      if (lat == null || lng == null) continue;
      parsed.add((p: LatLng(lat, lng), order: order, index: i));
    }
    if (parsed.isEmpty) return const [];
    parsed.sort((a, b) {
      final c = a.order.compareTo(b.order);
      return c != 0 ? c : a.index.compareTo(b.index);
    });
    return parsed.map((e) => e.p).toList();
  }

  /// Polyline path: optional start/end terminals, then ordered [route_stops].
  static List<LatLng> pathLatLngFromDetail(Map<String, dynamic> data) {
    final stops = orderedStopPointsFromDetail(data);
    final se = startEndFromRouteDetail(data);
    final s = se.start;
    final e = se.end;

    if (stops.isEmpty) {
      if (s != null && e != null) return _dedupeConsecutiveLatLng([s, e]);
      return const [];
    }

    final out = <LatLng>[];
    if (s != null && !RouteStopDisplayUtils.nearTerminal(s, stops.first)) {
      out.add(s);
    }
    out.addAll(stops);
    if (e != null && !RouteStopDisplayUtils.nearTerminal(e, out.last)) {
      out.add(e);
    }
    return _dedupeConsecutiveLatLng(out);
  }

  /// All positions useful for map bounds: stops + explicit endpoints.
  static List<LatLng> allAnchorPointsFromDetail(Map<String, dynamic> data) {
    final out = <LatLng>[];
    out.addAll(orderedStopPointsFromDetail(data));
    final se = startEndFromRouteDetail(data);
    if (se.start != null) out.add(se.start!);
    if (se.end != null) out.add(se.end!);
    return _dedupeConsecutiveLatLng(out);
  }

  static List<LatLng> _dedupeConsecutiveLatLng(List<LatLng> points) {
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
}
