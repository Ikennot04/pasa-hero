import 'package:flutter/material.dart';
import 'nearby_terminal.dart';

/// Scrollable list of nearby stops and terminals
/// Content is hidden by default and appears when user scrolls up
class NearbyStopsCard extends StatelessWidget {
  final ScrollController? scrollController;
  final bool showContent;
  final List<Map<String, dynamic>> terminals;

  const NearbyStopsCard({
    super.key,
    this.scrollController,
    this.showContent = false,
    this.terminals = const <Map<String, dynamic>>[],
  });

  @override
  Widget build(BuildContext context) {
    if (!showContent) {
      return const SizedBox.shrink();
    }

    return Expanded(
      child: AnimatedOpacity(
        duration: const Duration(milliseconds: 300),
        opacity: showContent ? 1.0 : 0.0,
        child: ListView.builder(
          controller: scrollController, // Use the sheet's scroll controller
          physics: const ClampingScrollPhysics(), // Important for DraggableScrollableSheet
          padding: const EdgeInsets.symmetric(horizontal: 16),
          itemCount: terminals.length,
          itemBuilder: (context, index) {
            final terminal = terminals[index];
            return Padding(
              padding: EdgeInsets.only(
                bottom: index == terminals.length - 1 ? 24 : 12,
              ),
              child: NearbyTerminalCard(
                terminalName: terminal['terminalName'] as String,
                location: terminal['location'] as String,
                routes: terminal['routes'] as List<String>,
                distance: terminal['distance'] as String,
                isHighlighted: terminal['isHighlighted'] as bool,
              ),
            );
          },
        ),
      ),
    );
  }
}