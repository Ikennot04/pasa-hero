import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/foundation.dart';
import 'package:geolocator/geolocator.dart';

import '../models/nearby_operator.dart';

/// Reads [operator_locations] and filters by freshness, optional distance, and optional route code.
class NearbyOperatorsService {
  NearbyOperatorsService({FirebaseFirestore? firestore})
      : _db = firestore ?? FirebaseFirestore.instance;

  final FirebaseFirestore _db;

  static const String collectionName = 'operator_locations';
  /// Staleness window (server [updatedAt] when present). Shorter window avoids
  /// counting stale Firestore docs as "live" active drivers.
  static const Duration maxAge = Duration(minutes: 45);
  /// Only used when both rider GPS and a **route filter** apply (optional cap for future use).
  static const double defaultMaxDistanceMeters = 300000;
  static const int _maxOperatorsWithoutUserGps = 50;

  static String _routeNorm(String s) =>
      s.toUpperCase().replaceAll(RegExp(r'[^A-Z0-9]'), '');

  /// Aligns e.g. passenger dropdown `Route1` / `1` with operator doc `ROUTE1`.
  static String _routeNumericOrBodyKey(String raw) {
    final n = _routeNorm(raw);
    if (n.isEmpty) return '';
    if (n.startsWith('ROUTE') && n.length > 5) {
      return n.substring(5);
    }
    return n;
  }

  /// Firestore may store [routeCode] as String or int (e.g. 25).
  static String? _routeCodeFromData(Map<String, dynamic> data) {
    final v = data['routeCode'] ?? data['route_code'];
    if (v == null) return null;
    if (v is String) return v;
    return v.toString();
  }

  static double? _toDouble(dynamic v) {
    if (v == null) return null;
    if (v is double) return v;
    if (v is int) return v.toDouble();
    if (v is num) return v.toDouble();
    return double.tryParse(v.toString());
  }

  /// Operator app uses [latitude]/[longitude]; support common aliases and GeoPoint.
  static (double lat, double lng)? _coordsFromData(Map<String, dynamic> data) {
    double? lat =
        _toDouble(data['latitude']) ??
        _toDouble(data['lat']) ??
        _toDouble(data['Latitude']);
    double? lng =
        _toDouble(data['longitude']) ??
        _toDouble(data['lng']) ??
        _toDouble(data['long']) ??
        _toDouble(data['lon']) ??
        _toDouble(data['Longitude']);
    if (lat != null && lng != null) return (lat, lng);
    for (final key in ['position', 'location', 'geo', 'coordinates']) {
      final g = data[key];
      if (g is GeoPoint) return (g.latitude, g.longitude);
      if (g is Map<String, dynamic>) {
        final nestedLat =
            _toDouble(g['latitude']) ??
            _toDouble(g['lat']) ??
            _toDouble(g['Latitude']);
        final nestedLng =
            _toDouble(g['longitude']) ??
            _toDouble(g['lng']) ??
            _toDouble(g['long']) ??
            _toDouble(g['lon']) ??
            _toDouble(g['Longitude']);
        if (nestedLat != null && nestedLng != null) return (nestedLat, nestedLng);
      }
    }
    return null;
  }

  static DateTime? _readUpdatedAt(Map<String, dynamic> data) {
    final v =
        data['updatedAt'] ??
        data['updated_at'] ??
        data['lastUpdated'] ??
        data['last_updated'];
    if (v is DateTime) return v;
    if (v is Timestamp) return v.toDate();
    if (v is int) return DateTime.fromMillisecondsSinceEpoch(v);
    if (v is String) {
      return DateTime.tryParse(v);
    }
    return null;
  }

  /// When the passenger picks a **specific** route, the operator must have that route set.
  /// (Otherwise every doc with an empty [routeCode] incorrectly matches every route and
  /// inflates "active driver" counts.)
  /// "All nearby buses" uses no route filter — unassigned drivers still appear there.
  static bool _routeMatchesFilter(String? operatorRoute, String filterRaw) {
    final f = _routeNorm(filterRaw);
    if (f.isEmpty) return true;
    final op = _routeNorm(operatorRoute ?? '');
    if (op.isEmpty) return false;
    if (op == f || op.contains(f) || f.contains(op)) return true;
    final fk = _routeNumericOrBodyKey(filterRaw);
    final ok = _routeNumericOrBodyKey(operatorRoute ?? '');
    if (fk.isNotEmpty && ok.isNotEmpty && fk == ok) return true;
    return false;
  }

