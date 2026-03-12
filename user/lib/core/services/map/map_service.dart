import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:geolocator/geolocator.dart';

/// Service class for map-related utilities and configurations.
/// 
/// This service provides helper methods for:
/// - Creating camera positions from GPS coordinates
/// - Creating camera update animations
/// - Default map configurations
class MapService {
  /// Creates a [CameraPosition] from a [Position] object.
  /// 
  /// Parameters:
  /// - [position]: The GPS position containing latitude and longitude
  /// - [zoom]: The zoom level (default: 15.0)
  /// - [tilt]: The camera tilt angle (default: 0.0)
  /// - [bearing]: The camera bearing/rotation (default: 0.0)
  /// 
  /// Returns a [CameraPosition] that can be used to center the map.
  static CameraPosition cameraPositionFromPosition(
    Position position, {
    double zoom = 15.0,
    double tilt = 0.0,
    double bearing = 0.0,
  }) {
    return CameraPosition(
      target: LatLng(position.latitude, position.longitude),
      zoom: zoom,
      tilt: tilt,
      bearing: bearing,
    );
  }

  /// Creates a [CameraPosition] from latitude and longitude coordinates.
  /// 
  /// Parameters:
  /// - [latitude]: The latitude coordinate
  /// - [longitude]: The longitude coordinate
  /// - [zoom]: The zoom level (default: 15.0)
  /// - [tilt]: The camera tilt angle (default: 0.0)
  /// - [bearing]: The camera bearing/rotation (default: 0.0)
  /// 
  /// Returns a [CameraPosition] that can be used to center the map.
  static CameraPosition cameraPositionFromCoordinates(
    double latitude,
    double longitude, {
    double zoom = 15.0,
    double tilt = 0.0,
    double bearing = 0.0,
  }) {
    return CameraPosition(
      target: LatLng(latitude, longitude),
      zoom: zoom,
      tilt: tilt,
      bearing: bearing,
    );
  }

  /// Creates a [CameraUpdate] to animate the camera to a specific position.
  /// 
  /// Parameters:
  /// - [position]: The GPS position to animate to
  /// - [zoom]: The zoom level (default: 15.0)
  /// 
  /// Returns a [CameraUpdate] that can be used with [GoogleMapController.animateCamera].
  static CameraUpdate createCameraUpdate(
    Position position, {
    double zoom = 15.0,
  }) {
    return CameraUpdate.newCameraPosition(
      cameraPositionFromPosition(position, zoom: zoom),
    );
  }

  /// Creates a [CameraUpdate] to animate the camera to specific coordinates.
  /// 
  /// Parameters:
  /// - [latitude]: The latitude coordinate
  /// - [longitude]: The longitude coordinate
  /// - [zoom]: The zoom level (default: 15.0)
  /// 
  /// Returns a [CameraUpdate] that can be used with [GoogleMapController.animateCamera].
  static CameraUpdate createCameraUpdateFromCoordinates(
    double latitude,
    double longitude, {
    double zoom = 15.0,
  }) {
    return CameraUpdate.newCameraPosition(
      cameraPositionFromCoordinates(latitude, longitude, zoom: zoom),
    );
  }

  /// Gets the default map type.
  /// 
  /// Returns [MapType.normal] which is the standard road map view.
  static MapType getDefaultMapType() {
    return MapType.normal;
  }

  /// Gets the default initial camera position (Cebu, Philippines).
  /// Used when GPS location is unavailable or when showing all Cebu bus stops.
  static CameraPosition getDefaultCameraPosition() {
    return const CameraPosition(
      target: LatLng(10.3157, 123.8854), // Cebu City center
      zoom: 12.0,
    );
  }

  /// Creates a [CameraUpdate] optimized for low-end devices.
  /// 
  /// Uses instant camera update instead of animation for better performance.
  /// 
  /// Parameters:
  /// - [position]: The GPS position to move to
  /// - [zoom]: The zoom level (default: 15.0)
  /// 
  /// Returns a [CameraUpdate] that can be used with [GoogleMapController.moveCamera].
  static CameraUpdate createInstantCameraUpdate(
    Position position, {
    double zoom = 15.0,
  }) {
    return CameraUpdate.newCameraPosition(
      cameraPositionFromPosition(position, zoom: zoom),
    );
  }

  /// Creates a [CameraUpdate] optimized for low-end devices from coordinates.
  /// 
  /// Uses instant camera update instead of animation for better performance.
  /// 
  /// Parameters:
  /// - [latitude]: The latitude coordinate
  /// - [longitude]: The longitude coordinate
  /// - [zoom]: The zoom level (default: 15.0)
  /// 
  /// Returns a [CameraUpdate] that can be used with [GoogleMapController.moveCamera].
  static CameraUpdate createInstantCameraUpdateFromCoordinates(
    double latitude,
    double longitude, {
    double zoom = 15.0,
  }) {
    return CameraUpdate.newCameraPosition(
      cameraPositionFromCoordinates(latitude, longitude, zoom: zoom),
    );
  }
}
