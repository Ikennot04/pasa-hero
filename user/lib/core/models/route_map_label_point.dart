import 'package:google_maps_flutter/google_maps_flutter.dart';

/// One labeled stop on the route-details map (start, bus stop, or end).
class RouteMapLabelPoint {
  const RouteMapLabelPoint({
    required this.name,
    required this.position,
  });

  final String name;
  final LatLng position;
}
