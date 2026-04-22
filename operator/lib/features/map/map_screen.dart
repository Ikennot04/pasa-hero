import 'dart:async';
import 'package:cloud_firestore/cloud_firestore.dart';
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
const String _userLocationsCollection = 'user_locations';

/// Draw order: bus stops and route ends low, operator mid, riders on top (large stop
/// bitmaps were hiding default rider pins).
const int _zBusStopMarker = 1;
const int _zRouteEndpointMarker = 2;
const int _zOperatorMarker = 3;
const int _zRiderMarker = 5;

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
  Set<Marker> _userMarkers = {};
  Set<Polyline> _routePolylines = {};
  bool _isLocationRequestInProgress = false;
  String? _activeRouteCode;
  StreamSubscription<QuerySnapshot<Map<String, dynamic>>>? _userLocationsSub;
  StreamSubscription<Position>? _positionStreamSub;
  int _debugUserDocsTotal = 0;
  int _debugUserDocsRoleMatched = 0;
  int _debugUserDocsWithCoords = 0;
  String _debugUserStreamStatus = 'waiting';
  String? _debugUserStreamError;
  DateTime? _debugLastUserSnapshotAt;
  bool _showDebugPanel = true;
  /// When true, GoogleMap shows the OS "my location" dot (backup if custom marker fails).
  bool _myLocationLayerEnabled = false;

  /// Polyline id for the bus stop route (so operator can see their route).
  static const String _busStopRoutePolylineId = 'bus_stop_route';

  @override
  void initState() {
    super.initState();
    _initialCameraPosition = _initialCameraOverBusStops;
    _loadOperatorIcon();
    // Load bus stop sign icon and dynamic route stops from Firestore.
    _loadBusStopsFromDatabaseAndShow();
    _watchUserLocations();
    // Do not wait for Firestore/route highlight — GPS was only starting after that chain,
    // and _highlightRoute's fit-bounds camera was overriding the operator view afterward.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) _initializeLocation(showError: true);
    });
  }

  static bool _userLocDocExplicitlyOffline(Map<String, dynamic> data) {
    final online = data['online'];
    if (online == 0 || online == false || online == '0') return true;
    final status = data['status'];
    if (status == 0 || status == false) return true;
    if (status is String) {
      final s = status.toLowerCase().trim();
      if (s == '0' || s == 'offline' || s == 'inactive') return true;
    }
    return false;
  }

  /// Rider app writes [latitude]/[longitude]; support GeoPoint aliases.
  static LatLng? _latLngFromUserLocData(Map<String, dynamic> data) {
    final latRaw = data['latitude'] ?? data['lat'];
    final lngRaw = data['longitude'] ?? data['lng'];
    double? lat;
    double? lng;
    if (latRaw is num) lat = latRaw.toDouble();
    if (lngRaw is num) lng = lngRaw.toDouble();
    lat ??= double.tryParse('$latRaw');
    lng ??= double.tryParse('$lngRaw');
    if (lat != null && lng != null) return LatLng(lat, lng);
    for (final key in ['position', 'location', 'geo']) {
      final g = data[key];
      if (g is GeoPoint) return LatLng(g.latitude, g.longitude);
      if (g is Map) {
        final nestedLat = g['latitude'] ?? g['lat'];
        final nestedLng = g['longitude'] ?? g['lng'];
        final lat2 = nestedLat is num ? nestedLat.toDouble() : double.tryParse('$nestedLat');
        final lng2 = nestedLng is num ? nestedLng.toDouble() : double.tryParse('$nestedLng');
        if (lat2 != null && lng2 != null) return LatLng(lat2, lng2);
      }
    }
    return null;
  }

  static bool _userLocMatchesRiderRole(Map<String, dynamic> data) {
    final role = data['role']?.toString().trim().toLowerCase();
    final userType = data['userType']?.toString().trim().toLowerCase();
    final roleIdRaw = data['roleid'] ?? data['role_id'];
    final roleId = roleIdRaw is num ? roleIdRaw.toInt() : int.tryParse('$roleIdRaw');

    // Exclude only explicit staff/operator records; include everything else so
    // rider markers still show when role fields are missing or use legacy values.
    const blockedRoles = <String>{'operator', 'driver', 'admin', 'staff'};
    if (blockedRoles.contains(role) || blockedRoles.contains(userType)) return false;
    if (roleId == 2 || roleId == 3) return false;
    return true;
  }

  Future<String?> _resolveOperatorRouteCode() async {
    final fromProfile = (await ProfileDataService.getOperatorRouteCode())?.trim();
    if (fromProfile != null && fromProfile.isNotEmpty) return fromProfile;
    final routes = await RouteCatalogService.fetchAvailableRoutes();
    if (routes.isNotEmpty) return routes.first.code.trim();
    return null;
  }

  /// Load bus stop sign icon and route geometry from Firestore.
  Future<void> _loadBusStopsFromDatabaseAndShow() async {
    try {
      await _busStopIconService.loadIcons();
      if (!mounted) return;
      final routeCode = await _resolveOperatorRouteCode();
      if (!mounted) return;
      _activeRouteCode = routeCode;
      if (routeCode == null || routeCode.isEmpty) {
        setState(() => _isLoading = false);
        return;
      }
      final List<({String name, LatLng position})> stops =
          await RouteDataService.getRouteStops(routeCode);
      if (!mounted) return;
      if (stops.isNotEmpty) {
        _addBusStopMarkers(stops, _busStopIconService.defaultIcon);
      }
      if (!mounted) return;

      setState(() => _isLoading = false);
    } catch (e, st) {
      print('⚠️ [MapScreen] _loadBusStopsFromDatabaseAndShow failed: $e');
      print('   $st');
      if (mounted) {
        setState(() => _isLoading = false);
      }
    } finally {
      if (mounted) _loadOperatorRoute();
    }
  }

  void _watchUserLocations() {
    _userLocationsSub?.cancel();
    if (mounted) {
      setState(() {
        _debugUserStreamStatus = 'subscribing';
        _debugUserStreamError = null;
      });
    }
    _userLocationsSub = FirebaseFirestore.instance
        .collection(_userLocationsCollection)
        .snapshots()
        .listen((snapshot) {
      if (!mounted) return;
      final userMarkers = <Marker>{};
      int roleMatched = 0;
      int withCoords = 0;
      for (final doc in snapshot.docs) {
        final data = doc.data();
        // Mirror the user app behavior: if a live location doc has coordinates,
        // render it instead of dropping by role/status mismatches.
        final isOffline = _userLocDocExplicitlyOffline(data);
        final isRiderLike = _userLocMatchesRiderRole(data);
        if (!isOffline && isRiderLike) {
          roleMatched++;
        }

        final pos = _latLngFromUserLocData(data);
        if (pos == null) continue;
        // Keep filtering out explicit offline docs only.
        if (isOffline) continue;
        withCoords++;

        final email = data['email']?.toString() ?? 'Rider';
        userMarkers.add(
          Marker(
            markerId: MarkerId('user_${doc.id}'),
            position: pos,
            zIndexInt: _zRiderMarker,
            anchor: const Offset(0.5, 1),
            icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueBlue),
            infoWindow: InfoWindow(
              title: 'Rider',
              snippet: email,
            ),
          ),
        );
      }

      setState(() {
        _userMarkers = userMarkers;
        _markers = _mergeWithUserMarkers(_markers);
        _debugUserDocsTotal = snapshot.docs.length;
        _debugUserDocsRoleMatched = roleMatched;
        _debugUserDocsWithCoords = withCoords;
        _debugUserStreamStatus = 'active';
        _debugUserStreamError = null;
        _debugLastUserSnapshotAt = DateTime.now();
      });
      print('✅ [MapScreen] Live users visible: ${userMarkers.length}');
    }, onError: (e) {
      print('⚠️ [MapScreen] user_locations stream error: $e');
      if (!mounted) return;
      setState(() {
        _debugUserStreamStatus = 'error';
        _debugUserStreamError = e.toString();
      });
    });
  }

  Set<Marker> _mergeWithUserMarkers(Set<Marker> base) {
    final nonUser = base.where((m) => !m.markerId.value.startsWith('user_')).toSet();
    return {...nonUser, ..._userMarkers};
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
            zIndexInt: _zBusStopMarker,
            icon: icon,
            infoWindow: InfoWindow(
              title: stop.name,
              snippet: 'Bus stop · ${_activeRouteCode ?? 'Route'}',
            ),
          ),
        );
      }
      _markers = _mergeWithUserMarkers({...existingNonBusStop, ...busStopMarkers});
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
        const ImageConfiguration(size: Size(104, 104)),
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
        _activeRouteCode = trimmedCode;
        await _highlightRoute(trimmedCode);
      }
    } catch (e) {
      print('⚠️ [MapScreen] Error loading route code: $e');
    }
    if (mounted) await _recenterOnOperator();
  }

  /// Move camera back to the operator after route fit-bounds or other camera changes.
  Future<void> _recenterOnOperator() async {
    final pos = _currentPosition;
    final c = _mapController;
    if (!mounted || pos == null || c == null) return;
    try {
      await c.moveCamera(MapService.createInstantCameraUpdate(pos));
      print('🗺️ [MapScreen] Camera recentered on operator');
    } catch (e) {
      print('⚠️ [MapScreen] _recenterOnOperator: $e');
    }
  }

  /// Highlights the route on the map based on the route code.
  Future<void> _highlightRoute(String routeCode) async {
    final code = routeCode.trim();
    final coordinates = await RouteDataService.getRouteCoordinatesFromFirestore(code);
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

      // Get route info + stop names for display
      final routeOptions = await RouteCatalogService.fetchAvailableRoutes();
      RouteInfo? routeInfo;
      for (final r in routeOptions) {
        if (r.code.trim().toUpperCase() == code.toUpperCase()) {
          routeInfo = r;
          break;
        }
      }
      final routeStops = await RouteDataService.getRouteStops(code);
      final startStopName = routeStops.isNotEmpty ? routeStops.first.name : 'Route Start';
      final endStopName = routeStops.isNotEmpty ? routeStops.last.name : 'Route End';

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
              zIndexInt: _zRouteEndpointMarker,
              icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueGreen),
              infoWindow: InfoWindow(
                title: startStopName,
                snippet: 'Start · ${routeInfo?.name ?? code}',
              ),
            ),
            // End point marker
            Marker(
              markerId: const MarkerId('route_end'),
              position: coordinates.endPoint,
              zIndexInt: _zRouteEndpointMarker,
              icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueRed),
              infoWindow: InfoWindow(
                title: endStopName,
                snippet: 'End · ${routeInfo?.name ?? code}',
              ),
            ),
          };

          _markers = _mergeWithUserMarkers(updatedMarkers);
        });

        print('✅ [MapScreen] Added route start/end markers. Total markers: ${_markers.length}');

        // Fit camera to show the entire route if we have a polyline
        if (_mapController != null && highlightPoints.isNotEmpty) {
          try {
            final bounds = _calculateBounds(highlightPoints);
            await _mapController!.animateCamera(
              CameraUpdate.newLatLngBounds(bounds, 100),
            );
            // Route overview replaces the operator camera; snap back so the driver sees themselves.
            await _recenterOnOperator();
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
    _userLocationsSub?.cancel();
    _positionStreamSub?.cancel();
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
  Future<void> _initializeLocation({bool showError = true, bool forceRefresh = false}) async {
    print('🗺️ [MapScreen] _initializeLocation() called (showError: $showError, forceRefresh: $forceRefresh)');
    
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
      print('🗺️ [MapScreen] Step 1: Requesting location permission...');
      bool hasPermission = await _locationService.requestPermission();
      print('   📍 Permission granted: $hasPermission');
      
      if (!hasPermission) {
        print('   ❌ Permission NOT granted - using default location');
        // If no permission, use default location silently
        setState(() {
          _myLocationLayerEnabled = false;
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

      print('🗺️ [MapScreen] Step 2: Getting current position...');
      Position position = await _locationService.getCurrentPosition(
        preferLowAccuracy: false,
        useCachedPosition: !forceRefresh,
        forceRefresh: forceRefresh,
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
          _myLocationLayerEnabled = true;
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
      _startPositionFollow();
      
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
          _myLocationLayerEnabled = false;
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
                onPressed: () => _initializeLocation(showError: true, forceRefresh: true),
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
          _myLocationLayerEnabled = false;
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
                      onPressed: () => _initializeLocation(showError: true, forceRefresh: true),
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

  Future<void> _startPositionFollow() async {
    await _positionStreamSub?.cancel();
    const settings = LocationSettings(
      accuracy: LocationAccuracy.high,
      distanceFilter: 5,
    );
    _positionStreamSub = Geolocator.getPositionStream(locationSettings: settings).listen(
      (position) async {
        if (!mounted) return;
        _currentPosition = position;
        _addOperatorMarker(position);
        if (_mapController != null) {
          try {
            await _mapController!.moveCamera(
              MapService.createInstantCameraUpdate(position),
            );
          } catch (_) {}
        }
      },
      onError: (e) {
        print('⚠️ [MapScreen] follow stream error: $e');
      },
    );
  }

  /// Adds a marker for the operator's location.
  /// Keeps all existing markers (bus stops, route start/end) by building a new set.
  void _addOperatorMarker(Position position) {
    setState(() {
      final operatorMarker = Marker(
        markerId: const MarkerId('operator_location'),
        position: LatLng(position.latitude, position.longitude),
        zIndexInt: _zOperatorMarker,
        anchor: const Offset(0.5, 0.92),
        infoWindow: const InfoWindow(
          title: 'Your Location',
          snippet: 'Operator current location',
        ),
        // Orange fallback pin so it is never confused with rider pins (azure).
        icon: _operatorIcon ?? BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueOrange),
      );
      // Replace only operator marker; keep all bus_stop_*, route_start, route_end
      _markers = _mergeWithUserMarkers({
        ..._markers.where((m) => m.markerId.value != 'operator_location'),
        operatorMarker,
      });
      
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
            onPressed: _isLocationRequestInProgress
                ? null
                : () => _initializeLocation(forceRefresh: true),
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
            myLocationEnabled: _myLocationLayerEnabled,
            myLocationButtonEnabled: false,
            markers: _markers,
            polylines: _routePolylines,
          ),
          if (_isLoading)
            const Center(
              child: CircularProgressIndicator(),
            ),
          Positioned(
            top: 12,
            left: 12,
            child: GestureDetector(
              onTap: () {
                setState(() {
                  _showDebugPanel = !_showDebugPanel;
                });
              },
              child: Container(
                constraints: const BoxConstraints(maxWidth: 280),
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: Colors.black.withOpacity(0.72),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: _showDebugPanel
                    ? Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Text(
                            'USER LOCATION DEBUG',
                            style: TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.bold,
                              fontSize: 11,
                            ),
                          ),
                          const SizedBox(height: 6),
                          Text('stream: $_debugUserStreamStatus',
                              style: const TextStyle(color: Colors.white, fontSize: 11)),
                          Text('docs total: $_debugUserDocsTotal',
                              style: const TextStyle(color: Colors.white, fontSize: 11)),
                          Text('role match: $_debugUserDocsRoleMatched',
                              style: const TextStyle(color: Colors.white, fontSize: 11)),
                          Text('with coords: $_debugUserDocsWithCoords',
                              style: const TextStyle(color: Colors.white, fontSize: 11)),
                          Text('markers now: ${_userMarkers.length}',
                              style: const TextStyle(color: Colors.white, fontSize: 11)),
                          Text(
                            'last snapshot: ${_debugLastUserSnapshotAt?.toIso8601String() ?? '-'}',
                            style: const TextStyle(color: Colors.white, fontSize: 11),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                          if (_debugUserStreamError != null)
                            Text(
                              'error: $_debugUserStreamError',
                              style: const TextStyle(color: Colors.redAccent, fontSize: 11),
                              maxLines: 3,
                              overflow: TextOverflow.ellipsis,
                            ),
                        ],
                      )
                    : const Text(
                        'Show debug',
                        style: TextStyle(color: Colors.white, fontSize: 11),
                      ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