  /// True if the location doc was explicitly marked offline (e.g. after sign-out merge).
  static bool _isExplicitlyOffline(Map<String, dynamic> data) {
    final online = data['online'];
    if (online == 0 || online == false || online == '0') return true;
    final status = data['status'];
    if (status == 0 || status == false) return true;
    if (status is String) {
      final s = status.toLowerCase().trim();
      if (s == '0' ||
          s == 'offline' ||
          s == 'inactive' ||
          s == 'logged_out' ||
          s == 'logged out') {
        return true;
      }
    }
    return false;
  }

  List<NearbyOperator> _parseSnapshot(
    QuerySnapshot<Map<String, dynamic>> snap, {
    double? userLat,
    double? userLng,
    double maxDistanceMeters = defaultMaxDistanceMeters,
    String? routeCodeFilter,
  }) {
    final filterTrim = routeCodeFilter?.trim() ?? '';
    final hasRouteFilter = filterTrim.isNotEmpty;
    final hasUserPos = userLat != null && userLng != null;

    final now = DateTime.now();
    final out = <NearbyOperator>[];

    for (final doc in snap.docs) {
      try {
        final data = doc.data();
        if (_isExplicitlyOffline(data)) continue;

        final coords = _coordsFromData(data);
        if (coords == null) continue;
        final lat = coords.$1;
        final lng = coords.$2;

        final updated = _readUpdatedAt(data);
        // Enforce staleness only when a parseable timestamp exists.
        if (updated != null && now.difference(updated) > maxAge) continue;

        final routeStr = _routeCodeFromData(data);

        if (hasRouteFilter) {
          if (!_routeMatchesFilter(routeStr, filterTrim)) continue;
          double? meters;
          if (hasUserPos) {
            meters = Geolocator.distanceBetween(userLat, userLng, lat, lng);
          }
          out.add(
            NearbyOperator(
              operatorId: doc.id,
              latitude: lat,
              longitude: lng,
              routeCode: routeStr,
              distanceMeters: meters,
            ),
          );
        } else {
          // "All nearby buses": never hide drivers by distance — wrong/emulator GPS was
          // excluding everyone while Firestore had valid locations.
          if (!hasUserPos) {
            if (out.length >= _maxOperatorsWithoutUserGps) break;
            out.add(
              NearbyOperator(
                operatorId: doc.id,
                latitude: lat,
                longitude: lng,
                routeCode: routeStr,
                distanceMeters: null,
              ),
            );
          } else {
            final meters = Geolocator.distanceBetween(userLat, userLng, lat, lng);
            out.add(
              NearbyOperator(
                operatorId: doc.id,
                latitude: lat,
                longitude: lng,
                routeCode: routeStr,
                distanceMeters: meters,
              ),
            );
          }
        }
      } catch (e, st) {
        debugPrint('NearbyOperatorsService skip doc ${doc.id}: $e\n$st');
      }
    }

    if (hasUserPos) {
      out.sort((a, b) {
        final da = a.distanceMeters ?? double.infinity;
        final db = b.distanceMeters ?? double.infinity;
        return da.compareTo(db);
      });
    }

    return out;
  }

  Future<List<NearbyOperator>> fetchNearby({
    double? userLat,
    double? userLng,
    String? routeCodeFilter,
    double maxDistanceMeters = defaultMaxDistanceMeters,
    Source source = Source.serverAndCache,
  }) async {
    final snap = await _db
        .collection(collectionName)
        .get(GetOptions(source: source));
    try {
      return _parseSnapshot(
        snap,
        userLat: userLat,
        userLng: userLng,
        maxDistanceMeters: maxDistanceMeters,
        routeCodeFilter: routeCodeFilter,
      );
    } catch (e, st) {
      debugPrint('NearbyOperatorsService fetchNearby: $e\n$st');
      return [];
    }
  }

  /// Emits updated operators when Firestore changes.
  Stream<List<NearbyOperator>> watchNearby({
    double? userLat,
    double? userLng,
    String? routeCodeFilter,
    double maxDistanceMeters = defaultMaxDistanceMeters,
  }) {
    return _db.collection(collectionName).snapshots().map((snap) {
      try {
        return _parseSnapshot(
          snap,
          userLat: userLat,
          userLng: userLng,
          maxDistanceMeters: maxDistanceMeters,
          routeCodeFilter: routeCodeFilter,
        );
      } catch (e, st) {
        debugPrint('NearbyOperatorsService watchNearby parse: $e\n$st');
        return <NearbyOperator>[];
      }
    });
  }
}
