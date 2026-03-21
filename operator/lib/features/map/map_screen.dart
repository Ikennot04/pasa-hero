import 'dart:async';
import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import '../../core/services/location_service.dart';
import '../../core/services/map/map_service.dart';
import '../../core/services/directions_service.dart';
import '../profile/screen/profile_screen_data.dart';
import 'services/bus_stop_icon_service.dart';

/// Initial map center so bus stops are visible on first load.
const CameraPosition _initialCameraOverBusStops = CameraPosition(
  target: LatLng(10.3270, 123.9475),
  zoom: 14.0,
);

class MapScreen extends StatefulWidget {
  const MapScreen({super.key});

  static const String routeName = '/map';

  @override
  State<MapScreen> createState() => _MapScreenState();
}

class _MapScreenState extends State<MapScreen> {
  final LocationService _locationService = LocationService();
  final DirectionsService _directionsService = DirectionsService();
  final BusStopIconService _busStopIconService = BusStopIconService.instance;
  GoogleMapController? _mapController;
  BitmapDescriptor? _operatorIcon;
  bool _isLoading = true;
  Position? _currentPosition;
  CameraPosition? _initialCameraPosition;
  Set<Marker> _markers = {};
  Set<Polyline> _routePolylines = {};
  bool _isLocationRequestInProgress = false;

  /// Polyline id for the bus stop route (so operator can see their route).
  static const String _busStopRoutePolylineId = 'bus_stop_route';

