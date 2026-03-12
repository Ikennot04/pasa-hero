import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:geolocator/geolocator.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import '../../../core/services/location_service.dart';
import '../../../core/services/map/map_service.dart';

class RouteScreen extends StatefulWidget {
  const RouteScreen({super.key});

  static const String routeName = '/route';

  @override
  State<RouteScreen> createState() => _RouteScreenState();
}

class _RouteScreenState extends State<RouteScreen> {
  final LocationService _locationService = LocationService();
  GoogleMapController? _mapController;
  String? _mapStyleJson;
  bool _isLoading = true;
  Position? _currentPosition;
  CameraPosition? _initialCameraPosition;
  Set<Marker> _markers = {};
  bool _isLocationRequestInProgress = false;

  @override
  void initState() {
    super.initState();
    // Set initial camera position immediately so map shows right away
    _initialCameraPosition = MapService.getDefaultCameraPosition();
    _loadMapStyle();
    // Then try to get location in background
    _initializeLocation();
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

  /// Adds a marker for the operator's location.
  void _addOperatorMarker(Position position) {
    setState(() {
      _markers = {
        Marker(
          markerId: const MarkerId('operator_location'),
          position: LatLng(position.latitude, position.longitude),
          infoWindow: const InfoWindow(
            title: 'Your Location',
            snippet: 'Operator current location',
          ),
          icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueBlue),
        ),
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
            polylines: const {},
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
