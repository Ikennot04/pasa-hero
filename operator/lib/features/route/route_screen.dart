import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:geolocator/geolocator.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import '../../../core/services/directions_service.dart';
import '../../../core/services/location_service.dart';
import '../../../core/services/map/map_service.dart';
import '../profile/screen/profile_screen_data.dart';
import '../map/services/bus_stop_icon_service.dart';

/// Camera over Route1 bus stops so they are visible on first load.
const CameraPosition _initialCameraOverBusStops = CameraPosition(
  target: LatLng(10.3270, 123.9475),
  zoom: 14.0,
);

class RouteScreen extends StatefulWidget {
  const RouteScreen({super.key});

  static const String routeName = '/route';

  @override
  State<RouteScreen> createState() => _RouteScreenState();
}

class _RouteScreenState extends State<RouteScreen> {
  final LocationService _locationService = LocationService();
  final DirectionsService _directionsService = DirectionsService();
  final BusStopIconService _busStopIconService = BusStopIconService.instance;
  GoogleMapController? _mapController;
  BitmapDescriptor? _operatorIcon;
  String? _mapStyleJson;
  bool _isLoading = true;
  Position? _currentPosition;
  CameraPosition? _initialCameraPosition;
  Set<Marker> _markers = {};
  Set<Polyline> _routePolylines = {};
  bool _isLocationRequestInProgress = false;

  static const String _busStopRoutePolylineId = 'bus_stop_route';

  static const String _routeEndpointA = 'UCLM';
  static const String _routeEndpointB = 'City Hall';

