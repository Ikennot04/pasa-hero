import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';

/// Loads [buspic.png] for live operator / bus markers on the map.
class OperatorBusIconService {
  OperatorBusIconService._();
  static final OperatorBusIconService instance = OperatorBusIconService._();

  static const String _assetPath = 'assets/images/logo/buspic.png';
  static const String _freeRideAssetPath = 'assets/images/logo/free_ride.png';
  // Keep operator bus marker close to default user-pin visual size.
  static const double _widthLogicalPx = 44;

  BitmapDescriptor? _defaultDescriptor;
  BitmapDescriptor? _freeRideDescriptor;
  bool _loaded = false;

  Future<void> load(BuildContext context) async {
    if (_loaded && _defaultDescriptor != null && _freeRideDescriptor != null) {
      return;
    }
    try {
      _defaultDescriptor = await BitmapDescriptor.asset(
        createLocalImageConfiguration(context),
        _assetPath,
        width: _widthLogicalPx,
      );
    } catch (_) {
      _defaultDescriptor = null;
    }
    try {
      _freeRideDescriptor = await BitmapDescriptor.asset(
        createLocalImageConfiguration(context),
        _freeRideAssetPath,
        width: _widthLogicalPx,
      );
    } catch (_) {
      _freeRideDescriptor = null;
    } finally {
      _loaded = true;
    }
  }

  /// Custom bus bitmap when [load] succeeded; otherwise default orange pin.
  BitmapDescriptor get icon =>
      _defaultDescriptor ??
      BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueOrange);

  /// Free-ride bus bitmap when available; otherwise falls back to [icon].
  BitmapDescriptor get freeRideIcon => _freeRideDescriptor ?? icon;

  BitmapDescriptor iconForOperator({required bool isFreeRide}) =>
      isFreeRide ? freeRideIcon : icon;

  bool get isReady => _loaded;
}
