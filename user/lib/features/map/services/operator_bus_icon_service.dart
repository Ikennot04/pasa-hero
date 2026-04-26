import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';

/// Loads [buspic.png] for live operator / bus markers on the map.
class OperatorBusIconService {
  OperatorBusIconService._();
  static final OperatorBusIconService instance = OperatorBusIconService._();

  static const String _assetPath = 'assets/images/logo/buspic.png';
  // Keep operator bus marker close to default user-pin visual size.
  static const double _widthLogicalPx = 44;

  BitmapDescriptor? _descriptor;
  bool _loaded = false;

  Future<void> load(BuildContext context) async {
    if (_loaded) return;
    try {
      _descriptor = await BitmapDescriptor.asset(
        createLocalImageConfiguration(context),
        _assetPath,
        width: _widthLogicalPx,
      );
    } catch (_) {
      _descriptor = null;
    } finally {
      _loaded = true;
    }
  }

  /// Custom bus bitmap when [load] succeeded; otherwise default orange pin.
  BitmapDescriptor get icon =>
      _descriptor ?? BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueOrange);

  bool get isReady => _loaded;
}
