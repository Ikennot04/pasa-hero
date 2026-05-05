import 'package:cloud_firestore/cloud_firestore.dart';

import 'nearby_operators_service.dart';

/// Firestore collection for driver status (free ride flags). Read-only on user app.
const String driverStatusCollection = 'driver_status';

bool isFreeRideWindowActive({
  required bool isFreeRideOn,
  required DateTime? freeRideUntil,
}) {
  if (!isFreeRideOn) return false;
  if (freeRideUntil == null) return true;
  return freeRideUntil.isAfter(DateTime.now());
}

/// Snapshot of free ride fields from `driver_status` (matches operator app shape).
class FreeRideStatusSnapshot {
  const FreeRideStatusSnapshot({
    required this.isActive,
    this.startTime,
    this.endTime,
    this.operatorId,
    this.updatedAt,
  });

  final bool isActive;
  final DateTime? startTime;
  final DateTime? endTime;
  final String? operatorId;
  /// Firestore `updatedAt` — used when [startTime] is missing (badge "new" timing).
  final DateTime? updatedAt;
}

/// Passengers read [driver_status] to surface free ride in notifications (no writes).
class DriverStatusReadService {
  DriverStatusReadService._();
  static final DriverStatusReadService instance = DriverStatusReadService._();

  /// Same coercion as Near Me / operator catalog so notifications match live promos.
  static bool coerceFreeRideOn(dynamic v) {
    if (v == null) return false;
    if (v is bool) return v;
    if (v is num) return v != 0;
    if (v is String) {
      final s = v.trim().toLowerCase();
      return s == '1' || s == 'true' || s == 'yes';
    }
    return false;
  }

  static DateTime? readFreeRideUntilFromData(Map<String, dynamic> data) {
    return _readFirestoreDateField(
      data['free_ride_until'] ?? data['freeRideUntil'],
    );
  }

  static DateTime? readFreeRideFromFromData(Map<String, dynamic> data) {
    return _readFirestoreDateField(
      data['free_ride_from'] ?? data['freeRideFrom'],
    );
  }

  static DateTime? _readFirestoreDateField(dynamic v) {
    if (v == null) return null;
    if (v is Timestamp) return v.toDate();
    if (v is DateTime) return v;
    if (v is int) {
      if (v <= 0) return null;
      return DateTime.fromMillisecondsSinceEpoch(
        v < 1000000000000 ? v * 1000 : v,
      );
    }
    if (v is double) {
      final r = v.round();
      if (r <= 0) return null;
      return DateTime.fromMillisecondsSinceEpoch(
        r < 1000000000000 ? r * 1000 : r,
      );
    }
    if (v is String) return DateTime.tryParse(v);
    return null;
  }

  /// Matches operator [driver_status] documents (same rules as [FreeRideDetails] on operator app).
  static bool isFreeRideActiveData(Map<String, dynamic> data) {
    final on = coerceFreeRideOn(data['free_ride']) ||
        coerceFreeRideOn(data['is_free_ride']) ||
        coerceFreeRideOn(data['isFreeRide']) ||
        coerceFreeRideOn(data['freeRide']);
    final until = readFreeRideUntilFromData(data);
    return isFreeRideWindowActive(isFreeRideOn: on, freeRideUntil: until);
  }

  bool _readFreeRideOn(Map<String, dynamic> data) {
    return coerceFreeRideOn(data['free_ride']) ||
        coerceFreeRideOn(data['is_free_ride']) ||
        coerceFreeRideOn(data['isFreeRide']) ||
        coerceFreeRideOn(data['freeRide']);
  }

  FreeRideStatusSnapshot? _fromSnapshot(DocumentSnapshot<Map<String, dynamic>> snap) {
    if (!snap.exists) return null;
    final data = snap.data()!;
    final freeRideUntil = readFreeRideUntilFromData(data);
    final freeRideFrom = readFreeRideFromFromData(data);
    final isFreeRideOn = _readFreeRideOn(data);
    final active = isFreeRideWindowActive(
      isFreeRideOn: isFreeRideOn,
      freeRideUntil: freeRideUntil,
    );
    final updatedAt = _readTimestampAsDateTime(data, 'updatedAt') ??
        _readTimestampAsDateTime(data, 'updated_at') ??
        _readTimestampAsDateTime(data, 'lastUpdated');
    return FreeRideStatusSnapshot(
      isActive: active,
      startTime: freeRideFrom,
      endTime: freeRideUntil,
      operatorId: data['operator_id']?.toString() ??
          data['operatorId']?.toString() ??
          data['uid']?.toString(),
      updatedAt: updatedAt,
    );
  }

  static DateTime? _readTimestampAsDateTime(Map<String, dynamic> data, String key) {
    final v = data[key];
    if (v is Timestamp) return v.toDate();
    if (v is DateTime) return v;
    return null;
  }

