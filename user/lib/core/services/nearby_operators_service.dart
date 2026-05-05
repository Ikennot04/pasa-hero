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
  static const String _driverStatusCollection = 'driver_status';
  /// Staleness window for **live map** presence. Operator GPS ticks about every 30s;
  /// if [updatedAt] is older than this, the doc is treated as offline (app killed, sync stopped).
  static const Duration maxAge = Duration(minutes: 5);
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

  /// True when [s] looks like a Mongo ObjectId (not a jeepney route code).
  static bool _looksLikeMongoObjectId(String s) {
    final t = s.trim();
    if (t.length != 24) return false;
    return RegExp(r'^[a-fA-F0-9]{24}$').hasMatch(t);
  }

  /// Firestore may store [routeCode] as String or int (e.g. 25).
  /// Operator app uses [routeCode]/[route_code]; support extra keys from merges / legacy.
  /// Skips 24-hex [route_id] values so we do not treat Mongo ids as route labels.
  static String? _routeCodeFromData(Map<String, dynamic> data) {
    final candidates = <dynamic>[
      data['routeCode'],
      data['route_code'],
      data['assignedRoute'],
      data['assigned_route'],
      data['currentRoute'],
      data['current_route'],
      data['selectedRoute'],
      data['selected_route'],
      data['line'],
      data['line_code'],
      data['lineCode'],
      data['route_id'],
      data['routeId'],
    ];
    for (final v in candidates) {
      if (v == null) continue;
      final s = v is String ? v.trim() : v.toString().trim();
      if (s.isEmpty) continue;
      if (_looksLikeMongoObjectId(s)) continue;
      return s;
    }
    return null;
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

  /// Same matching rules as the Near Me route dropdown vs [operator_locations.routeCode].
  /// Exposed for [driver_status] / free-ride banner logic (must stay in sync with list filter).
  static bool routeMatchesNearMeFilter(String? operatorRoute, String filterRaw) {
    return _routeMatchesFilter(operatorRoute, filterRaw);
  }

  /// Same route line regardless of argument order (e.g. `driver_status` hint vs GPS `routeCode`).
  static bool routesLooselySameLine(String? a, String? b) {
    final x = a?.trim() ?? '';
    final y = b?.trim() ?? '';
    if (x.isEmpty || y.isEmpty) return false;
    return _routeMatchesFilter(a, y) || _routeMatchesFilter(b, x);
  }

  /// Uppercase / alnum / `RouteNN` body variants for one label (Near Me, notifications, `driver_status`).
  static Set<String> routeCodeMatchTokens(String? raw) {
    final out = <String>{};
    final t = raw?.trim() ?? '';
    if (t.isEmpty) return out;
    out.add(t.toUpperCase());
    final alnum = t.toUpperCase().replaceAll(RegExp(r'[^A-Z0-9]'), '');
    if (alnum.isNotEmpty) {
      out.add(alnum);
      if (alnum.startsWith('ROUTE') && alnum.length > 5) {
        out.add(alnum.substring(5));
      }
    }
    return out;
  }

  /// Same rules as the passenger map: Mongo/API free-ride line + operator [routeCode] tokens.
  static bool operatorOnMongoFreeRideLine(
    NearbyOperator op, {
    required Set<String> mongoFreeRideRouteCodes,
    required Set<String> mongoFreeRideRouteHints,
  }) {
    for (final hint in mongoFreeRideRouteHints) {
      if (routesLooselySameLine(op.routeCode, hint)) return true;
    }
    if (mongoFreeRideRouteCodes.isEmpty) return false;
    final raw = op.routeCode;
    if (raw == null) return false;
    final variants = routeCodeMatchTokens(raw);
    for (final v in variants) {
      if (mongoFreeRideRouteCodes.contains(v)) return true;
    }
    return false;
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
    // Catalog vs GPS: shared normalized tokens (e.g. API `Route-01` vs Firestore `ROUTE01`).
    final filterToks = routeCodeMatchTokens(filterRaw);
    final opToks = routeCodeMatchTokens(operatorRoute);
    for (final t in filterToks) {
      if (t.isNotEmpty && opToks.contains(t)) return true;
    }
    return false;
  }

  /// True when a field is explicitly "off" (matches operator RouteScreen user-loc rules).
  static bool _valueIsExplicitlyFalse(Object? value) {
    if (value == null) return false;
    if (value is bool) return !value;
    if (value is num) return value == 0;
    final s = value.toString().trim().toLowerCase();
    return s == '0' ||
        s == 'false' ||
        s == 'no' ||
        s == 'off' ||
        s == 'inactive' ||
        s == 'offline' ||
        s == 'disconnected';
  }

  /// Any explicit offline / inactive signal on the location doc.
  static bool _hasExplicitOfflinePresence(Map<String, dynamic> data) {
    if (_valueIsExplicitlyFalse(data['online'])) return true;
    if (_valueIsExplicitlyFalse(data['isOnline'])) return true;
    if (_valueIsExplicitlyFalse(data['active'])) return true;
    if (_valueIsExplicitlyFalse(data['is_active'])) return true;
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
    for (final key in const ['state', 'presence']) {
      final v = data[key];
      if (v == null) continue;
      final s = v.toString().trim().toLowerCase();
      if (s == 'offline' || s == 'inactive' || s == 'disconnected') return true;
    }
    return false;
  }

  static bool _truthyPresenceField(Object? value) {
    if (value == null) return false;
    if (value is bool) return value;
    if (value is num) return value != 0;
    final s = value.toString().trim().toLowerCase();
    return s == '1' || s == 'true' || s == 'yes' || s == 'on' || s == 'active';
  }

  /// Operator app sets [online]/[status] when publishing; docs without a positive
  /// signal are treated as inactive so the passenger map does not show stale buses.
  static bool _isExplicitlyOnline(Map<String, dynamic> data) {
    if (_truthyPresenceField(data['online'])) return true;
    if (_truthyPresenceField(data['isOnline'])) return true;
    if (_truthyPresenceField(data['active'])) return true;
    if (_truthyPresenceField(data['is_active'])) return true;
    final status = data['status'];
    if (status is num && status != 0) return true;
    if (status is String) {
      final s = status.trim().toLowerCase();
      if (s == '1' || s == 'active' || s == 'online' || s == 'on') return true;
    }
    // Fresh [updatedAt] + coordinates without an explicit offline flag ⇒ treat as live
    // (older clients or partial merges may omit [online]/[status]).
    if (!_hasExplicitOfflinePresence(data)) {
      final updated = _readUpdatedAt(data);
      if (updated != null &&
          DateTime.now().difference(updated) <= maxAge) {
        return true;
      }
    }
    return false;
  }

  /// Followed route codes that have at least one online [operator_locations] doc with
  /// GPS and a route assignment matching the followed code (Near Me–style matching).
  Future<Set<String>> followedRoutesWithLiveOnlineBus(
    Set<String> followedUpper, {
    Duration maxStale = maxAge,
  }) async {
    if (followedUpper.isEmpty) return {};
    try {
      final snap = await _db.collection(collectionName).get();
      final matched = <String>{};
      final now = DateTime.now();

      for (final followed in followedUpper) {
        final f = followed.trim().toUpperCase();
        if (f.isEmpty) continue;
        for (final doc in snap.docs) {
          try {
            final data = Map<String, dynamic>.from(doc.data());
            if (_hasExplicitOfflinePresence(data)) continue;
            if (!_isExplicitlyOnline(data)) continue;
            final coords = _coordsFromData(data);
            if (coords == null) continue;

            final updated = _readUpdatedAt(data);
            if (updated == null || now.difference(updated) > maxStale) {
              continue;
            }

            final routeStr = _routeCodeFromData(data);
            if (!_routeMatchesFilter(routeStr, f)) continue;
            matched.add(f);
            break;
          } catch (_) {}
        }
      }
      return matched;
    } catch (e, st) {
      debugPrint('NearbyOperatorsService.followedRoutesWithLiveOnlineBus: $e\n$st');
      return {};
    }
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
        final raw = doc.data();
        final data = Map<String, dynamic>.from(raw);
        if (_hasExplicitOfflinePresence(data)) continue;
        if (!_isExplicitlyOnline(data)) continue;

        final coords = _coordsFromData(data);
        if (coords == null) continue;
        final lat = coords.$1;
        final lng = coords.$2;

        final updated = _readUpdatedAt(data);
        // No timestamp or stale write ⇒ not a live bus (avoids ghosts after app kill / bad merges).
        if (updated == null || now.difference(updated) > maxAge) continue;

        final routeStr = _routeCodeFromData(data);
        final locUid = data['uid']?.toString().trim();

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
              locationAuthUid:
                  (locUid != null && locUid.isNotEmpty) ? locUid : null,
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
                locationAuthUid:
                    (locUid != null && locUid.isNotEmpty) ? locUid : null,
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
                locationAuthUid:
                    (locUid != null && locUid.isNotEmpty) ? locUid : null,
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

  /// Route label on a [driver_status] document (same idea as Near Me free-ride listener).
  static String _driverStatusRouteFromMap(
    Map<String, dynamic> data,
    String documentId,
  ) {
    final rid = data['route_id']?.toString().trim();
    if (rid != null && rid.isNotEmpty && !_looksLikeMongoObjectId(rid)) {
      return rid;
    }
    final rc = data['route_code'] ?? data['routeCode'];
    final s = rc?.toString().trim();
    if (s != null && s.isNotEmpty && !_looksLikeMongoObjectId(s)) {
      return s;
    }
    return documentId.trim();
  }

  static void _driverStatusOperatorIdsLower(
    Map<String, dynamic> data,
    Set<String> outLower,
  ) {
    for (final key in const [
      'operator_id',
      'operatorId',
      'uid',
      'firebase_uid',
      'firebaseUid',
    ]) {
      final v = data[key];
      if (v == null) continue;
      final s = v.toString().trim().toLowerCase();
      if (s.isNotEmpty) outLower.add(s);
    }
  }

  /// Live bus counts per catalog route code for the Routes tab — one Firestore read
  /// for [operator_locations] and one for [driver_status], then in-memory matching
  /// (GPS [routeCode] **or** [driver_status] operator id, same as Near Me).
  Future<Map<String, int>> liveCountsByCatalogRouteCodes(
    List<String> catalogCodes, {
    double? userLat,
    double? userLng,
    Source source = Source.serverAndCache,
  }) async {
    final orderedUnique = <String>[];
    final seenUpper = <String>{};
    for (final raw in catalogCodes) {
      final t = raw.trim();
      if (t.isEmpty) continue;
      final u = t.toUpperCase();
      if (seenUpper.add(u)) orderedUnique.add(t);
    }
    if (orderedUnique.isEmpty) return {};

    final trustedByUpper = <String, Set<String>>{
      for (final c in orderedUnique) c.toUpperCase(): <String>{},
    };

    final snapOps = await _db
        .collection(collectionName)
        .get(GetOptions(source: source));
    final allOps = _parseSnapshot(
      snapOps,
      userLat: userLat,
      userLng: userLng,
      routeCodeFilter: null,
    );

    try {
      final ds = await _db
          .collection(_driverStatusCollection)
          .get(GetOptions(source: source));
      for (final doc in ds.docs) {
        final data = Map<String, dynamic>.from(doc.data());
        final docRoute = _driverStatusRouteFromMap(data, doc.id);
        final ids = <String>{};
        _driverStatusOperatorIdsLower(data, ids);
        if (ids.isEmpty) continue;
        for (final catalog in orderedUnique) {
          if (!_routeMatchesFilter(docRoute, catalog)) continue;
          trustedByUpper[catalog.toUpperCase()]!.addAll(ids);
        }
      }
    } catch (e, st) {
      debugPrint('NearbyOperatorsService.liveCounts driver_status: $e\n$st');
    }

    final out = <String, int>{};
    for (final catalog in orderedUnique) {
      final cu = catalog.toUpperCase();
      final trusted = trustedByUpper[cu] ?? {};
      var n = 0;
      for (final op in allOps) {
        if (_routeMatchesFilter(op.routeCode, catalog)) {
          n++;
          continue;
        }
        final id = op.operatorId.trim().toLowerCase();
        if (trusted.contains(id)) {
          n++;
          continue;
        }
        final u = op.locationAuthUid?.trim().toLowerCase();
        if (u != null && u.isNotEmpty && trusted.contains(u)) {
          n++;
        }
      }
      out[cu] = n;
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
