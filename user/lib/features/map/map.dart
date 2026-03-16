import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'map_screen.dart';

/// Widget wrapper for the map screen.
///
/// When [routeOrigin] and [routeDestination] are set, the map draws the driving
/// route from origin (e.g. closest bus stop) to destination.
class MapWidget extends StatelessWidget {
  const MapWidget({
    super.key,
    this.routeOrigin,
    this.routeDestination,
  });

  /// Start of the route (e.g. closest bus stop to user).
  final LatLng? routeOrigin;

  /// End of the route (e.g. selected destination bus stop).
  final LatLng? routeDestination;

  @override
  Widget build(BuildContext context) {
    return MapScreen(
      routeOrigin: routeOrigin,
      routeDestination: routeDestination,
    );
  }
}
