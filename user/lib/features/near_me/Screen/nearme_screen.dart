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
import '../../../core/services/driver_status_read_service.dart';
import '../../../core/services/route_path_coordinates_service.dart';
import '../../../shared/bottom_navBar.dart';
import '../../map/map.dart';
import '../Module/free_ride.dart';
import '../Module/from_to_form.dart';
import '../Module/nearme_bottom_sheet.dart';

const double nearMeMinSheetExtent = 0.08;
const double nearMeRouteCameraPadding = 50.0;
const String terminalsApiUrl = 'https://pasa-hero-server.vercel.app/api/terminals/';
const List<Map<String, dynamic>> terminalsFallback = [
  {'terminalName': 'Pacific Terminal', 'location': 'Pacific Mall, Mandaue', 'lat': 10.3232, 'lng': 123.9456, 'routes': ['01K', '13B', '01F', '46E'], 'distance': '0.6 Km', 'isHighlighted': true},
  {'terminalName': 'Marpa', 'location': 'Maguikay, Mandaue City', 'lat': 10.3312, 'lng': 123.9388, 'routes': ['01K', '13B', '01F', '46E'], 'distance': '0.6 Km', 'isHighlighted': false},
  {'terminalName': 'Jmall', 'location': 'Jmall, Mandaue City', 'lat': 10.3289, 'lng': 123.9321, 'routes': ['01K', '13B', '01F', '46E'], 'distance': '0.7 Km', 'isHighlighted': false},
  {'terminalName': 'Ayala Terminal', 'location': 'Ayala Center, Cebu City', 'lat': 10.3192, 'lng': 123.9076, 'routes': ['02A', '04B', '12C'], 'distance': '1.2 Km', 'isHighlighted': false},
  {'terminalName': 'SM Terminal', 'location': 'SM City, Cebu', 'lat': 10.3156, 'lng': 123.9182, 'routes': ['03D', '05E', '08F'], 'distance': '1.5 Km', 'isHighlighted': false},
];

class NearMeScreen extends StatelessWidget {
  final int initialTabIndex;

  const NearMeScreen({
    super.key,
    this.initialTabIndex = 0,
  });

