import 'dart:ui' as ui;

import 'package:flutter/services.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';

import 'waiting_user_clustering.dart';

/// Loads and caches resized cluster marker bitmaps for the map.
class WaitingClusterIconCache {
  WaitingClusterIconCache._();

  static BitmapDescriptor? _green;
  static BitmapDescriptor? _yellow;
  static BitmapDescriptor? _red;

  static bool get isReady =>
      _green != null && _yellow != null && _red != null;

  static Future<void> ensureLoaded({int targetWidth = 72}) async {
    if (isReady) return;
    _green = await _load(WaitingDemandTier.green.assetPath, targetWidth);
    _yellow = await _load(WaitingDemandTier.yellow.assetPath, targetWidth);
    _red = await _load(WaitingDemandTier.red.assetPath, targetWidth);
  }

  static BitmapDescriptor? iconFor(WaitingDemandTier tier) {
    switch (tier) {
      case WaitingDemandTier.green:
        return _green;
      case WaitingDemandTier.yellow:
        return _yellow;
      case WaitingDemandTier.red:
        return _red;
    }
  }

  static Future<BitmapDescriptor> _load(String path, int width) async {
    final data = await rootBundle.load(path);
    final bytes = data.buffer.asUint8List();
    final codec = await ui.instantiateImageCodec(bytes, targetWidth: width);
    final frame = await codec.getNextFrame();
    final pngBytes = await frame.image.toByteData(format: ui.ImageByteFormat.png);
    return BitmapDescriptor.bytes(pngBytes!.buffer.asUint8List());
  }
}
