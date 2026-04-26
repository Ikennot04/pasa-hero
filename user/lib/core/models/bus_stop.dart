import 'package:google_maps_flutter/google_maps_flutter.dart';

/// Represents a bus stop from Firestore.
///
/// Document ID is used as the stop code.
class BusStop {
  final String id;
  final String name;
  final String route;
  final double lat;
  final double lng;

  const BusStop({
    required this.id,
    required this.name,
    required this.route,
    required this.lat,
    required this.lng,
  });

  LatLng get position => LatLng(lat, lng);

  /// Stop code is the Firestore document ID.
  String get stopCode => id;

  factory BusStop.fromFirestore(String id, Map<String, dynamic> data) {
    return BusStop(
      id: id,
      name: data['name'] as String? ?? '',
      route: data['route'] as String? ?? '',
      lat: (data['lat'] is num) ? (data['lat'] as num).toDouble() : 0.0,
      lng: (data['lng'] is num) ? (data['lng'] as num).toDouble() : 0.0,
    );
  }
}
