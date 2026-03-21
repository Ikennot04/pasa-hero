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

  const FreeRideDetails({
    required this.isActive,
    this.startTime,
    this.endTime,
  });
}

/// Service that listens to [driver_status] for a given [route_id],
/// finds the active driver and exposes whether free ride is active.
class DriverStatusService {
  DriverStatusService._();
  static final DriverStatusService instance = DriverStatusService._();

  StreamSubscription<QuerySnapshot>? _subscription;

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
      final isFreeRide = data['is_free_ride'] as bool?;
      final freeRideUntil = (data['free_ride_until'] as Timestamp?)?.toDate();
      final freeRideFrom = (data['free_ride_from'] as Timestamp?)?.toDate();
      final active = isFreeRideActive(
        isFreeRide: isFreeRide,
        freeRideUntil: freeRideUntil,
      );
      return FreeRideDetails(
        isActive: active,
        startTime: freeRideFrom,
        endTime: freeRideUntil,
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
    final isFreeRide = data['is_free_ride'] as bool?;
    final freeRideUntil = (data['free_ride_until'] as Timestamp?)?.toDate();
    final freeRideFrom = (data['free_ride_from'] as Timestamp?)?.toDate();
    final active = isFreeRideActive(
      isFreeRide: isFreeRide,
      freeRideUntil: freeRideUntil,
    );
    return FreeRideDetails(
      isActive: active,
      startTime: freeRideFrom,
      endTime: freeRideUntil,
    );
  }

  /// Set free ride status for [routeId]. Uses doc id == [routeId].
  /// When enabling: [freeRideUntil] is required; [freeRideFrom] defaults to now.
  Future<void> setFreeRideStatus(
    String routeId, {
    required bool isFreeRide,
    DateTime? freeRideUntil,
    DateTime? freeRideFrom,
  }) async {
    final ref = FirebaseFirestore.instance
        .collection(driverStatusCollection)
        .doc(routeId);
    if (!isFreeRide) {
      await ref.set({
        'route_id': routeId,
        'is_free_ride': false,
        'free_ride_until': null,
        'free_ride_from': null,
      }, SetOptions(merge: true));
      return;
    }
    final until = freeRideUntil ?? DateTime.now().add(const Duration(hours: 1));
    final from = freeRideFrom ?? DateTime.now();
    await ref.set({
      'route_id': routeId,
      'is_free_ride': true,
      'free_ride_until': Timestamp.fromDate(until),
      'free_ride_from': Timestamp.fromDate(from),
    }, SetOptions(merge: true));
  }

  void dispose() {
    _subscription?.cancel();
  }
}
