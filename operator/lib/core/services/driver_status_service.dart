import 'dart:async';
import 'package:cloud_firestore/cloud_firestore.dart';

/// Firestore collection for driver status (active driver per route, free ride info).
const String driverStatusCollection = 'driver_status';

/// Returns true if free ride is currently active:
/// [isFreeRide] is true and [freeRideUntil] is null or in the future.
bool isFreeRideActive({
  required bool? isFreeRide,
  required DateTime? freeRideUntil,
}) {
  if (isFreeRide != true) return false;
  if (freeRideUntil == null) return true;
  return freeRideUntil.isAfter(DateTime.now());
}

/// Free ride status and time details for UI.
class FreeRideDetails {
  final bool isActive;
  final DateTime? startTime;
  final DateTime? endTime;
  final String? operatorId;
  final int freeRideValue;
  final int? durationMinutes;

  const FreeRideDetails({
    required this.isActive,
    this.startTime,
    this.endTime,
    this.operatorId,
    required this.freeRideValue,
    this.durationMinutes,
  });
}

/// Service that listens to [driver_status] for a given [route_id],
/// finds the active driver and exposes whether free ride is active.
class DriverStatusService {
  DriverStatusService._();
  static final DriverStatusService instance = DriverStatusService._();

  StreamSubscription<QuerySnapshot>? _subscription;

  bool _readFreeRideBool(Map<String, dynamic> data) {
    final directBool = data['is_free_ride'];
    if (directBool is bool) return directBool;
    final numeric = data['free_ride'];
    if (numeric is num) return numeric == 1;
    return false;
  }

  int _readFreeRideValue(Map<String, dynamic> data) {
    final numeric = data['free_ride'];
    if (numeric is num) return numeric == 1 ? 1 : 0;
    final asBool = data['is_free_ride'];
    if (asBool is bool) return asBool ? 1 : 0;
    return 0;
  }

  FreeRideDetails _freeRideDetailsFromMap(Map<String, dynamic> data) {
    final isFreeRide = _readFreeRideBool(data);
    final freeRideValue = _readFreeRideValue(data);
    final freeRideUntil = (data['free_ride_until'] as Timestamp?)?.toDate();
    final freeRideFrom = (data['free_ride_from'] as Timestamp?)?.toDate();
    final operatorId = data['operator_id']?.toString();
    final durationMinutes = (data['duration_minutes'] as num?)?.toInt();
    final active = isFreeRideActive(
      isFreeRide: isFreeRide,
      freeRideUntil: freeRideUntil,
    );
    return FreeRideDetails(
      isActive: active,
      startTime: freeRideFrom,
      endTime: freeRideUntil,
      operatorId: operatorId,
      freeRideValue: freeRideValue,
      durationMinutes: durationMinutes,
    );
  }

  /// Clears free-ride schedule fields when the window has ended or flags are off
  /// but stale timestamps remain. Returns true if a write was performed.
  Future<bool> _normalizeFreeRideDocument(
    String routeId,
    Map<String, dynamic> data,
  ) async {
    final freeRideUntil = (data['free_ride_until'] as Timestamp?)?.toDate();
    final isFreeRide = _readFreeRideBool(data);
    final hasUntil = data['free_ride_until'] != null;
    final hasFrom = data['free_ride_from'] != null;

    final expired = freeRideUntil != null &&
        !freeRideUntil.isAfter(DateTime.now());
    final shouldClearExpired = isFreeRide && expired;
    final staleTimes = !isFreeRide && (hasUntil || hasFrom);

    if (!shouldClearExpired && !staleTimes) return false;

    final ref = FirebaseFirestore.instance
        .collection(driverStatusCollection)
        .doc(routeId);
    await ref.set({
      'route_id': routeId,
      'free_ride': 0,
      'is_free_ride': false,
      'free_ride_until': FieldValue.delete(),
      'free_ride_from': FieldValue.delete(),
      'duration_minutes': FieldValue.delete(),
      'updatedAt': FieldValue.serverTimestamp(),
    }, SetOptions(merge: true));
    return true;
  }

  /// Stream of free-ride-active state for the given [routeId].
  /// Listens to driver_status where route_id == [routeId]; uses first document
  /// (or document with is_active == true if present).
  Stream<bool> freeRideActiveStream(String routeId) {
    return freeRideDetailsStream(routeId).map((d) => d?.isActive ?? false);
  }

  /// Stream of free ride details (active state + start/end times) for [routeId].
  /// Uses document with id == [routeId] for simple read/write; falls back to query by route_id.
  Stream<FreeRideDetails?> freeRideDetailsStream(String routeId) {
    final docRef = FirebaseFirestore.instance
        .collection(driverStatusCollection)
        .doc(routeId);
    return docRef.snapshots().asyncMap((snap) async {
      if (!snap.exists) return null;
      var data = snap.data()!;
      if (await _normalizeFreeRideDocument(routeId, data)) {
        final fresh = await docRef.get();
        if (!fresh.exists) return null;
        data = fresh.data()!;
      }
      return _freeRideDetailsFromMap(data);
    });
  }

  /// One-time check: get current free-ride state for [routeId].
  Future<bool> isFreeRideActiveForRoute(String routeId) async {
    final details = await getFreeRideDetails(routeId);
    return details?.isActive ?? false;
  }

  /// One-time fetch of free ride details for [routeId].
  Future<FreeRideDetails?> getFreeRideDetails(String routeId) async {
    final ref = FirebaseFirestore.instance
        .collection(driverStatusCollection)
        .doc(routeId);
    var snap = await ref.get();
    if (!snap.exists) return null;
    var data = snap.data()!;
    if (await _normalizeFreeRideDocument(routeId, data)) {
      snap = await ref.get();
      if (!snap.exists) return null;
      data = snap.data()!;
    }
    return _freeRideDetailsFromMap(data);
  }

  /// Set free ride status for [routeId]. Uses doc id == [routeId].
  /// When enabling: [freeRideUntil] is required; [freeRideFrom] defaults to now.
  Future<void> setFreeRideStatus(
    String routeId, {
    required bool isFreeRide,
    required String operatorId,
    DateTime? freeRideUntil,
    DateTime? freeRideFrom,
  }) async {
    final ref = FirebaseFirestore.instance
        .collection(driverStatusCollection)
        .doc(routeId);
    if (!isFreeRide) {
      await ref.set({
        'route_id': routeId,
        'operator_id': operatorId,
        'free_ride': 0,
        'is_free_ride': false,
        'duration_minutes': FieldValue.delete(),
        'free_ride_until': FieldValue.delete(),
        'free_ride_from': FieldValue.delete(),
        'updatedAt': FieldValue.serverTimestamp(),
      }, SetOptions(merge: true));
      return;
    }
    final until = freeRideUntil ?? DateTime.now().add(const Duration(hours: 1));
    final from = freeRideFrom ?? DateTime.now();
    final durationMinutes = until.difference(from).inMinutes;
    await ref.set({
      'route_id': routeId,
      'operator_id': operatorId,
      'free_ride': 1,
      'is_free_ride': true,
      'duration_minutes': durationMinutes > 0 ? durationMinutes : 0,
      'free_ride_until': Timestamp.fromDate(until),
      'free_ride_from': Timestamp.fromDate(from),
      'updatedAt': FieldValue.serverTimestamp(),
    }, SetOptions(merge: true));
  }

  void dispose() {
    _subscription?.cancel();
  }
}
