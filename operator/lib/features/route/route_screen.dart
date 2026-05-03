import 'dart:async';

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/foundation.dart' show TargetPlatform, defaultTargetPlatform;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:geolocator/geolocator.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import '../../../core/services/directions_service.dart';
import '../../../core/services/driver_status_service.dart';
import '../../../core/services/location_service.dart';
import '../../../core/services/map/map_service.dart';
import '../profile/screen/profile_screen_data.dart';
import '../map/services/bus_stop_icon_service.dart';
import '../map/services/waiting_cluster_icons.dart';
import '../map/services/waiting_cluster_sheet.dart';
import '../map/services/waiting_user_clustering.dart';
import '../map/widgets/waiting_demand_intro.dart';
import '../map/widgets/waiting_demand_legend.dart';

/// Camera over Route1 bus stops so they are visible on first load.
const CameraPosition _initialCameraOverBusStops = CameraPosition(
  target: LatLng(10.3270, 123.9475),
  zoom: 16.0,
);
const String _userLocationsCollection = 'user_locations';
const Duration _inactiveUserThreshold = Duration(minutes: 5);

class RouteScreen extends StatefulWidget {
  const RouteScreen({super.key});

  static const String routeName = '/route';

  @override
  State<RouteScreen> createState() => RouteScreenState();
}

class RouteScreenState extends State<RouteScreen> {
  final LocationService _locationService = LocationService();
  final DirectionsService _directionsService = DirectionsService();
  final BusStopIconService _busStopIconService = BusStopIconService.instance;
  GoogleMapController? _mapController;
  BitmapDescriptor? _operatorIcon;
  List<WaitingRiderInput> _lastWaitingRiders = [];
  String? _mapStyleJson;
  bool _isLoading = true;
  Position? _currentPosition;
  CameraPosition? _initialCameraPosition;
  Set<Marker> _markers = {};
  Set<Marker> _userMarkers = {};
  Set<Polyline> _routePolylines = {};
  bool _isLocationRequestInProgress = false;
  String? _routeId;
  StreamSubscription<QuerySnapshot<Map<String, dynamic>>>? _userLocationsSub;
  StreamSubscription<DocumentSnapshot<Map<String, dynamic>>>? _userProfileSub;
  StreamSubscription<Position>? _positionStreamSub;

  static const String _busStopRoutePolylineId = 'bus_stop_route';

  /// When using a shell with [IndexedStack], call this after changing the route in Profile
  /// so the map reloads without guessing from the route catalog.
  void reloadOperatorRouteFromProfile() {
    unawaited(_loadRouteId());
  }