  @override
  Widget build(BuildContext context) {
    return MainNavigationScreen(
      nearMeContent: const _NearMeContent(),
      initialIndex: initialTabIndex,
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
  bool _hasActiveFreeRide = false;
  Set<String> _activeFreeRideOperatorIds = <String>{};
  /// Route tokens with active free ride (`driver_status`); all operators on that route get the free-ride map icon.
  Set<String> _activeFreeRideRouteCodes = <String>{};
  /// Raw route ids from active `driver_status` docs — used with [NearbyOperatorsService.routeMatchesNearMeFilter]
  /// so map icons match the same loose rules as the operator list (substring / numeric keys).
  Set<String> _activeFreeRideRouteHints = <String>{};
  /// Mongo/API [is_free_ride] routes — map marker uses free-ride art for buses on these lines
  /// even when Firestore `driver_status` has no time-window campaign.
  Set<String> _mongoFreeRideRouteCodes = <String>{};
  Set<String> _mongoFreeRideRouteHints = <String>{};
  /// From `driver_status` when an operator has free ride on (see `_subscribeFreeRideStatus`).
  String? _freeRideRouteCode;
  DateTime? _freeRideUntil;
  bool _showStopsContent = true;

  Map<String, dynamic>? _selectedTo;
  List<Map<String, dynamic>> _destinations = [];
  LatLng? _closestStopLatLng;
  /// Human-readable label for [_closestStopLatLng] (shown as trip “From”).
  String? _closestStopName;
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

  /// Every live bus from Firestore (route filter applied in [_visibleNearbyOperators]).
  List<NearbyOperator> _allNearbyOperators = [];
  /// Operator Firebase uids on the selected route per [driver_status] (authoritative when
  /// [operator_locations.routeCode] is empty or out of sync).
  Set<String> _driverStatusOperatorIdsForRoute = {};
  /// Latest route label from [driver_status] keyed by operator uid (lowercase).
  Map<String, String> _driverStatusRouteByOperatorId = {};
  StreamSubscription<List<NearbyOperator>>? _nearbyOperatorsSub;
  StreamSubscription<QuerySnapshot<Map<String, dynamic>>>? _freeRideSub;
  Timer? _nearbyServerPoll;
  /// Refreshes Mongo/API route catalog (free-ride flags) alongside Firebase [driver_status].
  Timer? _mongoRouteCatalogPoll;
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

  void _onSheetExtentChanged() {
    final extent = _sheetController.size;
    final showFreeRide = extent > nearMeMinSheetExtent && extent < 0.70;
    final showStopsContent = extent > 0.15;
    final shouldUpdate = (extent - _sheetExtent).abs() > 0.005 ||
        showFreeRide != _showFreeRide ||
        showStopsContent != _showStopsContent;
    if (!shouldUpdate) return;
    _updateFromSheetExtent(extent);
  }

  void _updateFromSheetExtent(double extent) {
    setState(() {
      _sheetExtent = extent;
      _showFreeRide = extent > nearMeMinSheetExtent && extent < 0.70;
      _showStopsContent = extent > 0.15;
    });
  }

  bool _isFreeRideActiveDoc(Map<String, dynamic> data) {
    return DriverStatusReadService.isFreeRideActiveData(data);
  }

  /// Route code on `driver_status` (operator writes `route_id` = route code doc id).
  String? _routeCodeFromDriverStatus(Map<String, dynamic> data) {
    final rid = data['route_id']?.toString().trim();
    if (rid != null && rid.isNotEmpty) return rid;
    final rc = data['route_code'] ?? data['routeCode'];
    final s = rc?.toString().trim();
    if (s != null && s.isNotEmpty) return s;
    return null;
  }

  /// Same token set as [MapScreen._addRouteCodeTokens] so operator [routeCode] matches [driver_status] keys.
  void _addFreeRideRouteTokens(Set<String> out, String? raw) {
    if (raw == null) return;
    final t = raw.trim();
    if (t.isEmpty) return;
    out.add(t.toUpperCase());
    final alnum = t.toUpperCase().replaceAll(RegExp(r'[^A-Z0-9]'), '');
    if (alnum.isNotEmpty) {
      out.add(alnum);
      if (alnum.startsWith('ROUTE') && alnum.length > 5) {
        out.add(alnum.substring(5));
      }
    }
  }

  /// True when the Near Me route dropdown selection is a Mongo free-ride route (see [OperatorRouteOption.isFreeRideRoute]).
  bool get _selectedCatalogRouteIsFreeRide {
    final s = _selectedRouteCode?.trim();
    if (s == null || s.isEmpty) return false;
    final key = s.toUpperCase();
    for (final o in _routeOptions) {
      if (o.code.trim().toUpperCase() == key) return o.isFreeRideRoute;
    }
    return false;
  }

  String _routeDisplayNameForCode(String? code) {
    if (code == null || code.trim().isEmpty) return '';
    final key = code.trim().toUpperCase();
    for (final o in _routeOptions) {
      if (o.code.trim().toUpperCase() == key) return o.displayName;
    }
    return code.trim();
  }

  List<NearbyOperator> get _visibleNearbyOperators {
    final routeByOp = _driverStatusRouteByOperatorId;
    NearbyOperator withRouteHint(NearbyOperator op) {
      final hasRoute = (op.routeCode?.trim().isNotEmpty ?? false);
      if (hasRoute) return op;
      final id = op.operatorId.trim().toLowerCase();
      String? hint = routeByOp[id];
      if ((hint == null || hint.trim().isEmpty) &&
          op.locationAuthUid != null &&
          op.locationAuthUid!.trim().isNotEmpty) {
        hint = routeByOp[op.locationAuthUid!.trim().toLowerCase()];
      }
      if (hint == null || hint.trim().isEmpty) return op;
      return NearbyOperator(
        operatorId: op.operatorId,
        latitude: op.latitude,
        longitude: op.longitude,
        routeCode: hint.trim(),
        distanceMeters: op.distanceMeters,
        locationAuthUid: op.locationAuthUid,
      );
    }

    final sel = _selectedRouteCode?.trim();
    if (sel == null || sel.isEmpty) {
      return _allNearbyOperators.map(withRouteHint).toList();
    }
    final trusted = _driverStatusOperatorIdsForRoute;
    return _allNearbyOperators.where((op) {
      if (NearbyOperatorsService.routeMatchesNearMeFilter(op.routeCode, sel)) {
        return true;
      }
      final id = op.operatorId.trim().toLowerCase();
      if (trusted.contains(id)) return true;
      final u = op.locationAuthUid?.trim().toLowerCase();
      return u != null && u.isNotEmpty && trusted.contains(u);
    }).map(withRouteHint).toList();
  }

  /// True when a visible nearby bus uses the Mongo free-ride marker (same as [MapWidget]).
  bool get _hasNearbyMongoFreeRideBus {
    for (final op in _visibleNearbyOperators) {
      if (NearbyOperatorsService.operatorOnMongoFreeRideLine(
            op,
            mongoFreeRideRouteCodes: _mongoFreeRideRouteCodes,
            mongoFreeRideRouteHints: _mongoFreeRideRouteHints,
          )) {
        return true;
      }
    }
    return false;
  }

  /// Route label for the floating banner when a Mongo free bus is visible (no Firestore promo / no filter).
  String? _mongoFreeRideBannerRouteCodeFromOperators() {
    for (final op in _visibleNearbyOperators) {
      if (!NearbyOperatorsService.operatorOnMongoFreeRideLine(
            op,
            mongoFreeRideRouteCodes: _mongoFreeRideRouteCodes,
            mongoFreeRideRouteHints: _mongoFreeRideRouteHints,
          )) {
        continue;
      }
      final rc = op.routeCode?.trim();
      if (rc != null && rc.isNotEmpty) return rc;
    }
    return null;
  }

  void _subscribeFreeRideStatus() {
    _freeRideSub?.cancel();
    // Listen to the full collection: a Firestore `where route_id == selected` is brittle
    // (case/format vs dropdown) and would yield zero docs so map icons never flip.
    _freeRideSub = FirebaseFirestore.instance
        .collection('driver_status')
        .snapshots()
        .listen((snapshot) {
      final selected = _selectedRouteCode?.trim();
      final hasRouteFilter = selected != null && selected.isNotEmpty;

      QueryDocumentSnapshot<Map<String, dynamic>>? bannerDoc;
      QueryDocumentSnapshot<Map<String, dynamic>>? firstActiveDoc;
      final activeIds = <String>{};
      final routeKeys = <String>{};
      final routeHints = <String>{};
      final trustedForRoute = <String>{};
      final routeByOp = <String, String>{};
      for (final doc in snapshot.docs) {
        final data = doc.data();
        final docRoute =
            _routeCodeFromDriverStatus(data) ?? doc.id.trim();

        if (hasRouteFilter &&
            NearbyOperatorsService.routeMatchesNearMeFilter(
              docRoute,
              selected,
            )) {
          for (final key in <String>[
            'operator_id',
            'operatorId',
            'uid',
            'firebase_uid',
            'firebaseUid',
          ]) {
            final raw = data[key];
            if (raw == null) continue;
            final id = raw.toString().trim().toLowerCase();
            if (id.isNotEmpty) {
              trustedForRoute.add(id);
              if (docRoute.isNotEmpty) routeByOp[id] = docRoute;
            }
          }
        }

        if (!_isFreeRideActiveDoc(data)) continue;

        firstActiveDoc ??= doc;

        for (final key in <String>[
          'operator_id',
          'operatorId',
          'uid',
          'firebase_uid',
          'firebaseUid',
        ]) {
          final raw = data[key];
          if (raw == null) continue;
          final id = raw.toString().trim().toLowerCase();
          if (id.isNotEmpty) {
            activeIds.add(id);
            if (docRoute.isNotEmpty) routeByOp[id] = docRoute;
          }
        }

        _addFreeRideRouteTokens(routeKeys, docRoute);
        _addFreeRideRouteTokens(routeKeys, doc.id);
        if (docRoute.isNotEmpty) routeHints.add(docRoute);
        final idTrim = doc.id.trim();
        if (idTrim.isNotEmpty && idTrim != docRoute) routeHints.add(idTrim);

        if (bannerDoc == null) {
          if (!hasRouteFilter) {
            bannerDoc = doc;
          } else if (NearbyOperatorsService.routeMatchesNearMeFilter(
                docRoute,
                selected,
              )) {
            bannerDoc = doc;
          }
        }
      }
      // Map icons use any active promo; banner text should still show if only a
      // non-selected route has a promo (e.g. Mongo bus + Firestore mismatch).
      final docForBanner = bannerDoc ?? firstActiveDoc;
      final hasActive = docForBanner != null;
      String? routeCode;
      DateTime? until;
      if (docForBanner != null) {
        final data = docForBanner.data();
        routeCode = _routeCodeFromDriverStatus(data) ?? docForBanner.id.trim();
        until = DriverStatusReadService.readFreeRideUntilFromData(data);
        // Firebase + Mongo: merge API free-ride line tokens for the same route line
        // so bus markers match when GPS route_code and driver_status differ slightly.
        final br = routeCode.trim();
        if (br.isNotEmpty) {
          for (final o in _routeOptions) {
            if (!o.isFreeRideRoute) continue;
            if (!NearbyOperatorsService.routesLooselySameLine(o.code, br)) continue;
            _addFreeRideRouteTokens(routeKeys, o.code);
            final t = o.code.trim();
            if (t.isNotEmpty) routeHints.add(t);
          }
        }
      }
      if (!mounted) return;
      setState(() {
        _hasActiveFreeRide = hasActive;
        _activeFreeRideOperatorIds = activeIds;
        _activeFreeRideRouteCodes = routeKeys;
        _activeFreeRideRouteHints = routeHints;
        _driverStatusOperatorIdsForRoute = trustedForRoute;
        _driverStatusRouteByOperatorId = routeByOp;
        _freeRideRouteCode = hasActive ? routeCode : null;
        _freeRideUntil = hasActive ? until : null;
        if (!hasActive) {
          _showFreeRideDetails = false;
        }
      });
    }, onError: (_, _) {
      if (!mounted) return;
      setState(() {
        _hasActiveFreeRide = false;
        _activeFreeRideOperatorIds = <String>{};
        _activeFreeRideRouteCodes = <String>{};
        _activeFreeRideRouteHints = <String>{};
        _driverStatusOperatorIdsForRoute = <String>{};
        _driverStatusRouteByOperatorId = <String, String>{};
        _freeRideRouteCode = null;
        _freeRideUntil = null;
        _showFreeRideDetails = false;
      });
    });
  }

  @override
  void initState() {
    super.initState();
    _terminalCards = List<Map<String, dynamic>>.from(terminalsFallback);
    _sheetController = DraggableScrollableController();
    _sheetController.addListener(_onSheetExtentChanged);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) {
        _updateFromSheetExtent(_sheetController.size);
        // Listen to Firestore immediately so a slow route-catalog fetch never delays drivers.
        _subscribeNearbyOperators();
        _subscribeFreeRideStatus();
        _loadRouteOptions();
        _loadTerminalCardsFromApi();
        // Try to load from cache first, then fetch if needed
        _loadFromCacheOrFetch();
      }
    });
  }

  Future<void> _loadTerminalCardsFromApi() async {
    try {
      final uri = Uri.parse(terminalsApiUrl);
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
      try {
        final list = await _nearbyOperatorsService.fetchNearby(
          userLat: p?.latitude,
          userLng: p?.longitude,
          routeCodeFilter: null,
          source: Source.server,
        );
        if (!mounted) return;
        setState(() {
          _operatorsFirestoreError = null;
          // Always apply server snapshot so an empty result clears inflated cache/listeners.
          _allNearbyOperators = list;
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
    final mongoCodes = <String>{};
    final mongoHints = <String>{};
    for (final o in list) {
      if (!o.isFreeRideRoute) continue;
      _addFreeRideRouteTokens(mongoCodes, o.code);
      final t = o.code.trim();
      if (t.isNotEmpty) mongoHints.add(t);
    }
    setState(() {
      _routeOptions = list;
      _routeOptionsLoading = false;
      _mongoFreeRideRouteCodes = mongoCodes;
      _mongoFreeRideRouteHints = mongoHints;
      if (_selectedRouteCode != null) {
        final stillThere = list.any(
          (o) => o.code.toUpperCase() == _selectedRouteCode!.toUpperCase(),
        );
        if (!stillThere) _selectedRouteCode = null;
      }
    });
    _subscribeNearbyOperators();
    _startMongoRouteCatalogPoll();
  }

  void _startMongoRouteCatalogPoll() {
    _mongoRouteCatalogPoll?.cancel();
    _mongoRouteCatalogPoll =
        Timer.periodic(const Duration(seconds: 90), (_) async {
      await _refreshMongoFreeRideCatalogQuietly();
    });
  }

  /// Keeps Mongo [is_free_ride] metadata fresh without touching Firebase listeners.
  Future<void> _refreshMongoFreeRideCatalogQuietly() async {
    try {
      final list = await _routeOptionsService.fetchAvailableRoutes();
      if (!mounted) return;
      final mongoCodes = <String>{};
      final mongoHints = <String>{};
      for (final o in list) {
        if (!o.isFreeRideRoute) continue;
        _addFreeRideRouteTokens(mongoCodes, o.code);
        final t = o.code.trim();
        if (t.isNotEmpty) mongoHints.add(t);
      }
      setState(() {
        _routeOptions = list;
        _mongoFreeRideRouteCodes = mongoCodes;
        _mongoFreeRideRouteHints = mongoHints;
      });
    } catch (_) {}
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
    String? closestName;
    if (closestStopId != null) {
      for (final s in stops) {
        if (s.id == closestStopId) {
          closestLatLng = s.position;
          closestName = s.name.trim().isNotEmpty ? s.name : s.stopCode;
          break;
        }
      }
    }
    setState(() {
      _destinations = list;
      _closestStopLatLng = closestLatLng;
      _closestStopName = closestName;
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
        CameraUpdate.newLatLngBounds(bounds, nearMeRouteCameraPadding),
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
        CameraUpdate.newLatLngBounds(bounds, nearMeRouteCameraPadding),
      );
    } catch (_) {}
  }

  void _subscribeNearbyOperators() {
    _nearbyOperatorsSub?.cancel();
    final p = _userPosition;
    // Always load all live buses; Near Me narrows by route using GPS route_code plus
    // [driver_status] operator ids so we still show drivers when Firestore route is stale.
    _nearbyOperatorsSub = _nearbyOperatorsService
        .watchNearby(
          userLat: p?.latitude,
          userLng: p?.longitude,
          routeCodeFilter: null,
        )
        .listen(
      (list) {
        if (mounted) {
          setState(() {
            _allNearbyOperators = list;
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
    _mongoRouteCatalogPoll?.cancel();
    _nearbyOperatorsSub?.cancel();
    _freeRideSub?.cancel();
    _sheetController.removeListener(_onSheetExtentChanged);
    _sheetController.dispose();
    _mapController = null;
    super.dispose();
  }

  Future<void> _onDestinationSelected(Map<String, dynamic> t) async {
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

    if (hasCoords && _routeOrigin != null && _routeDestination != null) {
      await _calculateRouteDistance(_routeOrigin!, _routeDestination!);
    }
  }

  Future<void> _onRouteChanged(String? value) async {
    setState(() => _selectedRouteCode = value);
    _subscribeNearbyOperators();
    _subscribeFreeRideStatus();
    if (value == null || value.isEmpty) {
      _pendingRouteFitBounds = null;
      setState(() => _routeCatalogHighlightPoints = null);
      return;
    }
    await _fitMapCameraToFirestoreRoute(value);
  }

  @override
  Widget build(BuildContext context) {
    final hasNearbyMongoFree = _hasNearbyMongoFreeRideBus;
    final showFreeRideFloatingBanner = _hasActiveFreeRide ||
        _selectedCatalogRouteIsFreeRide ||
        hasNearbyMongoFree;
    final catalogOnlyFreeRideBanner = !_hasActiveFreeRide &&
        (_selectedCatalogRouteIsFreeRide || hasNearbyMongoFree);
    final String? bannerRouteCode = _hasActiveFreeRide
        ? _freeRideRouteCode
        : (_selectedCatalogRouteIsFreeRide
            ? _selectedRouteCode
            : (hasNearbyMongoFree
                ? _mongoFreeRideBannerRouteCodeFromOperators()
                : null));

    return Scaffold(
      body: Stack(
        children: [
          // 🔹 Map background (route from closest bus stop to selected destination)
          Positioned.fill(
            child: MapWidget(
              routeOrigin: _routeOrigin,
              routeDestination: _routeDestination,
              nearbyOperators: _visibleNearbyOperators,
              activeFreeRideOperatorIds: _activeFreeRideOperatorIds,
              activeFreeRideRouteCodes: _activeFreeRideRouteCodes,
              activeFreeRideRouteHints: _activeFreeRideRouteHints,
              mongoFreeRideRouteCodes: _mongoFreeRideRouteCodes,
              mongoFreeRideRouteHints: _mongoFreeRideRouteHints,
              selectedCatalogRouteIsFreeRide: _selectedCatalogRouteIsFreeRide,
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
                  startingPointLabel: _closestStopName,
                  onDestinationSelected: _onDestinationSelected,
                ),
              ),
            ),
          ),

           // 🔹 Free Ride banner (floating above bottom sheet, follows sheet movement with fade animation)
          // Firestore promo and/or catalog free-ride line (same cases as free-ride map icons).
          // Only show when sheet is visible (not at 0)
          // Use IgnorePointer to ensure it doesn't block sheet dragging
          if (_sheetExtent > 0.0 && showFreeRideFloatingBanner)
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
                      routeCode: bannerRouteCode,
                      routeDisplayName:
                          _routeDisplayNameForCode(bannerRouteCode),
                      freeRideUntil: _freeRideUntil,
                      isCatalogFreeRideLine: catalogOnlyFreeRideBanner,
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
          NearMeBottomSheet(
            sheetController: _sheetController,
            sheetExtent: _sheetExtent,
            minSheetExtent: nearMeMinSheetExtent,
            routeOptionsLoading: _routeOptionsLoading,
            routeOptions: _routeOptions,
            selectedRouteCode: _selectedRouteCode,
            onRouteChanged: _onRouteChanged,
            labelForSelectedRoute: _labelForSelectedRoute,
            nearbyOperators: _visibleNearbyOperators,
            operatorsFirestoreError: _operatorsFirestoreError,
            userPositionAvailable: _userPosition != null,
            terminals: _terminalCards,
            showStopsContent: _showStopsContent,
          ),
        ],
      ),
    );
  }
}
