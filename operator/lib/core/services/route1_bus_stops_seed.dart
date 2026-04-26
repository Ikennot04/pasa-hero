import 'package:google_maps_flutter/google_maps_flutter.dart';

import '../../features/profile/screen/profile_screen_data.dart';

/// Default bus stops for [Route1] — UCLM → City Hall corridor (Mandaue / Cebu area).
/// Writes to Firestore collections `route_code` and `routes` (doc id `Route1`).
class Route1BusStopsSeed {
  Route1BusStopsSeed._();

  static const String routeDocId = 'Route1';

  /// Ordered list: first stop = point A, last = point B.
  static List<({String name, LatLng position})> get defaultStops => [
        (name: 'UCLM', position: const LatLng(10.32467, 123.95312)),
        (name: "nature's spring", position: const LatLng(10.32702, 123.95190)),
        (name: 'MCWD', position: const LatLng(10.32744, 123.95144)),
        (name: 'MGA Arcade', position: const LatLng(10.32984, 123.94857)),
        (name: 'Cortes Ave.', position: const LatLng(10.32923, 123.94709)),
        (name: 'School right', position: const LatLng(10.32476, 123.94417)),
        (name: 'School left', position: const LatLng(10.32457, 123.94420)),
        (name: 'Badminton', position: const LatLng(10.32411, 123.94209)),
        (name: 'Centro Barangay', position: const LatLng(10.32454, 123.94166)),
        (name: 'City Hall', position: const LatLng(10.32730, 123.94312)),
      ];

  /// Pushes [defaultStops] to `route_code/Route1` and `routes/Route1`.
  static Future<bool> pushToFirestore() async {
    final stops = defaultStops;
    if (stops.length < 2) return false;

    final first = stops.first.position;
    final last = stops.last.position;

    final okRc = await RouteCodeService.save(
      routeCode: routeDocId,
      pointA: first,
      pointB: last,
      busStops: stops,
      name: 'Route 1',
      description: 'UCLM – City Hall (seeded bus stops)',
    );

    final okRoutes = await RouteDataService.saveRouteToFirestore(
      code: routeDocId,
      name: 'Route 1',
      description: 'UCLM – City Hall (seeded bus stops)',
      stops: stops,
    );

    return okRc && okRoutes;
  }
}