  @override
  void initState() {
    super.initState();
    _initialCameraPosition = _initialCameraOverBusStops;
    _loadOperatorIcon();
    // Show bus stop markers immediately (orange) so they are never missing; upgrade to bus stop sign when loaded
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      _addBusStopMarkers(
        _fallbackBusStops(),
        BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueOrange),
      );
      setState(() => _isLoading = false);
    });
    // Then load bus stop sign icon and DB, and replace markers with bus stop sign
    _loadBusStopsFromDatabaseAndShow();
  }

  /// Load bus stop sign icon and Route1 from DB, then replace markers with bus stop sign icon.
  Future<void> _loadBusStopsFromDatabaseAndShow() async {
    try {
      await _busStopIconService.loadIcons();
      if (!mounted) return;

      await RouteDataService.ensureRoute1InFirestore();
      if (!mounted) return;

      final List<({String name, LatLng position})> stops =
          await _getBusStopsFromDatabase();
      if (!mounted) return;

      _addBusStopMarkers(stops, _busStopIconService.defaultIcon);
      if (!mounted) return;

      setState(() => _isLoading = false);
    } catch (e, st) {
      print('⚠️ [MapScreen] _loadBusStopsFromDatabaseAndShow failed: $e');
      print('   $st');
      if (mounted) {
        _addBusStopMarkers(
          _fallbackBusStops(),
          _busStopIconService.defaultIcon,
        );
        setState(() => _isLoading = false);
      }
    } finally {
      if (mounted) _loadOperatorRoute();
    }
  }

  /// Get bus stops from Firestore Route1; fallback to in-code Route1 stops.
  Future<List<({String name, LatLng position})>> _getBusStopsFromDatabase() async {
    try {
      final data =
          await RouteDataService.getRouteFromFirestore(AvailableRoutes.route1Code);
      if (data == null) return _fallbackBusStops();

      final stopsList = data['stops'] as List<dynamic>?;
      if (stopsList == null || stopsList.isEmpty) return _fallbackBusStops();

      final List<({String name, LatLng position})> result = [];
      for (int i = 0; i < stopsList.length; i++) {
        final stop = stopsList[i];
        if (stop is! Map<String, dynamic>) continue;
        final name = stop['name'] as String? ?? 'Stop ${i + 1}';
        final lat = (stop['latitude'] as num?)?.toDouble();
        final lng = (stop['longitude'] as num?)?.toDouble();
        if (lat == null || lng == null) continue;
        result.add((name: name, position: LatLng(lat, lng)));
      }
      if (result.isEmpty) return _fallbackBusStops();
      final sliced = AvailableRoutes.route1StopsForHighlightRoad(result);
      print('✅ [MapScreen] Loaded ${result.length} bus stops from Firestore Route1; using ${sliced.length} (UCLM → City Hall order)');
      return sliced;
    } catch (e) {
      print('⚠️ [MapScreen] Error loading bus stops from database: $e');
      return _fallbackBusStops();
    }
  }

  List<({String name, LatLng position})> _fallbackBusStops() {
    final all = AvailableRoutes.route1Stops
        .map((s) => (name: s.name, position: s.position))
        .toList();
    return AvailableRoutes.route1StopsForHighlightRoad(all);
  }

  /// Adds bus stop markers (names without numbers) and route polyline along streets via Directions API.
  Future<void> _addBusStopMarkers(
    List<({String name, LatLng position})> stops,
    BitmapDescriptor icon,
  ) async {
    if (!mounted || stops.isEmpty) return;
    final points = stops.map((s) => s.position).toList();
    setState(() {
      final existingNonBusStop = _markers.where(
        (m) => !m.markerId.value.startsWith('bus_stop_'),
      ).toSet();
      final busStopMarkers = <Marker>{};
      for (int i = 0; i < stops.length; i++) {
        final stop = stops[i];
        busStopMarkers.add(
          Marker(
            markerId: MarkerId('bus_stop_$i'),
            position: stop.position,
            icon: icon,
            infoWindow: InfoWindow(
              title: stop.name,
              snippet: 'Bus stop · Route1',
            ),
          ),
        );
      }
      _markers = {...existingNonBusStop, ...busStopMarkers};
      _routePolylines = _routePolylines
          .where((p) => p.polylineId.value != _busStopRoutePolylineId)
          .toSet();
    });
    final routeResult = await _directionsService.getRouteWithWaypoints(points);
    if (!mounted) return;
    if (routeResult != null && routeResult.polyline.isNotEmpty) {
      setState(() {
        _routePolylines = {
          ..._routePolylines,
          Polyline(
            polylineId: const PolylineId(_busStopRoutePolylineId),
            points: routeResult.polyline,
            color: Colors.deepOrange,
            width: 6,
            startCap: Cap.roundCap,
            endCap: Cap.roundCap,
            jointType: JointType.round,
          ),
        };
      });
    }
    print('✅ [MapScreen] Added ${stops.length} bus stop markers and street route');
  }

  Future<void> _loadOperatorIcon() async {
    try {
      final icon = await BitmapDescriptor.fromAssetImage(
        const ImageConfiguration(),
        'assets/images/buspic.png',
      );
      if (mounted) {
        setState(() {
          _operatorIcon = icon;
        });
        // If we already know the current position, refresh the operator marker
        if (_currentPosition != null) {
          print('✅ [MapScreen] Operator icon loaded, refreshing operator marker');
          _addOperatorMarker(_currentPosition!);
        }
      }
    } catch (e) {
      print('⚠️ [MapScreen] Failed to load operator icon: $e');
    }
  }

  /// Loads the operator's route code from Firestore and highlights the route if set.
  /// Bus stops are always shown (hardcoded); route polyline/start/end require a route in Profile.
  Future<void> _loadOperatorRoute() async {
    try {
      final routeCode = await ProfileDataService.getOperatorRouteCode();
      final trimmedCode = routeCode?.trim();
      if (mounted && trimmedCode != null && trimmedCode.isNotEmpty) {
        await _highlightRoute(trimmedCode);
      }
    } catch (e) {
      print('⚠️ [MapScreen] Error loading route code: $e');
    }
    // Initialize location after loading route
    _initializeLocation();
  }

  /// Highlights the route on the map based on the route code.
  Future<void> _highlightRoute(String routeCode) async {
    final code = routeCode.trim();
    final coordinates = AvailableRoutes.getRouteCoordinates(code);
    if (coordinates == null) {
      print('⚠️ [MapScreen] No coordinates found for route code: $code');
      return;
    }

    try {
      // Reuse already-drawn bus-stop route first so blue highlight follows exactly
      // the same street path and does not introduce alternate roads.
      final existingBusStopPolyline = _routePolylines
          .where((p) => p.polylineId.value == _busStopRoutePolylineId)
          .firstOrNull;
      final busStopPoints = existingBusStopPolyline?.points ?? const <LatLng>[];

      final List<LatLng> highlightPoints;
      if (busStopPoints.isNotEmpty) {
        highlightPoints = busStopPoints;
      } else {
        final List<LatLng> waypointCoords = coordinates.stops.length >= 2
            ? coordinates.stops
            : [coordinates.startPoint, coordinates.endPoint];
        final routeResult = waypointCoords.length >= 2
            ? await _directionsService.getRouteWithWaypoints(waypointCoords)
            : await _directionsService.getRouteWithDistance(
                coordinates.startPoint,
                coordinates.endPoint,
              );
        highlightPoints = routeResult?.polyline ?? const <LatLng>[];
      }

      // Get route info for display
      final routeInfo = AvailableRoutes.getRouteByCode(code);

      if (mounted) {
        setState(() {
          // One visible road: operator highlight only (same path as bus stops; no stacked lines).
          if (highlightPoints.isNotEmpty) {
            _routePolylines = {
              Polyline(
                polylineId: PolylineId('operator_route_$code'),
                points: highlightPoints,
                color: Colors.blue,
                width: 5,
                patterns: [PatternItem.dash(20), PatternItem.gap(10)],
              ),
            };
          }
          // else keep existing _routePolylines (bus stop route stays)

          // Add route start/end markers; preserve operator and hardcoded bus stop markers
          final updatedMarkers = <Marker>{
            ..._markers.where(
              (m) =>
                  m.markerId.value != 'route_start' &&
                  m.markerId.value != 'route_end',
            ),
            // Start point marker
            Marker(
              markerId: const MarkerId('route_start'),
              position: coordinates.startPoint,
              icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueGreen),
              infoWindow: InfoWindow(
                title: code.toUpperCase() == AvailableRoutes.route1Code.toUpperCase()
                    ? AvailableRoutes.route1HighlightStopNamesInOrder.first
                    : (routeInfo?.name ?? 'Route Start'),
                snippet: code.toUpperCase() == AvailableRoutes.route1Code.toUpperCase()
                    ? 'Stop 1 · ${routeInfo?.name ?? code}'
                    : 'Start: ${routeInfo?.name ?? code}',
              ),
            ),
            // End point marker
            Marker(
              markerId: const MarkerId('route_end'),
              position: coordinates.endPoint,
              icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueRed),
              infoWindow: InfoWindow(
                title: code.toUpperCase() == AvailableRoutes.route1Code.toUpperCase()
                    ? AvailableRoutes.route1HighlightStopNamesInOrder.last
                    : 'Route End',
                snippet: code.toUpperCase() == AvailableRoutes.route1Code.toUpperCase()
                    ? 'Stop 10 · ${routeInfo?.name ?? code}'
                    : 'End: ${routeInfo?.name ?? code}',
              ),
            ),
          };

          _markers = updatedMarkers;
        });

        print('✅ [MapScreen] Added route start/end markers. Total markers: ${_markers.length}');

        // Fit camera to show the entire route if we have a polyline
        if (_mapController != null && highlightPoints.isNotEmpty) {
          try {
            final bounds = _calculateBounds(highlightPoints);
            await _mapController!.animateCamera(
              CameraUpdate.newLatLngBounds(bounds, 100),
            );
          } catch (e) {
            print('⚠️ [MapScreen] Error fitting camera to route: $e');
          }
        }

        print('✅ [MapScreen] Route highlighted: ${routeInfo?.name ?? code}');
      }
    } catch (e) {
      print('❌ [MapScreen] Error highlighting route: $e');
    }
  }

  /// Calculates bounds from a list of points.
  LatLngBounds _calculateBounds(List<LatLng> points) {
    if (points.isEmpty) {
      return LatLngBounds(
        southwest: const LatLng(10.25, 123.75),
        northeast: const LatLng(10.45, 124.05),
      );
    }

    double minLat = points.first.latitude;
    double maxLat = points.first.latitude;
    double minLng = points.first.longitude;
    double maxLng = points.first.longitude;

    for (final p in points) {
      if (p.latitude < minLat) minLat = p.latitude;
      if (p.latitude > maxLat) maxLat = p.latitude;
      if (p.longitude < minLng) minLng = p.longitude;
      if (p.longitude > maxLng) maxLng = p.longitude;
    }

    return LatLngBounds(
      southwest: LatLng(minLat, minLng),
      northeast: LatLng(maxLat, maxLng),
    );
  }

  @override
  void dispose() {
    _mapController?.dispose();
    super.dispose();
  }

  /// Initializes location services and gets operator's current position.
  /// 
  /// This method:
  /// 1. Checks if location services are enabled
  /// 2. Requests location permission if needed
  /// 3. Gets current GPS position (or last known, or default)
  /// 4. Centers map on operator location
  Future<void> _initializeLocation({bool showError = true}) async {
    print('🗺️ [MapScreen] _initializeLocation() called (showError: $showError)');
    
    // Prevent concurrent location requests
    if (_isLocationRequestInProgress) {
      print('   ⚠️ Location request already in progress, skipping...');
      return;
    }
    
    _isLocationRequestInProgress = true;
    setState(() {
      _isLoading = true;
    });

    try {
      // Check if location services are enabled
      print('🗺️ [MapScreen] Step 1: Checking if location services are enabled...');
      bool serviceEnabled = await _locationService.isLocationServiceEnabled();
      print('   📍 Location services enabled: $serviceEnabled');
      
      if (!serviceEnabled) {
        print('   ❌ Location services are DISABLED - using default location');
        // If location services disabled, use default location silently
        setState(() {
          _initialCameraPosition = MapService.getDefaultCameraPosition();
          _isLoading = false;
        });
        if (showError && mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Location services disabled. Using default location.'),
              duration: Duration(seconds: 2),
            ),
          );
        }
        _isLocationRequestInProgress = false; // Reset guard
        return;
      }

      // Request permission
      print('🗺️ [MapScreen] Step 2: Requesting location permission...');
      bool hasPermission = await _locationService.requestPermission();
      print('   📍 Permission granted: $hasPermission');
      
      if (!hasPermission) {
        print('   ❌ Permission NOT granted - using default location');
        // If no permission, use default location silently
        setState(() {
          _initialCameraPosition = MapService.getDefaultCameraPosition();
          _isLoading = false;
        });
        if (showError && mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Location permission not granted. Using default location.'),
              duration: Duration(seconds: 2),
            ),
          );
        }
        _isLocationRequestInProgress = false; // Reset guard
        return;
      }

      // Get current position (optimized for low-end devices)
      print('🗺️ [MapScreen] Step 3: Getting current position (optimized mode)...');
      Position position = await _locationService.getCurrentPosition(
        preferLowAccuracy: false,
        useCachedPosition: true,
      );
      print('   ✅ Position received:');
      print('      Latitude: ${position.latitude}');
      print('      Longitude: ${position.longitude}');
      print('      Accuracy: ${position.accuracy}m');
      
      // Check if this is a cached/old position
      final positionAge = DateTime.now().difference(position.timestamp);
      final isCachedPosition = positionAge.inMinutes > 3;
      
      // Update state first (without marker to avoid blocking)
      if (mounted) {
        setState(() {
          _currentPosition = position;
          _initialCameraPosition = MapService.cameraPositionFromPosition(position);
          _isLoading = false;
        });
      }
      
      // Add marker for operator location (but preserve route markers if they exist)
      _addOperatorMarker(position);
      
      // Show appropriate message based on position freshness
      if (mounted && isCachedPosition) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              'Using cached location (${positionAge.inMinutes} min old). Move to get fresh GPS fix.',
            ),
            duration: const Duration(seconds: 3),
            backgroundColor: Colors.orange,
          ),
        );
      }

      // Center map on operator location after controller is ready
      if (_mapController != null) {
        print('🗺️ [MapScreen] Map controller is ready, moving camera to location...');
        try {
          await _mapController!.moveCamera(
            MapService.createInstantCameraUpdate(position),
          );
          print('   ✅ Camera moved to operator location');
        } catch (e) {
          print('   ⚠️ Error moving camera: $e');
          // Don't throw - camera move is not critical
        }
      } else {
        print('   ⚠️ Map controller is not ready yet - will center when ready');
      }
      
      // Show success message
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Location found!'),
            duration: Duration(seconds: 1),
          ),
        );
      }
    } catch (e) {
      print('   ❌ [MapScreen] _initializeLocation() ERROR: $e');
      print('   📋 Error type: ${e.runtimeType}');
      print('   📋 Error toString: ${e.toString()}');
      
      // Check if it's a timeout error
      bool isTimeout = e is TimeoutException ||
          e.toString().toLowerCase().contains('timeout');
      print('   📋 Is timeout error: $isTimeout');
      
      // For timeout, show helpful message and use default location
      if (isTimeout) {
        print('   🔄 Handling timeout - using default location');
        
        setState(() {
          _isLoading = false;
          _initialCameraPosition = MapService.getDefaultCameraPosition();
        });
        
        if (showError && mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: const Text(
                'GPS timeout. Using default location.\n\nOn Android: set Location mode to "High accuracy" and enable "Precise location" for this app. Move outside and try again.',
              ),
              duration: const Duration(seconds: 5),
              action: SnackBarAction(
                label: 'Retry',
                onPressed: () => _initializeLocation(showError: true),
              ),
            ),
          );
        }
      } else {
        print('   🔄 Handling other error - showing error message');
        // For other errors, show error message
        final errorMessage = e.toString().replaceAll('Exception: ', '');
        setState(() {
          _isLoading = false;
          _initialCameraPosition = MapService.getDefaultCameraPosition();
        });
        
        if (showError && mounted) {
          final isPermanentlyDenied = errorMessage.contains('permanently denied');
          final isServiceDisabled = errorMessage.contains('services are disabled');
          
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(errorMessage),
              duration: const Duration(seconds: 5),
              action: isPermanentlyDenied || isServiceDisabled
                  ? SnackBarAction(
                      label: 'Settings',
                      onPressed: () async {
                        if (isPermanentlyDenied) {
                          await _locationService.openAppSettings();
                        } else if (isServiceDisabled) {
                          await _locationService.openLocationSettings();
                        }
                      },
                    )
                  : SnackBarAction(
                      label: 'Retry',
                      onPressed: () => _initializeLocation(showError: true),
                    ),
            ),
          );
        }
      }
    } finally {
      // Always reset the guard
      _isLocationRequestInProgress = false;
    }
  }

  /// Adds a marker for the operator's location.
  /// Keeps all existing markers (bus stops, route start/end) by building a new set.
  void _addOperatorMarker(Position position) {
    setState(() {
      final operatorMarker = Marker(
        markerId: const MarkerId('operator_location'),
        position: LatLng(position.latitude, position.longitude),
        infoWindow: const InfoWindow(
          title: 'Your Location',
          snippet: 'Operator current location',
        ),
        icon: _operatorIcon ?? BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueBlue),
      );
      // Replace only operator marker; keep all bus_stop_*, route_start, route_end
      _markers = {
        ..._markers.where((m) => m.markerId.value != 'operator_location'),
        operatorMarker,
      };
      
      print('✅ [MapScreen] Added operator marker. Total markers: ${_markers.length}');
      print('   📍 Bus stop markers preserved: ${_markers.where((m) => m.markerId.value.startsWith('bus_stop_')).length}');
    });
  }

  /// Gets accurate street distance between two points using Google Maps API.
  /// This replaces inaccurate equation-based calculations with real street routing.
  /// 
  /// Returns the distance in meters, or null if the route cannot be calculated.
  /// 
  /// Example usage:
  /// ```dart
  /// final distance = await _getAccurateStreetDistance(
  ///   LatLng(10.3157, 123.8854), // Origin
  ///   LatLng(10.3200, 123.8900), // Destination
  /// );
  /// if (distance != null) {
  ///   print('Distance: ${distance / 1000} km');
  /// }
  /// ```
  Future<double?> getAccurateStreetDistance(
    LatLng origin,
    LatLng destination,
  ) async {
    try {
      final result = await _directionsService.getRouteWithDistance(origin, destination);
      if (result != null) {
        print('✅ [MapScreen] Accurate street distance: ${result.distanceMeters}m (${result.distanceText})');
        return result.distanceMeters;
      } else {
        print('⚠️ [MapScreen] Could not calculate route distance');
        return null;
      }
    } catch (e) {
      print('❌ [MapScreen] Error getting accurate distance: $e');
      return null;
    }
  }

  /// Gets accurate street distance with full route information.
  /// Returns a RouteResult with distance, duration, and polyline points.
  Future<RouteResult?> getRouteWithDistance(
    LatLng origin,
    LatLng destination,
  ) async {
    try {
      final result = await _directionsService.getRouteWithDistance(origin, destination);
      if (result != null) {
        print('✅ [MapScreen] Route calculated: ${result.distanceText}, ${result.durationText ?? "N/A"}');
      }
      return result;
    } catch (e) {
      print('❌ [MapScreen] Error getting route: $e');
      return null;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Map'),
        backgroundColor: Colors.blue,
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            icon: const Icon(Icons.my_location),
            tooltip: 'Center on my location',
            onPressed: _isLocationRequestInProgress ? null : () => _initializeLocation(),
          ),
        ],
      ),
      body: Stack(
        children: [
          GoogleMap(
            initialCameraPosition: _initialCameraPosition ?? MapService.getDefaultCameraPosition(),
            onMapCreated: (c) {
              _mapController = c;
              // If we already have a position, center the map on it
              if (_currentPosition != null) {
                _mapController!.moveCamera(
                  MapService.createInstantCameraUpdate(_currentPosition!),
                );
              }
            },
            mapType: MapService.getDefaultMapType(),
            zoomControlsEnabled: true,
            compassEnabled: true,
            myLocationEnabled: false,
            markers: _markers,
            polylines: _routePolylines,
          ),
          if (_isLoading)
            const Center(
              child: CircularProgressIndicator(),
            ),
        ],
      ),
    );
  }
}
