import 'package:geolocator/geolocator.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';

/// Map utilities for the operator app (same defaults as user app).
class MapService {
  static MapType getDefaultMapType() => MapType.normal;

  static CameraPosition getDefaultCameraPosition() {
    return const CameraPosition(
      target: LatLng(10.3157, 123.8854),
      zoom: 12.0,
    );
  }

  static CameraPosition cameraPositionFromLatLng(double lat, double lng, {double zoom = 15.0}) {
    return CameraPosition(
      target: LatLng(lat, lng),
      zoom: zoom,
    );
  }

  /// Creates a camera position from a Position object.
  static CameraPosition cameraPositionFromPosition(Position position, {double zoom = 15.0}) {
    return CameraPosition(
      target: LatLng(position.latitude, position.longitude),
      zoom: zoom,
    );
  }

  /// Creates a camera update to move to a position (instant, no animation).
  static CameraUpdate createInstantCameraUpdate(Position position, {double zoom = 15.0}) {
    return CameraUpdate.newCameraPosition(
      cameraPositionFromPosition(position, zoom: zoom),
    );
  }

  /// Creates a camera update to animate to a position.
  static CameraUpdate createCameraUpdate(Position position, {double zoom = 15.0}) {
    return CameraUpdate.newCameraPosition(
      cameraPositionFromPosition(position, zoom: zoom),
    );
  }
}
