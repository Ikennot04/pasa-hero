import 'dart:ui' as ui;
import 'package:flutter/services.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';

/// Same as user app: loads custom bus stop sign icon for map markers.
class BusStopIconService {
  static BusStopIconService? _instance;
  static BusStopIconService get instance {
    _instance ??= BusStopIconService._();
    return _instance!;
  }

  BusStopIconService._();

  BitmapDescriptor? _customBusStopIcon;
  bool _iconsLoaded = false;

  /// Same path as user app.
  static const String _iconAssetPath = 'assets/images/logo/bustopSign.png';
  static const String _iconAssetPathFallback = 'assets/images/bustopSign.png';
  /// Decode width for bus stop and route start/end pin bitmaps (px); keep in sync.
  static const int mapMarkerDecodeWidth = 104;

  /// Load the bus stop icon (same as user's loadIcons). Tries user path first, then operator path.
  Future<void> loadIcons() async {
    if (_iconsLoaded) return;

    for (final path in [_iconAssetPath, _iconAssetPathFallback]) {
      try {
        final ByteData iconData = await rootBundle.load(path);
        final Uint8List bytes = iconData.buffer.asUint8List();

        final ui.Codec codec = await ui.instantiateImageCodec(
          bytes,
          targetWidth: mapMarkerDecodeWidth,
        );
        final ui.FrameInfo frameInfo = await codec.getNextFrame();
        final ui.Image image = frameInfo.image;

        final ByteData? resizedData =
            await image.toByteData(format: ui.ImageByteFormat.png);
        if (resizedData != null) {
          final Uint8List resizedBytes = resizedData.buffer.asUint8List();
          _customBusStopIcon = BitmapDescriptor.fromBytes(resizedBytes);
          _iconsLoaded = true;
          print('✅ [BusStopIconService] Bus stop sign loaded (operator): $path');
          return;
        }
      } catch (e) {
        print('⚠️ [BusStopIconService] Try $path: $e');
      }
    }

    print('⚠️ [BusStopIconService] Using fallback orange marker');
    _customBusStopIcon = BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueOrange);
    _iconsLoaded = true;
  }

  BitmapDescriptor get defaultIcon {
    if (!_iconsLoaded) {
      return BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueOrange);
    }
    return _customBusStopIcon ??
        BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueOrange);
  }

  bool get isLoaded => _iconsLoaded;
}
