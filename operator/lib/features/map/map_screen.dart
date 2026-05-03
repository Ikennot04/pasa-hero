import 'dart:async';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:geolocator/geolocator.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import '../../core/services/location_service.dart';
import '../../core/services/map/map_service.dart';
import '../../core/services/directions_service.dart';
import '../profile/screen/profile_screen_data.dart';
import 'services/bus_stop_icon_service.dart';
import 'services/waiting_cluster_icons.dart';
import 'services/waiting_cluster_sheet.dart';
import 'services/waiting_user_clustering.dart';
import 'widgets/waiting_demand_intro.dart';
import 'widgets/waiting_demand_legend.dart';

/// Initial map center so bus stops are visible on first load.
const CameraPosition _initialCameraOverBusStops = CameraPosition(
  target: LatLng(10.3270, 123.9475),
  zoom: 16.0,
);
const String _userLocationsCollection = 'user_locations';

/// Draw order: bus stops and route ends low, operator mid, riders on top (large stop
/// bitmaps were hiding default rider pins).
const int _zBusStopMarker = 1;
const int _zRouteEndpointMarker = 2;
const int _zOperatorMarker = 3;
const int _zRiderMarker = 5;
const Duration _inactiveUserThreshold = Duration(minutes: 5);

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
  String? _mapStyleJson;
  BitmapDescriptor? _operatorIcon;
  List<WaitingRiderInput> _lastWaitingRiders = [];
  int _lastWaitingRiderTotal = 0;
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
  /// When true, GoogleMap shows the OS "my location" dot (backup if custom marker fails).
  bool _myLocationLayerEnabled = false;

  String get _debugMapText {
    final busStopCount =
        _markers.where((m) => m.markerId.value.startsWith('bus_stop_')).length;
    final clusterCount = _markers
        .where((m) => m.markerId.value.startsWith('waiting_cluster_'))
        .length;
    final hasOperator =
        _markers.any((m) => m.markerId.value == 'operator_location');
    return 'Markers: bus stops $busStopCount, waiting clusters $clusterCount '
        '(riders $_lastWaitingRiderTotal), operator ${hasOperator ? 'yes' : 'no'}';
  }

  /// Polyline id for the bus stop route (so operator can see their route).
  static const String _busStopRoutePolylineId = 'bus_stop_route';

  @override
  void initState() {
    super.initState();
    _initialCameraPosition = _initialCameraOverBusStops;
    _loadOperatorIcon();
    unawaited(_loadMapStyle());
    unawaited(_loadClusterIconsThenRebuild());
    // Load bus stop sign icon and dynamic route stops from Firestore.
    _loadBusStopsFromDatabaseAndShow();
    _watchUserLocations();
    // Do not wait for Firestore/route highlight — GPS was only starting after that chain,
    // and _highlightRoute's fit-bounds camera was overriding the operator view afterward.
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      if (!mounted) return;
      await showWaitingDemandIntroIfNeeded(context);
      if (mounted) _initializeLocation(showError: true);
    });
  }

  static bool _userLocDocExplicitlyOffline(Map<String, dynamic> data) {
    bool _isFalsy(Object? value) {
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

    bool _isOfflineText(Object? value) {
      if (value == null) return false;
      final s = value.toString().trim().toLowerCase();
      return s == 'offline' || s == 'inactive' || s == 'disconnected';
    }

    if (_isFalsy(data['online']) || _isFalsy(data['isOnline']) || _isFalsy(data['active'])) {
      return true;
    }
    if (_isFalsy(data['status']) || _isOfflineText(data['status'])) return true;
    if (_isOfflineText(data['state']) || _isOfflineText(data['presence'])) return true;
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

  Future<String?> _resolveOperatorRouteCode() async {
    final s = await ProfileDataService.resolveRouteCodeForLocationPublish();
    final t = s.trim();
    return t.isEmpty ? null : t;
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
        final allStops = await _loadAllBusStopsFromFirestore();
        if (!mounted) return;
        if (allStops.isNotEmpty) {
          await _addBusStopMarkers(allStops, _busStopIconService.defaultIcon);
        }
        setState(() => _isLoading = false);
        return;
      }
      final List<({String name, LatLng position})> stops =
          await RouteDataService.getRouteStops(routeCode);
      if (!mounted) return;
      if (stops.isNotEmpty) {
        await _addBusStopMarkers(
          stops,
          _busStopIconService.defaultIcon,
          markRouteTerminals: true,
        );
      } else {
        final allStops = await _loadAllBusStopsFromFirestore();
        if (!mounted) return;
        if (allStops.isNotEmpty) {
          await _addBusStopMarkers(allStops, _busStopIconService.defaultIcon);
        }
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

  /// Fallback bus stops source used when route-specific stops are unavailable.
  Future<List<({String name, LatLng position})>> _loadAllBusStopsFromFirestore() async {
    try {
      final snap = await FirebaseFirestore.instance.collection('bus_stops').get();
      final out = <({String name, LatLng position})>[];
      for (final doc in snap.docs) {
        final data = doc.data();
        final latRaw = data['latitude'] ?? data['lat'];
        final lngRaw = data['longitude'] ?? data['lng'];
        double? lat = (latRaw is num) ? latRaw.toDouble() : double.tryParse('$latRaw');
        double? lng = (lngRaw is num) ? lngRaw.toDouble() : double.tryParse('$lngRaw');
        final gp = data['location'];
        if ((lat == null || lng == null) && gp is GeoPoint) {
          lat = gp.latitude;
          lng = gp.longitude;
        }
        if (lat == null || lng == null) continue;
        final name = (data['name'] ??
                data['stop_name'] ??
                data['terminal_name'] ??
                data['code'] ??
                doc.id)
            .toString();
        out.add((name: name, position: LatLng(lat, lng)));
      }
      return out;
    } catch (e) {
      print('⚠️ [MapScreen] _loadAllBusStopsFromFirestore failed: $e');
      return const [];
    }
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
        final pos = _latLngFromUserLocData(data);
        if (pos == null) continue;
        if (!isRider || isOffline || isInactive || !isExplicitlyOnline) continue;

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
      print(
        '✅ [MapScreen] Waiting riders: ${riders.length}, '
        'clusters: ${_userMarkers.length}',
      );
    }, onError: (e) {
      print('⚠️ [MapScreen] user_locations stream error: $e');
    });
  }

  Future<void> _loadClusterIconsThenRebuild() async {
    try {
      await WaitingClusterIconCache.ensureLoaded();
    } catch (e) {
      print('⚠️ [MapScreen] Cluster marker icons: $e');
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
          zIndexInt: _zRiderMarker + (c.count > 40 ? 40 : c.count),
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
      _lastWaitingRiderTotal = _lastWaitingRiders.length;
      _userMarkers = markers;
      _markers = _mergeWithUserMarkers(_markers);
    });
  }

  Set<Marker> _mergeWithUserMarkers(Set<Marker> base) {
    final nonUser = base
        .where((m) => !m.markerId.value.startsWith('waiting_cluster_'))
        .toSet();
    return {...nonUser, ..._userMarkers};
  }

  /// Adds bus stop markers (names without numbers) and route polyline along streets via Directions API.
  /// When [markRouteTerminals] is true (operator has a route code and ordered stops), the first and last
  /// stops use green/red pins labeled Start/End; otherwise every stop uses the bus-stop icon.
  Future<void> _addBusStopMarkers(
    List<({String name, LatLng position})> stops,
    BitmapDescriptor icon, {
    bool markRouteTerminals = false,
  }) async {
    if (!mounted || stops.isEmpty) return;
    final points = stops.map((s) => s.position).toList();
    setState(() {
      final existingNonBusStop = _markers.where(
        (m) =>
            !m.markerId.value.startsWith('bus_stop_') &&
            m.markerId.value != 'route_start' &&
            m.markerId.value != 'route_end',
      ).toSet();
      final busStopMarkers = <Marker>{};
      final routeLabel = _activeRouteCode ?? 'Route';
      for (int i = 0; i < stops.length; i++) {
        final stop = stops[i];
        final isFirst = i == 0;
        final isLast = i == stops.length - 1;
        BitmapDescriptor stopIcon = icon;
        String title = stop.name;
        String snippet = 'Bus stop · $routeLabel';
        int z = _zBusStopMarker;
        if (markRouteTerminals) {
          if (stops.length >= 2) {
            if (isFirst) {
              stopIcon =
                  BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueGreen);
              title = 'Start · ${stop.name}';
              snippet = 'Route start · $routeLabel';
              z = _zRouteEndpointMarker;
            } else if (isLast) {
              stopIcon =
                  BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueRed);
              title = 'End · ${stop.name}';
              snippet = 'Route end · $routeLabel';
              z = _zRouteEndpointMarker;
            }
          } else if (stops.length == 1) {
            stopIcon =
                BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueOrange);
            title = 'Start / end · ${stop.name}';
            snippet = 'Single terminal · $routeLabel';
            z = _zRouteEndpointMarker;
          }
        }
        busStopMarkers.add(
          Marker(
            markerId: MarkerId('bus_stop_$i'),
            position: stop.position,
            zIndexInt: z,
            icon: stopIcon,
            infoWindow: InfoWindow(
              title: title,
              snippet: snippet,
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

  Future<void> _loadMapStyle() async {
    try {
      final json = await rootBundle.loadString(
        'assets/map_styles/traffic_only_style.json',
      );
      if (!mounted) return;
      setState(() => _mapStyleJson = json);
      _mapController?.setMapStyle(_mapStyleJson);
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
      final routeCode = await ProfileDataService.resolveRouteCodeForLocationPublish();
      final trimmedCode = routeCode.trim();
      if (mounted && trimmedCode.isNotEmpty) {
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

          // Start/end of route: first & last stops use green/red pins in [_addBusStopMarkers].
          // Drop legacy route_start / route_end so we do not stack duplicate pins.
          _markers = _mergeWithUserMarkers(
            _markers
                .where(
                  (m) =>
                      m.markerId.value != 'route_start' &&
                      m.markerId.value != 'route_end',
                )
                .toSet(),
          );
        });

        print(
          '✅ [MapScreen] Route polyline updated. Markers: ${_markers.length} '
          '(${routeInfo?.name ?? code})',
        );

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
      ),
      body: Stack(
        children: [
          GoogleMap(
            initialCameraPosition: _initialCameraPosition ?? MapService.getDefaultCameraPosition(),
            onMapCreated: (c) {
              _mapController = c;
              if (_mapStyleJson != null) {
                _mapController!.setMapStyle(_mapStyleJson);
              }
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
            left: 16,
            bottom: 84,
            child: Material(
              color: Colors.transparent,
              child: Container(
                constraints: const BoxConstraints(maxWidth: 260),
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                decoration: BoxDecoration(
                  color: Colors.black.withOpacity(0.65),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  _debugMapText,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 11,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
            ),
          ),
          Positioned(
            left: 16,
            bottom: 16,
            child: FloatingActionButton(
              mini: true,
              onPressed: _isLocationRequestInProgress
                  ? null
                  : () => _initializeLocation(forceRefresh: true),
              tooltip: 'Center on my location',
              child: const Icon(Icons.my_location),
            ),
          ),
          const Positioned(
            right: 0,
            bottom: 0,
            child: WaitingDemandLegend(),
          ),
        ],
      ),
    );
  }
}