  @override
  void initState() {
    super.initState();
    _initialCameraPosition = _initialCameraOverBusStops;
    _loadOperatorIcon();
    _loadMapStyle();
    // Show bus stop markers and route line immediately (this is the map operators see first)
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      _addBusStopMarkersAndRoute(
        _fallbackBusStops(),
        BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueOrange),
      );
      setState(() => _isLoading = false);
    });
    _loadBusStopSignAndUpdateMarkers();
    _initializeLocation();
  }

  List<({String name, LatLng position})> _fallbackBusStops() {
    final all = AvailableRoutes.route1Stops
        .map((s) => (name: s.name, position: s.position))
        .toList();
    return _sliceStopsBetweenEndpoints(all);
  }

  List<({String name, LatLng position})> _sliceStopsBetweenEndpoints(
    List<({String name, LatLng position})> stops,
  ) {
    int? idxA;
    int? idxB;
    for (int i = 0; i < stops.length; i++) {
      final n = stops[i].name.trim().toLowerCase();
      if (n == _routeEndpointA.toLowerCase()) idxA = i;
      if (n == _routeEndpointB.toLowerCase()) idxB = i;
    }
    if (idxA == null || idxB == null) return stops;
    if (idxA == idxB) return [stops[idxA]];
    if (idxA < idxB) {
      return stops.sublist(idxA, idxB + 1);
    }
    return stops.sublist(idxB, idxA + 1).reversed.toList();
  }

  /// Adds bus stop markers (names without numbers) and route polyline along streets via Directions API.
  Future<void> _addBusStopMarkersAndRoute(
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
            infoWindow: InfoWindow(title: stop.name, snippet: 'Bus stop · Route1'),
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
            color: const Color.fromARGB(255, 34, 137, 255),
            width: 6,
            startCap: Cap.roundCap,
            endCap: Cap.roundCap,
            jointType: JointType.round,
          ),
        };
      });
    }
  }

  Future<void> _loadBusStopSignAndUpdateMarkers() async {
    try {
      await _busStopIconService.loadIcons();
      if (!mounted) return;
      _addBusStopMarkersAndRoute(
        _fallbackBusStops(),
        _busStopIconService.defaultIcon,
      );
    } catch (_) {}
  }

  Future<void> _loadMapStyle() async {
    try {
      final json = await rootBundle.loadString(
        'assets/map_styles/traffic_only_style.json',
      );
      if (mounted) {
        setState(() => _mapStyleJson = json);
        _mapController?.setMapStyle(_mapStyleJson);
      }
    } catch (_) {}
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
          print('✅ [RouteScreen] Operator icon loaded, refreshing operator marker');
          _addOperatorMarker(_currentPosition!);
        }
      }
    } catch (e) {
      print('⚠️ [RouteScreen] Failed to load operator icon: $e');
    }
  }

  /// Initializes location services and gets operator's current position.
  Future<void> _initializeLocation({bool showError = true}) async {
    if (_isLocationRequestInProgress) return;
    
    _isLocationRequestInProgress = true;
    setState(() {
      _isLoading = true;
    });

    try {
      // Check if location services are enabled
      print('🗺️ [RouteScreen] Step 1: Checking if location services are enabled...');
      bool serviceEnabled = await _locationService.isLocationServiceEnabled();
      print('   📍 Location services enabled: $serviceEnabled');
      
      if (!serviceEnabled) {
        print('   ❌ Location services are DISABLED - using default location');
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
        _isLocationRequestInProgress = false;
        return;
      }

      // Request permission
      print('🗺️ [RouteScreen] Step 2: Requesting location permission...');
      bool hasPermission = await _locationService.requestPermission();
      print('   📍 Permission granted: $hasPermission');
      
      if (!hasPermission) {
        print('   ❌ Permission NOT granted - using default location');
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
        _isLocationRequestInProgress = false;
        return;
      }

      // Get current position (optimized for low-end devices)
      print('🗺️ [RouteScreen] Step 3: Getting current position (optimized mode)...');
      Position position = await _locationService.getCurrentPosition(
        preferLowAccuracy: true,
        useCachedPosition: true,
      );
      print('   ✅ Position received:');
      print('      Latitude: ${position.latitude}');
      print('      Longitude: ${position.longitude}');
      print('      Accuracy: ${position.accuracy}m');
      
      
      // Update state first
      if (mounted) {
        setState(() {
          _currentPosition = position;
          _initialCameraPosition = MapService.cameraPositionFromPosition(position);
          _isLoading = false;
        });
      }
      
      // Add marker for operator location
      _addOperatorMarker(position);
      
      // Center map on operator location
      if (_mapController != null) {
        try {
          await _mapController!.moveCamera(
            MapService.createInstantCameraUpdate(position),
          );
          print('   ✅ Camera moved to operator location');
        } catch (e) {
          print('   ⚠️ Error moving camera: $e');
        }
      }
    } catch (e) {
      print('   ❌ [RouteScreen] _initializeLocation() ERROR: $e');
      print('   📋 Error type: ${e.runtimeType}');
      
      // Check if it's a timeout error
      bool isTimeout = e.toString().contains('timed out') || 
                       e.toString().contains('TimeoutException');
      
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
                'GPS timeout. Using default location.\n\nIf using emulator, set a mock location in emulator settings.',
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

  /// Adds a marker for the operator's location; keeps all bus stop markers.
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
      _markers = {
        ..._markers.where((m) => m.markerId.value != 'operator_location'),
        operatorMarker,
      };
    });
  }

  @override
  void dispose() {
    _mapController?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Stack(
        children: [
          GoogleMap(
            initialCameraPosition: _initialCameraPosition ?? MapService.getDefaultCameraPosition(),
            onMapCreated: (c) {
              _mapController = c;
              if (_mapStyleJson != null) _mapController!.setMapStyle(_mapStyleJson);
              // If we already have a position, center the map on it
              if (_currentPosition != null) {
                _mapController!.moveCamera(
                  MapService.createInstantCameraUpdate(_currentPosition!),
                );
              }
            },
            mapType: MapType.normal,
            zoomControlsEnabled: false,
            compassEnabled: false,
            myLocationEnabled: false,
            myLocationButtonEnabled: false,
            markers: _markers,
            circles: const {},
            polygons: const {},
            polylines: _routePolylines,
            trafficEnabled: true,
          ),
          if (_isLoading)
            const Center(
              child: CircularProgressIndicator(),
            ),
          Positioned(
            top: 16,
            right: 16,
            child: FloatingActionButton(
              mini: true,
              onPressed: _isLocationRequestInProgress ? null : () => _initializeLocation(),
              child: const Icon(Icons.my_location),
              tooltip: 'Center on my location',
            ),
          ),
        ],
      ),
    );
  }
}
