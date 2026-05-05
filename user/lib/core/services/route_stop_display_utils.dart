import 'dart:math' as math;

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';

/// Ordering + terminal extraction shared by map markers and route polylines.
class RouteStopDisplayUtils {
  RouteStopDisplayUtils._();

  /// Same ordering as Mongo [route_stops].stop_order — avoids wrong first/last when Firestore is unsorted.
  static List<dynamic> orderRawStopList(List<dynamic> raw) {
    if (raw.length <= 1) return List<dynamic>.from(raw);
    final indexed = <({dynamic item, int sortKey, int stable})>[];
    for (var i = 0; i < raw.length; i++) {
      final s = raw[i];
      if (s is GeoPoint) {
        indexed.add((item: s, sortKey: i, stable: i));
        continue;
      }
      final m = _asMap(s);
      if (m != null) {
        final o = (m['stop_order'] as num?)?.toInt() ??
            (m['route_order'] as num?)?.toInt() ??
            (m['order'] as num?)?.toInt() ??
            (m['sequence'] as num?)?.toInt() ??
            i;
        indexed.add((item: s, sortKey: o, stable: i));
      } else {
        indexed.add((item: s, sortKey: i, stable: i));
      }
    }
    indexed.sort((a, b) {
      final c = a.sortKey.compareTo(b.sortKey);
      return c != 0 ? c : a.stable.compareTo(b.stable);
    });
    return indexed.map((e) => e.item).toList();
  }

  static Map<String, dynamic>? _asMap(dynamic value) {
    if (value == null) return null;
    if (value is Map<String, dynamic>) return value;
    if (value is Map) {
      return value.map((k, v) => MapEntry(k.toString(), v));
    }
    return null;
  }

  /// GeoPoint, or maps with lat/lng / latitude/longitude (Firestore variants).
  static LatLng? latLngFromFlexiblePoint(dynamic v) {
    if (v is GeoPoint) return LatLng(v.latitude, v.longitude);
    final m = _asMap(v);
    if (m == null) return null;
    final lat = _toDouble(m['latitude']) ?? _toDouble(m['lat']);
    final lng = _toDouble(m['longitude']) ?? _toDouble(m['lng']);
    if (lat != null && lng != null) return LatLng(lat, lng);
    return null;
  }

  static double? _toDouble(dynamic v) {
    if (v == null) return null;
    if (v is double) return v;
    if (v is int) return v.toDouble();
    if (v is num) return v.toDouble();
    return double.tryParse(v.toString());
  }

  /// Reads canonical route terminals from a Firestore route / route_code document.
  /// Tries several field names used across Mongo sync vs manual Firestore.
  static ({LatLng? start, LatLng? end}) terminalsFromRouteDocument(
    Map<String, dynamic> data,
  ) {
    LatLng? pick(Iterable<String> keys) {
      for (final k in keys) {
        final v = data[k];
        var p = latLngFromFlexiblePoint(v);
        if (p != null) return p;
        // Nested { location: { lat, lng } } etc.
        final m = _asMap(v);
        if (m != null) {
          for (final nk in const ['location', 'coords', 'coordinates', 'position', 'geo']) {
            p = latLngFromFlexiblePoint(m[nk]);
            if (p != null) return p;
          }
          p = latLngFromFlexiblePoint(m);
          if (p != null) return p;
        }
      }
      return null;
    }

    final start = pick(const [
      'pointA',
      'point_a',
      'start_location',
      'startLocation',
      'start_point',
      'startPoint',
      'route_start',
      'terminal_start',
    ]);
    final end = pick(const [
      'pointB',
      'point_b',
      'end_location',
      'endLocation',
      'end_point',
      'endPoint',
      'route_end',
      'terminal_end',
    ]);
    return (start: start, end: end);
  }

  /// Per-stop flags (Mongo / Firestore) — when set, overrides first/last index guessing.
  static bool stopMapDeclaredStart(Map<String, dynamic> m) {
    if (m['is_start_stop'] == true ||
        m['isStartStop'] == true ||
        m['is_route_start'] == true ||
        m['terminal_start'] == true) {
      return true;
    }
    final role = '${m['stop_role'] ?? m['role'] ?? m['stop_type'] ?? m['type'] ?? ''}'
        .toString()
        .toLowerCase()
        .trim();
    if (role.isEmpty) return false;
    const exact = {
      'start',
      'first',
      'origin',
      'from',
      'route_start',
      'boarding',
    };
    if (exact.contains(role)) return true;
    if (role.startsWith('start_') || role.endsWith('_start')) return true;
    return false;
  }

  static bool stopMapDeclaredEnd(Map<String, dynamic> m) {
    if (m['is_end_stop'] == true ||
        m['isEndStop'] == true ||
        m['is_route_end'] == true ||
        m['terminal_end'] == true) {
      return true;
    }
    final role = '${m['stop_role'] ?? m['role'] ?? m['stop_type'] ?? m['type'] ?? ''}'
        .toString()
        .toLowerCase()
        .trim();
    if (role.isEmpty) return false;
    const exact = {
      'end',
      'last',
      'terminus',
      'destination',
      'to',
      'route_end',
      'alighting',
    };
    if (exact.contains(role)) return true;
    if (role.startsWith('end_') || role.endsWith('_end')) return true;
    return false;
  }

  /// Haversine distance in meters — used to align terminal pins with stop coordinates.
  static double distanceMeters(LatLng a, LatLng b) {
    const earthRadiusM = 6371000.0;
    double rad(double deg) => deg * math.pi / 180.0;
    final dLat = rad(b.latitude - a.latitude);
    final dLon = rad(b.longitude - a.longitude);
    final lat1 = rad(a.latitude);
    final lat2 = rad(b.latitude);
    final hv = math.sin(dLat / 2) * math.sin(dLat / 2) +
        math.cos(lat1) * math.cos(lat2) * math.sin(dLon / 2) * math.sin(dLon / 2);
    final h = hv.clamp(0.0, 1.0);
    final centralAngle = 2 * math.atan2(math.sqrt(h), math.sqrt(1 - h));
    return earthRadiusM * centralAngle;
  }

  /// True when [b] is within [maxMeters] of terminal coords [a].
  static bool nearTerminal(LatLng a, LatLng b, {double maxMeters = 160}) {
    return distanceMeters(a, b) <= maxMeters;
  }
}
