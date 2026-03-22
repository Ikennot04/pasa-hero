/// Operator bus location from Firestore [operator_locations].
class NearbyOperator {
  const NearbyOperator({
    required this.operatorId,
    required this.latitude,
    required this.longitude,
    this.routeCode,
    this.distanceMeters,
  });

  final String operatorId;
  final double latitude;
  final double longitude;
  final String? routeCode;

  /// Distance from rider when GPS is known; null when only filtering by route code.
  final double? distanceMeters;

  String get distanceLabel {
    final m = distanceMeters;
    if (m == null) return 'Live on map';
    if (m < 1000) {
      return '${m.round()} m away';
    }
    return '${(m / 1000).toStringAsFixed(1)} km away';
  }
}