  @override
  void initState() {
    super.initState();
    _initialCameraPosition = _initialCameraOverBusStops;
    _loadOperatorIcon();
    unawaited(_loadClusterIconsThenRebuild());
    _loadMapStyle();
    _listenOperatorRouteFromProfile();
    _loadRouteId();
    _watchUserLocations();
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      if (!mounted) return;
      await showWaitingDemandIntroIfNeeded(context);
      if (mounted) _initializeLocation();
    });
  }

  static bool _userLocDocExplicitlyOffline(Map<String, dynamic> data) {
    bool isFalsy(Object? value) {
      if (value == null) return false;
      if (value is bool) return value == false;
      if (value is num) return value == 0;
      final normalized = value.toString().trim().toLowerCase();
      return normalized == '0' ||
          normalized == 'false' ||
          normalized == 'no' ||
          normalized == 'off' ||
          normalized == 'inactive' ||
          normalized == 'offline';
    }

    bool isOfflineText(Object? value) {
      if (value == null) return false;
      final s = value.toString().trim().toLowerCase();
      return s == 'offline' || s == 'inactive' || s == 'disconnected';
    }

    if (isFalsy(data['online']) || isFalsy(data['isOnline']) || isFalsy(data['active'])) {
      return true;
    }
    if (isFalsy(data['status']) || isOfflineText(data['status'])) return true;
    if (isOfflineText(data['state']) || isOfflineText(data['presence'])) return true;
    return false;
  }

  static bool _userLocMatchesRiderRole(Map<String, dynamic> data) {
    final role = data['role']?.toString().trim().toLowerCase();
    final userType = data['userType']?.toString().trim().toLowerCase();
    final roleIdRaw = data['roleid'] ?? data['role_id'];
    final roleId = roleIdRaw is num ? roleIdRaw.toInt() : int.tryParse('$roleIdRaw');
    const blockedRoles = <String>{'operator', 'driver', 'admin', 'staff'};
    if (blockedRoles.contains(role) || blockedRoles.contains(userType)) return false;
    if (roleId == 2 || roleId == 3) return false;
    return true;
  }

  static DateTime? _readUserLocUpdatedAt(Map<String, dynamic> data) {
    for (final key in const [
      'updatedAt',
      'updated_at',
      'lastUpdated',
      'last_updated',
      'timestamp',
      'locationUpdatedAt',
      'location_updated_at',
    ]) {
      final raw = data[key];
      if (raw == null) continue;
      if (raw is Timestamp) return raw.toDate().toLocal();
      if (raw is DateTime) return raw.toLocal();
      if (raw is num) {
        final ms = raw.toInt();
        if (ms <= 0) continue;
        return DateTime.fromMillisecondsSinceEpoch(
          ms < 1000000000000 ? ms * 1000 : ms,
          isUtc: false,
        ).toLocal();
      }
      if (raw is String) {
        final parsedIso = DateTime.tryParse(raw);
        if (parsedIso != null) return parsedIso.toLocal();
        final asInt = int.tryParse(raw.trim());
        if (asInt != null && asInt > 0) {
          return DateTime.fromMillisecondsSinceEpoch(
            asInt < 1000000000000 ? asInt * 1000 : asInt,
            isUtc: false,
          ).toLocal();
        }
      }
    }
    return null;
  }

  static bool _userLocAppearsInactive(Map<String, dynamic> data) {
    final updatedAt = _readUserLocUpdatedAt(data);
    if (updatedAt == null) return true;
    return DateTime.now().difference(updatedAt) > _inactiveUserThreshold;
  }

  static bool _userLocExplicitlyOnline(Map<String, dynamic> data) {
    bool truthy(Object? value) {
      if (value == null) return false;
      if (value is bool) return value;
      if (value is num) return value > 0;
      final s = value.toString().trim().toLowerCase();
      return s == '1' || s == 'true' || s == 'yes' || s == 'on' || s == 'active';
    }

    return truthy(data['online']) || truthy(data['isOnline']) || truthy(data['active']);
  }

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

  Set<Marker> _mergeWithUserMarkers(Set<Marker> base) {
    final nonUser = base
        .where((m) => !m.markerId.value.startsWith('waiting_cluster_'))
        .toSet();
    return {...nonUser, ..._userMarkers};
  }

  Future<void> _loadClusterIconsThenRebuild() async {
    try {
      await WaitingClusterIconCache.ensureLoaded();
    } catch (e) {
      print('⚠️ [RouteScreen] Cluster marker icons: $e');
    }
    if (mounted) _rebuildWaitingClusterMarkers();
  }

  void _rebuildWaitingClusterMarkers() {
    if (!mounted) return;
    final clusters = buildWaitingClusters(_lastWaitingRiders);
    final markers = <Marker>{};
    for (final c in clusters) {
      final tier = c.tier;
      final icon = WaitingClusterIconCache.iconFor(tier) ??
          BitmapDescriptor.defaultMarkerWithHue(tier.fallbackMarkerHue);
      markers.add(
        Marker(
          markerId: MarkerId(c.markerIdValue),
          position: c.position,
          zIndexInt: 5 + (c.count > 40 ? 40 : c.count),
          anchor: const Offset(0.5, 0.92),
          icon: icon,
          consumeTapEvents: true,
          infoWindow: InfoWindow.noText,
          onTap: () {
            if (!context.mounted) return;
            showWaitingDemandBottomSheet(
              context,
              userCount: c.count,
              lastUpdated: c.lastUpdated,
              approxLocation: c.position,
            );
          },
        ),
      );
    }
    setState(() {
      _userMarkers = markers;
      _markers = _mergeWithUserMarkers(_markers);
    });
  }

  void _watchUserLocations() {
    _userLocationsSub?.cancel();
    _userLocationsSub = FirebaseFirestore.instance
        .collection(_userLocationsCollection)
        .snapshots()
        .listen((snapshot) {
      if (!mounted) return;
      final riders = <WaitingRiderInput>[];
      for (final doc in snapshot.docs) {
        final data = doc.data();
        final isOffline = _userLocDocExplicitlyOffline(data);
        final isRider = _userLocMatchesRiderRole(data);
        final isInactive = _userLocAppearsInactive(data);
        final isExplicitlyOnline = _userLocExplicitlyOnline(data);
        if (!isRider || isOffline || isInactive || !isExplicitlyOnline) continue;
        final pos = _latLngFromUserLocData(data);
        if (pos == null) continue;
        riders.add(
          WaitingRiderInput(
            docId: doc.id,
            lat: pos.latitude,
            lng: pos.longitude,
            updatedAt: _readUserLocUpdatedAt(data),
          ),
        );
      }
      _lastWaitingRiders = riders;
      _rebuildWaitingClusterMarkers();
    }, onError: (e) {
      print('⚠️ [RouteScreen] user_locations stream error: $e');
    });
  }

  void _listenOperatorRouteFromProfile() {
    final uid = FirebaseAuth.instance.currentUser?.uid;
    if (uid == null) return;
    _userProfileSub = FirebaseFirestore.instance
        .collection('users')
        .doc(uid)
        .snapshots()
        .listen((snap) {
      if (!mounted) return;
      final data = snap.data();
      final raw = data?['routeCode'] ?? data?['route_code'];
      final code = raw?.toString().trim();
      final next = (code == null || code.isEmpty) ? null : code.toUpperCase();
      final cur = _routeId?.trim().toUpperCase();
      if (next != cur) {
        unawaited(_loadRouteId());
      }
    });
  }

  Future<void> _loadRouteId() async {
    final published = await ProfileDataService.resolveRouteCodeForLocationPublish();
    final t = published.trim().isEmpty ? null : published.trim();
    ProfileDataService.setLocationSyncRouteFallback(t);
    if (mounted) {
      setState(() => _routeId = t);
      if (t != null && t.isNotEmpty) {
        unawaited(RouteCodeService.syncRouteCodeWithGpsAndRoutes(t));
      }
      await _loadBusStopSignAndUpdateMarkers(routeCode: t);
    }
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
            infoWindow: InfoWindow(
              title: stop.name,
              snippet: 'Bus stop · ${_routeId ?? 'Route'}',
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

  Future<void> _loadBusStopSignAndUpdateMarkers({String? routeCode}) async {
    try {
      await _busStopIconService.loadIcons();
      if (!mounted) return;
      final code = routeCode?.trim();
      if (code == null || code.isEmpty) {
        setState(() => _isLoading = false);
        return;
      }
      final stops = await RouteDataService.getRouteStops(code);
      if (!mounted) return;
      if (stops.isNotEmpty) {
        _addBusStopMarkersAndRoute(stops, _busStopIconService.defaultIcon);
      }
      setState(() => _isLoading = false);
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
        const ImageConfiguration(size: Size(200, 200)),
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
  Future<void> _initializeLocation({bool showError = true, bool forceRefresh = false}) async {
    if (_isLocationRequestInProgress) return;
    
    _isLocationRequestInProgress = true;
    setState(() {
      _isLoading = true;
    });

    try {
      print('🗺️ [RouteScreen] Step 1: Requesting location permission...');
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

      print('🗺️ [RouteScreen] Step 2: Getting current position...');
      Position position = await _locationService.getCurrentPosition(
        preferLowAccuracy: false,
        useCachedPosition: !forceRefresh,
        forceRefresh: forceRefresh,
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
      _startPositionFollow();
    } catch (e) {
      print('   ❌ [RouteScreen] _initializeLocation() ERROR: $e');
      print('   📋 Error type: ${e.runtimeType}');
      
      // Check if it's a timeout error
      bool isTimeout = e is TimeoutException ||
          e.toString().toLowerCase().contains('timeout');
      
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
                onPressed: () => _initializeLocation(showError: true, forceRefresh: true),
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
    final isAndroid = defaultTargetPlatform == TargetPlatform.android;
    final settings = isAndroid
        ? AndroidSettings(
            accuracy: LocationAccuracy.high,
            distanceFilter: 5,
            intervalDuration: const Duration(seconds: 2),
            forceLocationManager: false,
          )
        : const LocationSettings(
            accuracy: LocationAccuracy.high,
            distanceFilter: 5,
          );

    _positionStreamSub = Geolocator.getPositionStream(locationSettings: settings).listen(
      (position) async {
        if (!mounted) return;
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
        print('⚠️ [RouteScreen] follow stream error: $e');
      },
    );
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
      _markers = _mergeWithUserMarkers({
        ..._markers.where((m) => m.markerId.value != 'operator_location'),
        operatorMarker,
      });
    });
  }

  @override
  void dispose() {
    _userProfileSub?.cancel();
    _userLocationsSub?.cancel();
    _positionStreamSub?.cancel();
    _mapController?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final freeRideStream = _routeId != null && _routeId!.isNotEmpty
        ? DriverStatusService.instance.freeRideActiveStream(_routeId!)
        : Stream<bool>.value(false);

    return Scaffold(
      body: StreamBuilder<bool>(
        stream: freeRideStream,
        initialData: false,
        builder: (context, snapshot) {
          final showFreeRideBadge = snapshot.data == true;
          return Stack(
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
            bottom: _routeId != null && _routeId!.isNotEmpty ? 72 : 16,
            left: 16,
            child: FloatingActionButton(
              mini: true,
              onPressed: _isLocationRequestInProgress
                  ? null
                  : () => _initializeLocation(forceRefresh: true),
              tooltip: 'Center on my location',
              child: const Icon(Icons.my_location),
            ),
          ),
          if (showFreeRideBadge)
            Positioned(
              top: 16,
              left: 16,
              child: Material(
                elevation: 4,
                borderRadius: BorderRadius.circular(8),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  decoration: BoxDecoration(
                    color: Colors.green.shade600,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.card_giftcard, color: Colors.white, size: 20),
                      SizedBox(width: 6),
                      Text(
                        'Free Ride',
                        style: TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                          fontSize: 14,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          if (_routeId != null && _routeId!.isNotEmpty)
            Positioned(
              bottom: 16,
              left: 16,
              child: Material(
                elevation: 3,
                borderRadius: BorderRadius.circular(8),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  decoration: BoxDecoration(
                    color: Colors.blue.shade700,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    'Route: ${_routeId!}',
                    style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.w700,
                      fontSize: 12,
                    ),
                  ),
                ),
              ),
            ),
          const Positioned(
            right: 0,
            bottom: 0,
            child: WaitingDemandLegend(),
          ),
            ],
          );
        },
      ),
    );
  }
}
