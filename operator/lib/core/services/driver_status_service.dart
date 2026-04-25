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
    return docRef.snapshots().map((snap) {
      if (!snap.exists) return null;
      final data = snap.data()!;
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
    });
  }

  /// One-time check: get current free-ride state for [routeId].
  Future<bool> isFreeRideActiveForRoute(String routeId) async {
    final details = await getFreeRideDetails(routeId);
    return details?.isActive ?? false;
  }

  /// One-time fetch of free ride details for [routeId].
  Future<FreeRideDetails?> getFreeRideDetails(String routeId) async {
    final snap = await FirebaseFirestore.instance
        .collection(driverStatusCollection)
        .doc(routeId)
        .get();
    if (!snap.exists) return null;
    final data = snap.data()!;
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
        'duration_minutes': 0,
        'free_ride_until': null,
        'free_ride_from': null,
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