  /// True when [driver_status] doc belongs to a followed route (token expansion like Near Me).
  static bool driverStatusDocMatchesFollowedRoute(
    DocumentSnapshot<Map<String, dynamic>> doc,
    Map<String, dynamic> data,
    String followedUpper,
  ) {
    final routeStr = _routeKeyFromDriverStatic(doc, data);
    final docTokens = <String>{
      ...NearbyOperatorsService.routeCodeMatchTokens(routeStr),
      ...NearbyOperatorsService.routeCodeMatchTokens(doc.id),
    };
    final followedTokens = NearbyOperatorsService.routeCodeMatchTokens(followedUpper);
    for (final d in docTokens) {
      for (final f in followedTokens) {
        if (NearbyOperatorsService.routesLooselySameLine(d, f) ||
            NearbyOperatorsService.routeMatchesNearMeFilter(d, f)) {
          return true;
        }
      }
    }
    return false;
  }

  /// Route id/code from doc fields, else Firestore doc id (operator writes `driver_status/{routeCode}`).
  static String _routeKeyFromDriverStatic(
    DocumentSnapshot<Map<String, dynamic>> doc,
    Map<String, dynamic> data,
  ) {
    final rid = data['route_id']?.toString().trim();
    if (rid != null && rid.isNotEmpty) return rid;
    final rc = data['route_code'] ?? data['routeCode'];
    final s = rc?.toString().trim();
    if (s != null && s.isNotEmpty) return s;
    return doc.id.trim();
  }

  /// Picks the newest active free-ride snapshot for [followedUpper] in [snapshot].
  FreeRideStatusSnapshot? _bestActiveForFollowedRoute(
    QuerySnapshot<Map<String, dynamic>> snapshot,
    String followedUpper,
  ) {
    FreeRideStatusSnapshot? best;
    DateTime? bestRef;
    for (final doc in snapshot.docs) {
      final snap = _fromSnapshot(doc);
      if (snap == null || !snap.isActive) continue;
      final data = doc.data();
      if (!driverStatusDocMatchesFollowedRoute(doc, data, followedUpper)) {
        continue;
      }
      final ref = snap.updatedAt ?? snap.endTime ?? snap.startTime;
      if (best == null) {
        best = snap;
        bestRef = ref;
        continue;
      }
      if (ref != null && (bestRef == null || ref.isAfter(bestRef))) {
        best = snap;
        bestRef = ref;
      }
    }
    return best;
  }

  /// One snapshot pass: active free ride per followed code (for notifications).
  Map<String, FreeRideStatusSnapshot?> mapActiveFreeRidesForFollowedRoutes(
    QuerySnapshot<Map<String, dynamic>> snapshot,
    Set<String> followedUpper,
  ) {
    final out = <String, FreeRideStatusSnapshot?>{};
    for (final code in followedUpper) {
      final c = code.trim().toUpperCase();
      if (c.isEmpty) continue;
      out[c] = _bestActiveForFollowedRoute(snapshot, c);
    }
    return out;
  }

  FreeRideStatusSnapshot? _newerOf(
    FreeRideStatusSnapshot? a,
    FreeRideStatusSnapshot b,
  ) {
    if (a == null) return b;
    final ra = a.updatedAt ?? a.endTime ?? a.startTime;
    final rb = b.updatedAt ?? b.endTime ?? b.startTime;
    if (rb != null && (ra == null || rb.isAfter(ra))) return b;
    return a;
  }

  /// All routes with an active operator free ride (any `driver_status` doc).
  /// Keys are [NearbyOperatorsService.routeCodeMatchTokens] variants (uppercase).
  Map<String, FreeRideStatusSnapshot?> mapAllActiveFreeRidePromos(
    QuerySnapshot<Map<String, dynamic>> snapshot,
  ) {
    final out = <String, FreeRideStatusSnapshot?>{};
    for (final doc in snapshot.docs) {
      final data = doc.data();
      if (!isFreeRideActiveData(data)) continue;
      final snap = _fromSnapshot(doc);
      if (snap == null || !snap.isActive) continue;
      final routeStr =
          _routeKeyFromDriverStatic(doc, data).trim().toUpperCase();
      if (routeStr.isEmpty) continue;
      final tokens = NearbyOperatorsService.routeCodeMatchTokens(routeStr);
      final keys = tokens.isEmpty ? <String>{routeStr} : tokens;
      for (final k in keys) {
        if (k.isEmpty) continue;
        out[k] = _newerOf(out[k], snap);
      }
    }
    return out;
  }

  /// Live updates for [routeCode] — same Firestore doc id operators use (uppercase route code).
  Stream<FreeRideStatusSnapshot?> freeRideStream(String routeCode) {
    final id = routeCode.trim().toUpperCase();
    if (id.isEmpty) {
      return const Stream.empty();
    }
    return FirebaseFirestore.instance
        .collection(driverStatusCollection)
        .doc(id)
        .snapshots()
        .map(_fromSnapshot);
  }
}
