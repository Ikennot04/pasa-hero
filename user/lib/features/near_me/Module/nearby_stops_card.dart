import 'package:flutter/material.dart';
import 'nearby_terminal.dart';

/// Scrollable list of nearby stops and terminals
/// Content is hidden by default and appears when user scrolls up
class NearbyStopsCard extends StatelessWidget {
  final ScrollController? scrollController;
  final bool showContent;

  const NearbyStopsCard({
    super.key,
    this.scrollController,
    this.showContent = false,
  });

  @override
  Widget build(BuildContext context) {
    // Sample data - replace with actual data from your backend/state
    final terminals = [
      {
        'terminalName': 'Pacific Terminal',
        'location': 'Pacific Mall, Mandaue',
        'routes': ['01K', '13B', '01F', '46E'],
        'distance': '0.6 Km',
        'isHighlighted': true,
      },
      {
        'terminalName': 'Marpa',
        'location': 'Maguikay, Mandaue City',
        'routes': ['01K', '13B', '01F', '46E'],
        'distance': '0.6 Km',
        'isHighlighted': false,
      },
      {
        'terminalName': 'Jmall',
        'location': 'Jmall, Mandaue City',
        'routes': ['01K', '13B', '01F', '46E'],
        'distance': '0.7 Km',
        'isHighlighted': false,
      },
      {
        'terminalName': 'Ayala Terminal',
        'location': 'Ayala Center, Cebu City',
        'routes': ['02A', '04B', '12C'],
        'distance': '1.2 Km',
        'isHighlighted': false,
      },
      {
        'terminalName': 'SM Terminal',
        'location': 'SM City, Cebu',
        'routes': ['03D', '05E', '08F'],
        'distance': '1.5 Km',
        'isHighlighted': false,
      },
    ];

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