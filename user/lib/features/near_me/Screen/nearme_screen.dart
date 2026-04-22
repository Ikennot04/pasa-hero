import 'dart:async';
import 'dart:convert';

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:http/http.dart' as http;
import '../../../core/models/bus_stop.dart';
import '../../../core/models/nearby_operator.dart';
import '../../../core/models/operator_route_option.dart';
import '../../../core/services/bus_stops_service.dart';
import '../../../core/services/operator_route_options_service.dart';
import '../../../core/services/location_service.dart';
import '../../../core/services/location_cache_service.dart';
import '../../../core/services/map/map_service.dart';
import '../../../core/services/nearby_operators_service.dart';
import '../../../core/services/route_path_coordinates_service.dart';
import '../../../shared/bottom_navBar.dart';
import '../../map/map.dart';
import '../Module/free_ride.dart';
import '../Module/from_to_form.dart';
import '../Module/nearby_terminal.dart';

class NearMeScreen extends StatelessWidget {
  const NearMeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return MainNavigationScreen(
      nearMeContent: const _NearMeContent(),
    );
  }
}

class _NearMeContent extends StatefulWidget {
  const _NearMeContent();

  @override
  State<_NearMeContent> createState() => _NearMeContentState();
}

class _NearMeContentState extends State<_NearMeContent> {
  late DraggableScrollableController _sheetController;
  bool _showFreeRideDetails = false;
  double _sheetExtent = 0.38;
  bool _showFreeRide = true;
  bool _showStopsContent = true;
  static const double _minSheetExtent = 0.10;

  Map<String, dynamic>? _selectedTo;
  List<Map<String, dynamic>> _destinations = [];
  LatLng? _closestStopLatLng;
  Position? _userPosition;
  LatLng? _routeOrigin;
  LatLng? _routeDestination;
  bool _destinationsLoading = true;
  double? _routeDistanceMeters; // Distance from POINT_A (nearest bus stop) to POINT_B (destination)
  String? _routeDistanceText; // Formatted distance text
  bool _isCalculatingDistance = false;
  bool _hasLoadedOnce = false; // Track if we've loaded data at least once
  List<Map<String, dynamic>> _terminalCards = [];

  final LocationService _locationService = LocationService();
  final BusStopsService _busStopsService = BusStopsService();
  final LocationCacheService _locationCache = LocationCacheService.instance;
  final NearbyOperatorsService _nearbyOperatorsService = NearbyOperatorsService();
  final OperatorRouteOptionsService _routeOptionsService = OperatorRouteOptionsService();

  List<NearbyOperator> _nearbyOperators = [];
  StreamSubscription<List<NearbyOperator>>? _nearbyOperatorsSub;
  Timer? _nearbyServerPoll;
  String? _operatorsFirestoreError;

  List<OperatorRouteOption> _routeOptions = [];
  bool _routeOptionsLoading = true;
  /// `null` = show all nearby operators (distance filter only).
  String? _selectedRouteCode;

  final RoutePathCoordinatesService _routePathCoordinatesService =
      RoutePathCoordinatesService();

  GoogleMapController? _mapController;
  LatLngBounds? _pendingRouteFitBounds;
  int _routeFitRequestId = 0;

  /// Firestore path for the selected route code (polyline on map).
  List<LatLng>? _routeCatalogHighlightPoints;

  static const double _routeCameraPadding = 50.0;

