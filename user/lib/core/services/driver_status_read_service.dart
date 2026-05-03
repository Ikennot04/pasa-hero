import 'package:cloud_firestore/cloud_firestore.dart';

/// Firestore collection for driver status (free ride flags). Read-only on user app.
const String driverStatusCollection = 'driver_status';

bool isFreeRideWindowActive({
  required bool? isFreeRide,
  required DateTime? freeRideUntil,
}) {
  if (isFreeRide != true) return false;
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

  bool _readFreeRideBool(Map<String, dynamic> data) {
    final directBool = data['is_free_ride'];
    if (directBool is bool) return directBool;
    final numeric = data['free_ride'];
    if (numeric is num) return numeric == 1;
    return false;
  }

  FreeRideStatusSnapshot? _fromSnapshot(DocumentSnapshot<Map<String, dynamic>> snap) {
    if (!snap.exists) return null;
    final data = snap.data()!;
    final freeRideUntil = (data['free_ride_until'] as Timestamp?)?.toDate();
    final freeRideFrom = (data['free_ride_from'] as Timestamp?)?.toDate();
    final isFreeRide = _readFreeRideBool(data);
    final active = isFreeRideWindowActive(
      isFreeRide: isFreeRide,
      freeRideUntil: freeRideUntil,
    );
    final updatedTs = data['updatedAt'] as Timestamp?;
    return FreeRideStatusSnapshot(
      isActive: active,
      startTime: freeRideFrom,
      endTime: freeRideUntil,
      operatorId: data['operator_id']?.toString(),
      updatedAt: updatedTs?.toDate(),
    );
  }

  /// Live updates for [routeCode] — same Firestore doc id operators use (uppercase route code).
  Stream<FreeRideStatusSnapshot?> freeRideStream(String routeCode) {
    final id = routeCode.trim();
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
