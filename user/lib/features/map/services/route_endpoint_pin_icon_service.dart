import 'dart:ui' as ui;

import 'package:flutter/services.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';

import 'bus_stop_icon_service.dart';

/// Red map pin for route **start** and **end** (same asset for both) — `assets/images/map_pins.png`.
/// Decoded at [BusStopIconService.mapMarkerDecodeWidth] so size matches bus stop markers.
class RouteEndpointPinIconService {
  RouteEndpointPinIconService._();
  static final RouteEndpointPinIconService instance = RouteEndpointPinIconService._();

  static const String assetPath = 'assets/images/map_pins.png';

  BitmapDescriptor? _descriptor;

  Future<void> load() async {
    if (_descriptor != null) return;
    try {
      final ByteData iconData = await rootBundle.load(assetPath);
      final Uint8List bytes = iconData.buffer.asUint8List();

      final ui.Codec codec = await ui.instantiateImageCodec(
        bytes,
        targetWidth: BusStopIconService.mapMarkerDecodeWidth,
      );
      final ui.FrameInfo frameInfo = await codec.getNextFrame();
      final ui.Image image = frameInfo.image;

      final ByteData? resizedData =
          await image.toByteData(format: ui.ImageByteFormat.png);
      if (resizedData == null) {
        _descriptor = null;
        return;
      }
      _descriptor = BitmapDescriptor.fromBytes(
        resizedData.buffer.asUint8List(),
      );
    } catch (_) {
      _descriptor = null;
    }
  }

  BitmapDescriptor get descriptor =>
      _descriptor ??
      BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueRed);
}