  /// Fallback list when API hasn't loaded yet; includes lat/lng for route drawing.
  static const List<Map<String, dynamic>> _terminalsFallback = [
    {'terminalName': 'Pacific Terminal', 'location': 'Pacific Mall, Mandaue', 'lat': 10.3232, 'lng': 123.9456, 'routes': ['01K', '13B', '01F', '46E'], 'distance': '0.6 Km', 'isHighlighted': true},
    {'terminalName': 'Marpa', 'location': 'Maguikay, Mandaue City', 'lat': 10.3312, 'lng': 123.9388, 'routes': ['01K', '13B', '01F', '46E'], 'distance': '0.6 Km', 'isHighlighted': false},
    {'terminalName': 'Jmall', 'location': 'Jmall, Mandaue City', 'lat': 10.3289, 'lng': 123.9321, 'routes': ['01K', '13B', '01F', '46E'], 'distance': '0.7 Km', 'isHighlighted': false},
    {'terminalName': 'Ayala Terminal', 'location': 'Ayala Center, Cebu City', 'lat': 10.3192, 'lng': 123.9076, 'routes': ['02A', '04B', '12C'], 'distance': '1.2 Km', 'isHighlighted': false},
    {'terminalName': 'SM Terminal', 'location': 'SM City, Cebu', 'lat': 10.3156, 'lng': 123.9182, 'routes': ['03D', '05E', '08F'], 'distance': '1.5 Km', 'isHighlighted': false},
  ];

  static const String _terminalsApiUrl =
      'https://pasa-hero-server.vercel.app/api/terminals/';

  void _updateFromSheetExtent(double extent) {
    setState(() {
      _sheetExtent = extent;
      _showFreeRide = extent > _minSheetExtent && extent < 0.70;
      _showStopsContent = extent > 0.15;
    });
  }

