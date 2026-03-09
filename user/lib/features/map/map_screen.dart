import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:geolocator/geolocator.dart';
import '../../core/services/bus_stops_service.dart';
import '../../core/services/location_service.dart';
import '../../core/services/map/map_service.dart';

/// Main map screen: transportation-focused map with bus stops from Firestore.
///
/// - Custom map style hides POIs, transit icons, building/admin labels; keeps roads.
/// - Markers from Firestore [bus_stops] (name, stop code, route).
/// - User location remains visible (blue dot).
/// - Optional custom bus stop icon from assets.
class MapScreen extends StatefulWidget {
  const MapScreen({super.key});

  @override
  State<MapScreen> createState() => _MapScreenState();
}

class _MapScreenState extends State<MapScreen> {
  // Services
  final LocationService _locationService = LocationService();
  
  // Map controller
  GoogleMapController? _mapController;
  
  // State variables
  bool _isLoading = true;
  bool _hasError = false;
  String? _errorMessage;
  Position? _currentPosition;
  CameraPosition? _initialCameraPosition;
  
  // Markers: user location + bus stops from Firestore
  Set<Marker> _markers = {};
  Set<Marker> _busStopMarkers = {};
  String? _mapStyleJson;
  BitmapDescriptor? _busStopIcon;

  final BusStopsService _busStopsService = BusStopsService();

  // Guard to prevent concurrent location requests
  bool _isLocationRequestInProgress = false;
  
  // Performance optimization flags
  static const bool _enableTrafficLayer = true; // Show current traffic on roads
  static const bool _useInstantCameraUpdates = true; // Use moveCamera instead of animateCamera for better performance
  static const bool _preferLowAccuracy = true; // Use low accuracy for faster, battery-efficient location
  static const bool _useCachedPosition = true; // Use cached positions when available
  static const bool _enableCustomMarker = true; // Enable custom marker now that location is working
  
  // Debug info
  bool _showDebugInfo = false; // Set to false by default for better performance
  String _locationStatus = 'Initializing...'; // Status message for debug

  @override
  void initState() {
    super.initState();
    _loadMapStyle();
    _initializeBusStopsAndIcon();
    _initializeLocation();
  }

  @override
  void dispose() {
    // Dispose map controller to prevent memory leaks
    _mapController?.dispose();
    super.dispose();
  }

