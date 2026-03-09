import 'package:flutter/material.dart';
import 'map_screen.dart';

/// Widget wrapper for the map screen.
/// 
/// This widget can be used throughout the app to display the map.
/// It simply wraps the [MapScreen] widget.
class MapWidget extends StatelessWidget {
  const MapWidget({super.key});

  @override
  Widget build(BuildContext context) {
    return const MapScreen();
  }
}