  @override
  void initState() {
    super.initState();
    _terminalCards = List<Map<String, dynamic>>.from(_terminalsFallback);
    _sheetController = DraggableScrollableController();
    _sheetController.addListener(() => _updateFromSheetExtent(_sheetController.size));
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) {
        _updateFromSheetExtent(_sheetController.size);
        // Listen to Firestore immediately so a slow route-catalog fetch never delays drivers.
        _subscribeNearbyOperators();
        _loadRouteOptions();
        _loadTerminalCardsFromApi();
        // Try to load from cache first, then fetch if needed
        _loadFromCacheOrFetch();
      }
    });
  }

  Future<void> _loadTerminalCardsFromApi() async {
    try {
      final uri = Uri.parse(_terminalsApiUrl);
      final resp = await http.get(uri).timeout(const Duration(seconds: 12));
      if (resp.statusCode < 200 || resp.statusCode >= 300) return;

      final body = jsonDecode(resp.body);
      if (body is! Map<String, dynamic>) return;
      final rows = body['data'];
      if (rows is! List) return;

      final List<Map<String, dynamic>> mapped = [];
      for (final row in rows) {
        if (row is! Map) continue;
        final name = row['terminal_name']?.toString().trim();
        final latRaw = row['location_lat'];
        final lngRaw = row['location_lng'];
        final lat = latRaw is num ? latRaw.toDouble() : double.tryParse('$latRaw');
        final lng = lngRaw is num ? lngRaw.toDouble() : double.tryParse('$lngRaw');
        if (name == null || name.isEmpty || lat == null || lng == null) continue;

        String distance = '--';
        final p = _userPosition;
        if (p != null) {
          final meters = Geolocator.distanceBetween(
            p.latitude,
            p.longitude,
            lat,
            lng,
          );
          distance = '${(meters / 1000).toStringAsFixed(1)} Km';
        }

        mapped.add({
          'terminalName': name,
          'location': '${lat.toStringAsFixed(4)}, ${lng.toStringAsFixed(4)}',
          'lat': lat,
          'lng': lng,
          'routes': const <String>[],
          'distance': distance,
          'isHighlighted': false,
        });
      }

      if (!mounted || mapped.isEmpty) return;
      setState(() {
        _terminalCards = mapped;
      });
    } catch (_) {
      // Keep fallback terminals if API fails.
    }
  }

  void _startNearbyServerPolling() {
    _nearbyServerPoll?.cancel();
    // One-shot + periodic server reads so we are not stuck on an empty cache snapshot.
    Future<void> pull() async {
      final p = _userPosition;
      final q = _selectedRouteCode?.trim();
      try {
        final list = await _nearbyOperatorsService.fetchNearby(
          userLat: p?.latitude,
          userLng: p?.longitude,
          routeCodeFilter: (q == null || q.isEmpty) ? null : q,
          source: Source.server,
        );
        if (!mounted) return;
        setState(() {
          _operatorsFirestoreError = null;
          // Always apply server snapshot so an empty result clears inflated cache/listeners.
          _nearbyOperators = list;
        });
      } catch (e) {
        if (mounted) {
          setState(() => _operatorsFirestoreError = e.toString());
        }
      }
    }

    Future<void>.delayed(const Duration(seconds: 2), () {
      if (mounted) pull();
    });
    _nearbyServerPoll = Timer.periodic(const Duration(seconds: 25), (_) {
      if (mounted) pull();
    });
  }

  Future<void> _loadRouteOptions() async {
    setState(() => _routeOptionsLoading = true);
    final list = await _routeOptionsService.fetchAvailableRoutes();
    if (!mounted) return;
    setState(() {
      _routeOptions = list;
      _routeOptionsLoading = false;
      if (_selectedRouteCode != null) {
        final stillThere = list.any(
          (o) => o.code.toUpperCase() == _selectedRouteCode!.toUpperCase(),
        );
        if (!stillThere) _selectedRouteCode = null;
      }
    });
    _subscribeNearbyOperators();
  }

  String _labelForSelectedRoute() {
    final c = _selectedRouteCode;
    if (c == null || c.isEmpty) return '';
    for (final o in _routeOptions) {
      if (o.code.toUpperCase() == c.toUpperCase()) {
        return o.displayName;
      }
    }
    return c;
  }

  /// Loads from cache first, then fetches if cache is expired or unavailable.
  Future<void> _loadFromCacheOrFetch() async {
    // Check if we have cached location (valid for up to 5 minutes for near me page)
    // Use longer cache duration for near me page to avoid reloading when navigating back
    const cacheDuration = Duration(minutes: 5);
    final cachedPosition = _locationCache.getCachedLocationWithMaxAge(cacheDuration);
    
    // Use cached location if available and valid
    if (cachedPosition != null) {
      final cacheAge = _locationCache.getCacheAge();
      print('📍 [NearMe] Using cached location (${cacheAge?.inMinutes ?? 0} min old)');
      if (mounted) {
        setState(() {
          _userPosition = cachedPosition;
          _destinationsLoading = true;
        });
        _subscribeNearbyOperators();
        // Load bus stops with cached location
        await _loadBusStopsWithPosition(cachedPosition);
        _hasLoadedOnce = true;
        return;
      }
    }
    
    // If no valid cache or first load, fetch fresh location
    await _loadBusStopsAsDestinations();
  }

  /// Loads bus stops and sets them as destination options; also captures closest stop for route origin.
  /// Fetches fresh location if cache is not available.
  Future<void> _loadBusStopsAsDestinations() async {
    if (_hasLoadedOnce && _userPosition != null) {
      // If we already have data and it's been loaded once, don't reload
      print('📍 [NearMe] Data already loaded, skipping reload');
      return;
    }
    
    try {
      Position? position;
      try {
        final hasPermission = await _locationService.requestPermission();
        // Do not require isLocationServiceEnabled — false positives block fixes; last-known still works.
        if (hasPermission) {
          // Do not wrap in Future.timeout — LocationService already runs fused + LocationManager
          // passes and stream fallbacks (can take well over 8s on cold GPS).
          final fetchedPosition = await _locationService.getCurrentPosition(
            preferLowAccuracy: true,
            useCachedPosition: true,
          );
          
          position = fetchedPosition;
          
          // Save to cache after getting position
          await _locationCache.saveLocation(fetchedPosition);
          print('📍 [NearMe] Location saved to cache');
        }
      } catch (_) {
        // Position remains null if fetch fails
      }
      
      if (position != null && mounted) {
        await _loadBusStopsWithPosition(position);
        _hasLoadedOnce = true;
        return;
      }
      
      // Fallback: load Cebu stops without location
      final result = await _busStopsService.getBusStopsInCebu();
      if (!mounted) return;
      _applyDestinationsFromStops(result.stops, null);
      _hasLoadedOnce = true;
      _subscribeNearbyOperators();
      _loadTerminalCardsFromApi();
    } catch (e) {
      if (mounted) {
        setState(() => _destinationsLoading = false);
      }
    }
  }

  /// Loads bus stops using the provided position.
  Future<void> _loadBusStopsWithPosition(Position position) async {
    if (!mounted) return;
    
    setState(() {
      _userPosition = position;
      _destinationsLoading = true;
    });
    _subscribeNearbyOperators();

    try {
      final result = await _busStopsService.getBusStopsWithClosestHighlighted(
        position.latitude,
        position.longitude,
      );
      if (!mounted) return;
      _applyDestinationsFromStops(result.stops, result.closestStopId);
      _loadTerminalCardsFromApi();
    } catch (e) {
      print('⚠️ [NearMe] Error loading bus stops: $e');
      if (mounted) {
        setState(() => _destinationsLoading = false);
      }
    }
  }

  void _applyDestinationsFromStops(List<BusStop> stops, String? closestStopId) {
    if (stops.isEmpty) return;
    final list = stops.map((stop) {
      final location = stop.route.isNotEmpty ? 'Route ${stop.route}' : stop.stopCode;
      return <String, dynamic>{
        'terminalName': stop.name,
        'location': location,
        'lat': stop.lat,
        'lng': stop.lng,
      };
    }).toList();
    LatLng? closestLatLng;
    if (closestStopId != null) {
      for (final s in stops) {
        if (s.id == closestStopId) {
          closestLatLng = s.position;
          break;
        }
      }
    }
    setState(() {
      _destinations = list;
      _closestStopLatLng = closestLatLng;
      _destinationsLoading = false;
    });
  }

  /// Calculates accurate street distance from POINT_A (nearest bus stop) to POINT_B (destination)
  /// using Google Maps API.
  Future<void> _calculateRouteDistance(LatLng pointA, LatLng pointB) async {
    if (!mounted) return;
    
    setState(() {
      _isCalculatingDistance = true;
    });
    
    if (_isCalculatingDistance) {
      print('📍 [NearMe] Starting distance calculation...');
    }
    
    try {
      print('📍 [NearMe] Calculating distance from POINT_A (nearest bus stop) to POINT_B (destination)');
      print('   POINT_A: (${pointA.latitude}, ${pointA.longitude})');
      print('   POINT_B: (${pointB.latitude}, ${pointB.longitude})');
      
      final routeResult = await MapService.getRouteWithDistance(pointA, pointB);
      
      if (!mounted) return;
      
      if (routeResult != null) {
        setState(() {
          _routeDistanceMeters = routeResult.distanceMeters;
          _routeDistanceText = routeResult.distanceText;
          _isCalculatingDistance = false;
        });
        
        print('✅ [NearMe] Route distance calculated:');
        print('   Distance: ${routeResult.distanceText} (${_routeDistanceMeters?.toStringAsFixed(0) ?? 'N/A'} meters)');
        if (routeResult.durationText != null) {
          print('   Duration: ${routeResult.durationText}');
        }
        
        // Log stored distance for debugging
        if (_routeDistanceMeters != null) {
          print('   Stored distance: ${_routeDistanceMeters!.toStringAsFixed(0)} meters');
        }
        
        // Show snackbar with distance information using stored fields
        if (mounted && _routeDistanceText != null) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(
                'Route distance: $_routeDistanceText${routeResult.durationText != null ? ' • ${routeResult.durationText}' : ''}',
              ),
              duration: const Duration(seconds: 3),
              backgroundColor: Colors.blue,
            ),
          );
        }
      } else {
        setState(() {
          _isCalculatingDistance = false;
        });
        print('⚠️ [NearMe] Could not calculate route distance');
      }
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _isCalculatingDistance = false;
      });
      print('❌ [NearMe] Error calculating route distance: $e');
    }
  }

  void _onMapControllerReady(GoogleMapController controller) {
    _mapController = controller;
    _applyPendingRouteCameraFit();
  }

  Future<void> _applyPendingRouteCameraFit() async {
    final ctrl = _mapController;
    final bounds = _pendingRouteFitBounds;
    if (ctrl == null || bounds == null) return;
    _pendingRouteFitBounds = null;
    try {
      await ctrl.animateCamera(
        CameraUpdate.newLatLngBounds(bounds, _routeCameraPadding),
      );
    } catch (_) {}
  }

  /// Loads path + stop positions from Firestore, draws highlight, fits camera to route + all stops.
  Future<void> _fitMapCameraToFirestoreRoute(String routeCode) async {
    final id = ++_routeFitRequestId;
    final pathPts =
        await _routePathCoordinatesService.fetchRoutePathLatLng(routeCode);
    final stopPts =
        await _routePathCoordinatesService.fetchRouteStopPositionsLatLng(routeCode);
    if (!mounted || id != _routeFitRequestId) return;

    final forBounds = <LatLng>[...pathPts, ...stopPts];
    if (forBounds.length < 2) {
      _pendingRouteFitBounds = null;
      setState(() => _routeCatalogHighlightPoints = null);
      return;
    }

    final List<LatLng> polylinePts;
    if (pathPts.length >= 2) {
      polylinePts = pathPts;
    } else if (stopPts.length >= 2) {
      polylinePts = stopPts;
    } else {
      polylinePts = pathPts.isNotEmpty && stopPts.isNotEmpty
          ? [pathPts.first, stopPts.first]
          : const <LatLng>[];
    }

    final bounds = RoutePathCoordinatesService.latLngBoundsFromPoints(forBounds);

    setState(() {
      _routeCatalogHighlightPoints =
          polylinePts.length >= 2 ? List<LatLng>.from(polylinePts) : null;
    });

    final ctrl = _mapController;
    if (ctrl == null) {
      _pendingRouteFitBounds = bounds;
      return;
    }
    try {
      await ctrl.animateCamera(
        CameraUpdate.newLatLngBounds(bounds, _routeCameraPadding),
      );
    } catch (_) {}
  }

  void _subscribeNearbyOperators() {
    _nearbyOperatorsSub?.cancel();
    final p = _userPosition;
    final q = _selectedRouteCode?.trim();
    _nearbyOperatorsSub = _nearbyOperatorsService
        .watchNearby(
          userLat: p?.latitude,
          userLng: p?.longitude,
          routeCodeFilter: (q == null || q.isEmpty) ? null : q,
        )
        .listen(
      (list) {
        if (mounted) {
          setState(() {
            _nearbyOperators = list;
            _operatorsFirestoreError = null;
          });
        }
      },
      onError: (Object e, StackTrace st) {
        debugPrint('NearbyOperators listen error: $e\n$st');
        if (mounted) {
          setState(() => _operatorsFirestoreError = e.toString());
        }
      },
    );
    _startNearbyServerPolling();
  }

  @override
  void dispose() {
    _nearbyServerPoll?.cancel();
    _nearbyOperatorsSub?.cancel();
    _sheetController.dispose();
    _mapController = null;
    super.dispose();
  }

  /// Builds the scrollable list of terminals (uses fallback list with routes/distance for card display)
  Widget _buildTerminalsList(ScrollController scrollController) {
    final terminals = _terminalCards;
    return SliverList(
      delegate: SliverChildBuilderDelegate(
        (context, index) {
          final terminal = terminals[index];
          return Padding(
            padding: EdgeInsets.only(
              bottom: index == terminals.length - 1 ? 24 : 12,
              left: 16,
              right: 16,
            ),
            child: NearbyTerminalCard(
              terminalName: terminal['terminalName'] as String,
              location: terminal['location'] as String,
              routes: terminal['routes'] as List<String>,
              distance: terminal['distance'] as String,
              isHighlighted: terminal['isHighlighted'] as bool,
            ),
          );
        },
        childCount: terminals.length,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Stack(
        children: [
          // 🔹 Map background (route from closest bus stop to selected destination)
          Positioned.fill(
            child: MapWidget(
              routeOrigin: _routeOrigin,
              routeDestination: _routeDestination,
              nearbyOperators: _nearbyOperators,
              onMapControllerReady: _onMapControllerReady,
              routeCatalogHighlightPoints: _routeCatalogHighlightPoints,
              selectedRouteCodeForStopsStream: _selectedRouteCode,
            ),
          ),

          // 🔹 Destination form (bus stops as options)
          Positioned(
            top: 0,
            left: 0,
            right: 0,
            child: SafeArea(
              bottom: false,
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
                child: FromToForm(
                  destinations: _destinations,
                  selectedDestination: _selectedTo,
                  isLoading: _destinationsLoading,
                  onDestinationSelected: (t) async {
                    final lat = t['lat'];
                    final lng = t['lng'];
                    final hasCoords = lat != null && lng != null && lat is num && lng is num;
                    
                    setState(() {
                      _selectedTo = t;
                      _routeDistanceMeters = null;
                      _routeDistanceText = null;
                      _isCalculatingDistance = false;
                      
                      if (hasCoords) {
                        _routeDestination = LatLng(lat.toDouble(), lng.toDouble());
                        _routeOrigin = _closestStopLatLng ??
                            (_userPosition != null
                                ? LatLng(_userPosition!.latitude, _userPosition!.longitude)
                                : null);
                      } else {
                        _routeOrigin = null;
                        _routeDestination = null;
                      }
                    });
                    
                    // Calculate accurate distance from POINT_A (nearest bus stop) to POINT_B (destination)
                    if (hasCoords && _routeOrigin != null && _routeDestination != null) {
                      _calculateRouteDistance(_routeOrigin!, _routeDestination!);
                    }
                  },
                ),
              ),
            ),
          ),

           // 🔹 Free Ride banner (floating above bottom sheet, follows sheet movement with fade animation)
          // Only show when sheet is visible (not at 0)
          // Use IgnorePointer to ensure it doesn't block sheet dragging
          if (_sheetExtent > 0.0)
            Positioned(
              left: 16,
              right: 16,
              bottom: (_sheetExtent * MediaQuery.of(context).size.height) + 16,
              child: IgnorePointer(
                ignoring: false, // Allow banner interactions
                child: AnimatedOpacity(
                  duration: const Duration(milliseconds: 350),
                  curve: Curves.easeInOut,
                  opacity: _showFreeRide ? 1.0 : 0.0,
                  child: IgnorePointer(
                    ignoring: !_showFreeRide,
                    child: FreeRideBanner(
                      showDetails: _showFreeRideDetails,
                      onViewTap: () {
                        setState(() {
                          _showFreeRideDetails = !_showFreeRideDetails;
                        });
                      },
                      onClose: () {
                        setState(() {
                          _showFreeRideDetails = false;
                        });
                      },
                    ),
                  ),
                ),
              ),
            ),


           // 🔹 Bottom draggable sheet - min 10% so user always sees swipe hint
          DraggableScrollableSheet(
            controller: _sheetController,
            initialChildSize: 0.38,
            minChildSize: _minSheetExtent, // 10% peek with swipe icon
            maxChildSize: 0.85,
            snap: true, // Enable snapping to sizes
            snapSizes: const [_minSheetExtent, 0.38, 0.85], // Snap: peek, initial, max
            builder: (context, scrollController) {
              return Container(
                decoration: const BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.vertical(
                    top: Radius.circular(24),
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black12,
                      blurRadius: 12,
                      offset: Offset(0, -4),
                    ),
                  ],
                ),
                child: CustomScrollView(
                  controller: scrollController, // Use sheet's scroll controller for entire content
                  physics: const ClampingScrollPhysics(), // Important for DraggableScrollableSheet
                  slivers: [
                    // 🔹 Drag handle + swipe hint icon (always visible so user knows they can swipe)
                    SliverToBoxAdapter(
                      child: Container(
                        width: double.infinity,
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        child: Center(
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              // Always show arrow: up when minimized, down when card is up
                              Icon(
                                _sheetExtent <= _minSheetExtent + 0.02
                                    ? Icons.keyboard_arrow_up_rounded
                                    : Icons.keyboard_arrow_down_rounded,
                                size: 28,
                                color: Colors.grey.shade600,
                              ),
                              const SizedBox(height: 4),
                              Container(
                                width: 40,
                                height: 4,
                                decoration: BoxDecoration(
                                  color: Colors.grey.shade300,
                                  borderRadius: BorderRadius.circular(2),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),

                    if (_sheetExtent > 0.15) ...[
                      SliverToBoxAdapter(
                        child: Padding(
                          padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Route / jeepney code',
                                style: TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w600,
                                  color: Colors.grey.shade800,
                                ),
                              ),
                              const SizedBox(height: 8),
                              if (_routeOptionsLoading)
                                Padding(
                                  padding: const EdgeInsets.symmetric(vertical: 16),
                                  child: Row(
                                    children: [
                                      SizedBox(
                                        width: 20,
                                        height: 20,
                                        child: CircularProgressIndicator(
                                          strokeWidth: 2,
                                          color: Colors.blue.shade700,
                                        ),
                                      ),
                                      const SizedBox(width: 12),
                                      Text(
                                        'Loading route list…',
                                        style: TextStyle(
                                          color: Colors.grey.shade700,
                                          fontSize: 14,
                                        ),
                                      ),
                                    ],
                                  ),
                                )
                              else
                                DropdownButtonFormField<String?>(
                                  value: _selectedRouteCode,
                                  isExpanded: true,
                                  decoration: InputDecoration(
                                    prefixIcon: const Icon(Icons.directions_bus_outlined),
                                    filled: true,
                                    fillColor: Colors.grey.shade100,
                                    border: OutlineInputBorder(
                                      borderRadius: BorderRadius.circular(12),
                                      borderSide: BorderSide.none,
                                    ),
                                    contentPadding: const EdgeInsets.symmetric(
                                      horizontal: 12,
                                      vertical: 8,
                                    ),
                                  ),
                                  hint: const Text('All nearby buses'),
                                  items: [
                                    const DropdownMenuItem<String?>(
                                      value: null,
                                      child: Text('All nearby buses (any route)'),
                                    ),
                                    ..._routeOptions.map(
                                      (o) => DropdownMenuItem<String?>(
                                        value: o.code,
                                        child: Text(
                                          o.description != null
                                              ? '${o.displayName} · ${o.code}'
                                              : '${o.displayName} (${o.code})',
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                      ),
                                    ),
                                  ],
                                  onChanged: (value) async {
                                    setState(() => _selectedRouteCode = value);
                                    _subscribeNearbyOperators();
                                    if (value == null || value.isEmpty) {
                                      _pendingRouteFitBounds = null;
                                      setState(() => _routeCatalogHighlightPoints = null);
                                      return;
                                    }
                                    await _fitMapCameraToFirestoreRoute(value);
                                  },
                                ),
                              const SizedBox(height: 4),
                              Text(
                                'Same routes operators pick in the driver app. Choose one to see those buses on the map.',
                                style: TextStyle(
                                  fontSize: 12,
                                  color: Colors.grey.shade600,
                                  height: 1.3,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                      SliverToBoxAdapter(
                        child: Padding(
                          padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
                          child: Text(
                            (_selectedRouteCode == null || _selectedRouteCode!.isEmpty)
                                ? (_nearbyOperators.isEmpty
                                    ? 'Operators near you'
                                    : 'Operators near you (${_nearbyOperators.length})')
                                : (_nearbyOperators.isEmpty
                                    ? 'Drivers — ${_labelForSelectedRoute()}'
                                    : 'Drivers — ${_labelForSelectedRoute()} (${_nearbyOperators.length})'),
                            style: const TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                      ),
                      if (_nearbyOperators.isEmpty)
                        SliverToBoxAdapter(
                          child: Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 16),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                if (_operatorsFirestoreError != null) ...[
                                  Text(
                                    'Could not load live buses from the server. '
                                    'Sign in, check your connection, and confirm Firestore rules allow '
                                    'authenticated reads on operator_locations. '
                                    '(${_operatorsFirestoreError!.length > 120 ? '${_operatorsFirestoreError!.substring(0, 120)}…' : _operatorsFirestoreError})',
                                    style: TextStyle(
                                      fontSize: 13,
                                      color: Colors.red.shade800,
                                      height: 1.35,
                                    ),
                                  ),
                                  const SizedBox(height: 12),
                                ],
                                Text(
                                  (_selectedRouteCode != null && _selectedRouteCode!.isNotEmpty)
                                      ? 'No drivers match this route. Try "All nearby buses", or ensure the driver chose the same route in Profile and keeps the driver app open.'
                                      : _userPosition == null
                                          ? 'Allow location to see buses near you, or choose a route above.'
                                          : 'No live bus locations yet. Drivers must open the operator app (logged in) so GPS can publish to Firestore.',
                                  style: TextStyle(
                                    fontSize: 14,
                                    color: Colors.grey.shade700,
                                    height: 1.35,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        )
                      else
                        SliverList(
                          delegate: SliverChildBuilderDelegate(
                            (context, index) {
                              final op = _nearbyOperators[index];
                              return Padding(
                                padding: EdgeInsets.only(
                                  bottom:
                                      index == _nearbyOperators.length - 1 ? 8 : 6,
                                  left: 16,
                                  right: 16,
                                ),
                                child: Material(
                                  elevation: 1,
                                  borderRadius: BorderRadius.circular(12),
                                  color: Colors.orange.shade50,
                                  child: ListTile(
                                    leading: Icon(
                                      Icons.directions_bus_filled_rounded,
                                      color: Colors.orange.shade800,
                                    ),
                                    title: Text(
                                      op.routeCode != null &&
                                              op.routeCode!.isNotEmpty
                                          ? 'Route ${op.routeCode}'
                                          : 'Bus operator',
                                      style: const TextStyle(
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),
                                    subtitle: Text(op.distanceLabel),
                                  ),
                                ),
                              );
                            },
                            childCount: _nearbyOperators.length,
                          ),
                        ),
                      const SliverToBoxAdapter(child: SizedBox(height: 20)),
                    ],

                    // 🔹 Title - only show when sheet is above minimum threshold
                    if (_sheetExtent > 0.15)
                      SliverToBoxAdapter(
                        child: const Padding(
                          padding: EdgeInsets.symmetric(horizontal: 16),
                          child: Text(
                            'Nearby Stops and Terminal',
                            style: TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                      ),

                    if (_sheetExtent > 0.15)
                      const SliverToBoxAdapter(
                        child: SizedBox(height: 12),
                      ),

                    // 🔹 List - Scrollable list of terminals (shown when sheet is up so user sees data on load)
                    if (_sheetExtent > 0.15 && _showStopsContent)
                      _buildTerminalsList(scrollController),
                  ],
                ),
              );
            },
          ),
        ],
      ),
    );
  }
}