  /// Initializes location services and gets user's current position.
  /// 
  /// This method:
  /// 1. Checks if location services are enabled
  /// 2. Requests location permission if needed
  /// 3. Gets current GPS position (or last known, or default)
  /// 4. Centers map on user location
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
      _hasError = false;
      _errorMessage = null;
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
          _hasError = false;
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
          _hasError = false;
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
        preferLowAccuracy: _preferLowAccuracy,
        useCachedPosition: _useCachedPosition,
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
          _hasError = false;
          if (isCachedPosition) {
            _locationStatus = 'Using cached location (${positionAge.inMinutes}m old, ${position.accuracy.toStringAsFixed(0)}m accuracy)';
          } else {
            _locationStatus = 'Location found! (${position.accuracy.toStringAsFixed(0)}m accuracy)';
          }
        });
      }
      
      // Add marker asynchronously after state is updated (non-blocking)
      if (_enableCustomMarker) {
        _addMarkerAsync(position);
      }
      
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

      // Center map on user location after controller is ready
      // Don't call _centerMapOnUserLocation() here as it would request location again!
      // Just move the camera to the position we already have
      if (_mapController != null) {
        print('🗺️ [MapScreen] Map controller is ready, moving camera to location...');
        try {
          if (_useInstantCameraUpdates) {
            await _mapController!.moveCamera(
              MapService.createInstantCameraUpdate(position),
            );
            print('   ✅ Camera moved to user location');
          } else {
            await _mapController!.animateCamera(
              MapService.createCameraUpdate(position),
            );
            print('   ✅ Camera animated to user location');
          }
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
      print('   📋 Stack trace: ${StackTrace.current}');
      
      // Check if it's a timeout error
      bool isTimeout = e.toString().contains('timed out') || 
                       e.toString().contains('TimeoutException');
      print('   📋 Is timeout error: $isTimeout');
      
      // For timeout, show helpful message and use default location
      if (isTimeout) {
        print('   🔄 Handling timeout - using default location');
        print('   💡 TIP: If using an emulator, set a mock location:');
        print('      Android: Emulator menu (⋮) → Location → Set coordinates');
        print('      iOS: Xcode → Debug → Simulate Location');
        print('      Or use ADB: adb emu geo fix 120.9842 14.5995');
        print('   💡 TIP: For physical device, try:');
        print('      - Move to area with better GPS signal (near window/outdoors)');
        print('      - Ensure WiFi/network location is enabled in device settings');
        print('      - Wait a bit longer and tap "My Location" button');
        
        setState(() {
          _isLoading = false;
          _hasError = false; // Don't show error overlay for timeout
          _initialCameraPosition = MapService.getDefaultCameraPosition();
          _locationStatus = 'GPS timeout - using default location. Tap "My Location" to retry.';
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
        print('   🔄 Handling other error - showing error overlay');
        // For other errors, show error overlay
        setState(() {
          _isLoading = false;
          _hasError = true;
          _errorMessage = e.toString().replaceAll('Exception: ', '');
          _initialCameraPosition = MapService.getDefaultCameraPosition();
        });
      }
    } finally {
      // Always reset the guard
      _isLocationRequestInProgress = false;
    }
  }

  /// Centers the map on the user's current location.
  /// 
  /// This is called when:
  /// - The map controller is initialized
  /// - User taps the "My Location" button
  Future<void> _centerMapOnUserLocation() async {
    print('🗺️ [MapScreen] _centerMapOnUserLocation() called');
    
    // Prevent concurrent location requests
    if (_isLocationRequestInProgress) {
      print('   ⚠️ Location request already in progress, skipping...');
      return;
    }
    
    if (_mapController == null) {
      print('   ❌ Map controller is null, cannot center');
      return;
    }

    _isLocationRequestInProgress = true;
    // Show loading state
    setState(() {
      _isLoading = true;
    });

    try {
      // Show loading indicator
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Getting your current location...'),
            duration: Duration(seconds: 2),
          ),
        );
      }

      print('🗺️ [MapScreen] Getting position for centering (optimized mode)...');
      // Get position (optimized for performance)
      Position position = await _locationService.getCurrentPosition(
        preferLowAccuracy: _preferLowAccuracy,
        useCachedPosition: _useCachedPosition,
      );
      print('   ✅ Position received for centering:');
      print('      Latitude: ${position.latitude}');
      print('      Longitude: ${position.longitude}');
      
      // Check if this is a cached/old position
      final positionAge = DateTime.now().difference(position.timestamp);
      final isCachedPosition = positionAge.inMinutes > 3;
      
      print('🗺️ [MapScreen] Moving camera to position...');
      // Use instant camera update for better performance on low-end devices
      if (_useInstantCameraUpdates) {
        await _mapController!.moveCamera(
          MapService.createInstantCameraUpdate(position),
        );
        print('   ✅ Camera moved instantly (performance optimized)');
      } else {
        await _mapController!.animateCamera(
          MapService.createCameraUpdate(position),
        );
        print('   ✅ Camera animation completed');
      }

      // Update state first (without marker to avoid blocking)
      if (mounted) {
        setState(() {
          _currentPosition = position;
          _hasError = false;
          _isLoading = false;
        });
      }
      
      // Add marker asynchronously after state is updated (non-blocking)
      // Only if custom marker is enabled (built-in myLocationEnabled is preferred)
      if (_enableCustomMarker) {
        _addMarkerAsync(position);
      }

      // Show appropriate message based on position freshness
      if (mounted) {
        if (isCachedPosition) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(
                'Using cached location (${positionAge.inMinutes} min old). Move to get fresh GPS.',
              ),
              duration: const Duration(seconds: 3),
              backgroundColor: Colors.orange,
            ),
          );
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('✓ Location updated successfully!'),
              duration: Duration(seconds: 2),
              backgroundColor: Colors.green,
            ),
          );
        }
      }
    } catch (e) {
      print('   ❌ [MapScreen] _centerMapOnUserLocation() ERROR: $e');
      print('   📋 Error type: ${e.runtimeType}');
      print('   📋 Error toString: ${e.toString()}');
      
      setState(() {
        _isLoading = false;
      });
      
      // Check if it's a timeout
      bool isTimeout = e.toString().contains('timed out') || 
                       e.toString().contains('TimeoutException');
      print('   📋 Is timeout error: $isTimeout');
      
      // Show error but don't block the UI
      if (mounted) {
        String errorMsg = isTimeout
            ? 'Location request timed out. Make sure:\n• GPS is enabled\n• You\'re in an area with GPS signal\n• Try moving to an open area'
            : 'Could not update location: ${e.toString().replaceAll('Exception: ', '')}';
        
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(errorMsg),
            duration: const Duration(seconds: 4),
            action: SnackBarAction(
              label: 'Retry',
              onPressed: _centerMapOnUserLocation,
            ),
          ),
        );
      }
    } finally {
      // Always reset the guard
      _isLocationRequestInProgress = false;
    }
  }

  /// Called when the map is created and controller is available.
  void _onMapCreated(GoogleMapController controller) {
    _mapController = controller;
    // Apply transportation-focused style (hides POIs, transit, admin labels; keeps roads)
    if (_mapStyleJson != null) {
      controller.setMapStyle(_mapStyleJson);
    }
    // Center map on user location if we already have the position
    if (_currentPosition != null) {
      if (_enableCustomMarker) {
        _addMarkerAsync(_currentPosition!);
      }
      Future.microtask(() async {
        if (_mapController != null && _currentPosition != null) {
          try {
            if (_useInstantCameraUpdates) {
              await _mapController!.moveCamera(
                MapService.createInstantCameraUpdate(_currentPosition!),
              );
            } else {
              await _mapController!.animateCamera(
                MapService.createCameraUpdate(_currentPosition!),
              );
            }
            print('🗺️ [MapScreen] Camera moved to existing position');
          } catch (e) {
            print('⚠️ [MapScreen] Error moving camera: $e');
          }
        }
      });
    }
  }

  Future<void> _loadMapStyle() async {
    try {
      final json = await rootBundle.loadString(
        'assets/map_styles/transportation_map_style.json',
      );
      _mapStyleJson = json;
      if (mounted) {
        setState(() {});
        if (_mapController != null) {
          _mapController!.setMapStyle(_mapStyleJson);
        }
      }
    } catch (e) {
      print('⚠️ [MapScreen] Could not load map style: $e');
    }
  }

  /// Load icon then bus stops so markers are created with a valid icon.
  Future<void> _initializeBusStopsAndIcon() async {
    await _loadBusStopIcon();
    await _loadBusStopsAndCreateMarkers();
  }

  /// Load custom bus stop icon from asset; falls back to orange default marker.
  Future<void> _loadBusStopIcon() async {
    try {
      final descriptor = await BitmapDescriptor.fromAssetImage(
        const ImageConfiguration(size: Size(48, 48), devicePixelRatio: 2.0),
        'assets/images/logo/Bus.png',
      );
      if (mounted) {
        setState(() => _busStopIcon = descriptor);
      }
    } catch (e) {
      print('⚠️ [MapScreen] Using default bus stop marker (asset failed): $e');
      if (mounted) {
        setState(() => _busStopIcon = BitmapDescriptor.defaultMarkerWithHue(
          BitmapDescriptor.hueOrange,
        ));
      }
    }
  }

  /// Rebuild _markers from user location + bus stop markers.
  void _applyMarkers() {
    final Set<Marker> next = Set<Marker>.from(_busStopMarkers);
    if (_currentPosition != null) {
      next.add(Marker(
        markerId: const MarkerId('user_location'),
        position: LatLng(_currentPosition!.latitude, _currentPosition!.longitude),
        icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueBlue),
        infoWindow: const InfoWindow(title: 'Your Location', snippet: 'You are here'),
        anchor: const Offset(0.5, 0.5),
      ));
    }
    _markers = next;
  }

  /// Load bus stops from Firestore (or sample data) and create map markers.
  Future<void> _loadBusStopsAndCreateMarkers() async {
    try {
      final stops = await _busStopsService.getBusStops();
      final icon = _busStopIcon ?? BitmapDescriptor.defaultMarkerWithHue(
        BitmapDescriptor.hueOrange,
      );
      final Set<Marker> markers = {};
      for (final stop in stops) {
        markers.add(Marker(
          markerId: MarkerId('bus_stop_${stop.id}'),
          position: stop.position,
          icon: icon,
          infoWindow: InfoWindow(
            title: stop.name,
            snippet: 'Stop ${stop.stopCode} · Route ${stop.route}',
          ),
        ));
      }
      if (mounted) {
        setState(() {
          _busStopMarkers = markers;
          _applyMarkers();
        });
        print('📍 [MapScreen] Loaded ${markers.length} bus stop markers');
      }
    } catch (e) {
      print('⚠️ [MapScreen] Error loading bus stops: $e');
      if (mounted) setState(() {});
    }
  }

  /// Adds user location and merges with bus stop markers.
  void _addMarkerAsync(Position position) {
    Future.delayed(const Duration(milliseconds: 300), () {
      if (!mounted || _mapController == null) return;
      setState(() {
        _currentPosition = position;
        _applyMarkers();
      });
      print('📍 [MapScreen] User location marker added at (${position.latitude}, ${position.longitude})');
    });
  }

  /// Opens app settings so user can manually enable location permission.
  Future<void> _openAppSettings() async {
    await _locationService.openAppSettings();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Stack(
        children: [
          // Google Map (optimized for performance)
          GoogleMap(
            initialCameraPosition:
                _initialCameraPosition ?? MapService.getDefaultCameraPosition(),
            onMapCreated: _onMapCreated,
            myLocationEnabled: true, // Shows blue dot for user location
            myLocationButtonEnabled: false, // We'll use custom button
            markers: _enableCustomMarker ? _markers : {}, // Custom markers (disabled by default to prevent timeouts)
            trafficEnabled: _enableTrafficLayer,
            mapType: MapService.getDefaultMapType(),
            zoomControlsEnabled: false, // Hide default zoom controls
            compassEnabled: true, // Show compass
            // Performance optimizations
            liteModeEnabled: false, // Keep false for full functionality, but can enable for very low-end devices
            buildingsEnabled: true, // Can disable for better performance if needed
            indoorViewEnabled: false, // Disable indoor view for better performance
          ),

          // Loading indicator overlay
          if (_isLoading)
            Container(
              color: Colors.black.withOpacity(0.3),
              child: const Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    CircularProgressIndicator(
                      valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                    ),
                    SizedBox(height: 16),
                    Text(
                      'Getting your location...',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 16,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
              ),
            ),

          // Error overlay (only for non-timeout errors)
          if (_hasError && !_isLoading)
            Container(
              color: Colors.black.withOpacity(0.5),
              child: Center(
                child: Container(
                  margin: const EdgeInsets.all(24),
                  padding: const EdgeInsets.all(24),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(
                        Icons.location_off,
                        size: 64,
                        color: Colors.red,
                      ),
                      const SizedBox(height: 16),
                      Text(
                        'Location Error',
                        style: Theme.of(context).textTheme.titleLarge?.copyWith(
                              fontWeight: FontWeight.bold,
                            ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        _errorMessage ?? 'Unknown error occurred',
                        textAlign: TextAlign.center,
                        style: Theme.of(context).textTheme.bodyMedium,
                      ),
                      const SizedBox(height: 24),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          ElevatedButton(
                            onPressed: () => _initializeLocation(showError: true),
                            child: const Text('Retry'),
                          ),
                          const SizedBox(width: 12),
                          ElevatedButton(
                            onPressed: () {
                              setState(() {
                                _hasError = false;
                                _initialCameraPosition = MapService.getDefaultCameraPosition();
                              });
                            },
                            style: ElevatedButton.styleFrom(
                              backgroundColor: Colors.grey,
                              foregroundColor: Colors.white,
                            ),
                            child: const Text('Use Default'),
                          ),
                          if (_errorMessage?.contains('permanently denied') == true)
                            const SizedBox(width: 12),
                          if (_errorMessage?.contains('permanently denied') == true)
                            ElevatedButton(
                              onPressed: _openAppSettings,
                              style: ElevatedButton.styleFrom(
                                backgroundColor: Colors.blue,
                                foregroundColor: Colors.white,
                              ),
                              child: const Text('Settings'),
                            ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ),

          // My Location button (bottom right)
          if (!_isLoading && !_hasError)
            Positioned(
              bottom: 24,
              right: 16,
              child: FloatingActionButton(
                onPressed: _centerMapOnUserLocation,
                backgroundColor: Colors.white,
                child: const Icon(
                  Icons.my_location,
                  color: Colors.blue,
                ),
              ),
            ),

          // Debug info overlay (top left) - tap to toggle
          // Only render when visible to save performance
          if (_showDebugInfo && !_isLoading)
            Positioned(
              top: 16,
              left: 16,
              child: Material(
                color: Colors.transparent,
                child: GestureDetector(
                  onTap: () {
                    setState(() {
                      _showDebugInfo = !_showDebugInfo;
                    });
                  },
                  child: Container(
                    constraints: const BoxConstraints(maxWidth: 250),
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.black.withOpacity(0.7),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(Icons.bug_report, color: Colors.yellow, size: 16),
                            const SizedBox(width: 8),
                            const Flexible(
                              child: Text(
                                'DEBUG INFO',
                                style: TextStyle(
                                  color: Colors.yellow,
                                  fontSize: 12,
                                  fontWeight: FontWeight.bold,
                                ),
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                            const SizedBox(width: 8),
                            GestureDetector(
                              onTap: () {
                                setState(() {
                                  _showDebugInfo = false;
                                });
                              },
                              child: const Icon(Icons.close, color: Colors.white, size: 16),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        _buildDebugLine('Status', _isLoading ? 'Loading...' : (_hasError ? 'Error' : (_currentPosition != null ? 'Ready ✓' : 'Ready (No GPS)'))),
                        _buildDebugLine('Info', _locationStatus),
                        if (_currentPosition != null) ...[
                          _buildDebugLine('Lat', _currentPosition!.latitude.toStringAsFixed(6)),
                          _buildDebugLine('Lng', _currentPosition!.longitude.toStringAsFixed(6)),
                          _buildDebugLine('Accuracy', '${_currentPosition!.accuracy.toStringAsFixed(1)}m'),
                          _buildDebugLine('Source', _currentPosition!.accuracy > 100 ? 'Network/WiFi' : 'GPS'),
                        ] else ...[
                          _buildDebugLine('Position', 'Not available'),
                          _buildDebugLine('Location', 'Using default'),
                          _buildDebugLine('Action', 'Tap "My Location"'),
                        ],
                        if (_errorMessage != null)
                          _buildDebugLine('Last Error', _errorMessage!.length > 40 
                            ? '${_errorMessage!.substring(0, 40)}...' 
                            : _errorMessage!),
                        const SizedBox(height: 4),
                        const Text(
                          'Tap to hide',
                          style: TextStyle(
                            color: Colors.grey,
                            fontSize: 10,
                            fontStyle: FontStyle.italic,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildDebugLine(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 60,
            child: Text(
              '$label:',
              style: const TextStyle(
                color: Colors.white70,
                fontSize: 11,
              ),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 11,
                fontWeight: FontWeight.w500,
              ),
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
      ),
    );
  }
}
