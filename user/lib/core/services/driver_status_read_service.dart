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
    final v = data['free_ride_until'];
    if (v == null) return null;
    if (v is Timestamp) return v.toDate();
    if (v is DateTime) return v;
    if (v is int) return DateTime.fromMillisecondsSinceEpoch(v);
    if (v is double) return DateTime.fromMillisecondsSinceEpoch(v.round());
    if (v is String) return DateTime.tryParse(v);
    return null;
  }

  static DateTime? readFreeRideFromFromData(Map<String, dynamic> data) {
    final v = data['free_ride_from'];
    if (v == null) return null;
    if (v is Timestamp) return v.toDate();
    if (v is DateTime) return v;
    if (v is int) return DateTime.fromMillisecondsSinceEpoch(v);
    if (v is double) return DateTime.fromMillisecondsSinceEpoch(v.round());
    if (v is String) return DateTime.tryParse(v);
    return null;
  }

  /// Matches operator [driver_status] documents (same rules as [FreeRideDetails] on operator app).
  static bool isFreeRideActiveData(Map<String, dynamic> data) {
    final on = coerceFreeRideOn(data['free_ride']) ||
        coerceFreeRideOn(data['is_free_ride']);
    final until = readFreeRideUntilFromData(data);
    return isFreeRideWindowActive(isFreeRideOn: on, freeRideUntil: until);
  }

  bool _readFreeRideOn(Map<String, dynamic> data) {
    return coerceFreeRideOn(data['free_ride']) ||
        coerceFreeRideOn(data['is_free_ride']);
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
    final updatedTs = data['updatedAt'] as Timestamp? ??
        data['updated_at'] as Timestamp?;
    return FreeRideStatusSnapshot(
      isActive: active,
      startTime: freeRideFrom,
      endTime: freeRideUntil,
      operatorId: data['operator_id']?.toString(),
      updatedAt: updatedTs?.toDate(),
    );
  }

  String _routeKeyFromDriverDoc(
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

  /// Best active promo on [driver_status] that matches the followed route (Near Me–style line match).
  /// Avoids assuming doc id == subscription [route_code].
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
      final routeStr = _routeKeyFromDriverDoc(doc, data);
      if (!NearbyOperatorsService.routesLooselySameLine(routeStr, followedUpper) &&
          !NearbyOperatorsService.routeMatchesNearMeFilter(routeStr, followedUpper)) {
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
