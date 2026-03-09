import 'package:flutter/material.dart';
import '../../../shared/bottom_navBar.dart';
import '../../map/map.dart';
import '../Module/free_ride.dart';
import '../Module/nearby_terminal.dart';

class NearMeScreen extends StatelessWidget {
  const NearMeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return MainNavigationScreen(
      nearMeContent: const _NearMeContent(),
    );
  }
}

class _NearMeContent extends StatefulWidget {
  const _NearMeContent();

  @override
  State<_NearMeContent> createState() => _NearMeContentState();
}

class _NearMeContentState extends State<_NearMeContent> {
  final TextEditingController _searchController = TextEditingController();
  late DraggableScrollableController _sheetController;
  bool _showFreeRideDetails = false;
  double _sheetExtent = 0.38;
  bool _showFreeRide = true;
  bool _showStopsContent = true; // Show list on load (initial size 0.38); listener updates when user drags
  static const double _minSheetExtent = 0.10; // 10% peek so user sees swipe hint

  void _updateFromSheetExtent(double extent) {
    setState(() {
      _sheetExtent = extent;
      _showFreeRide = extent > _minSheetExtent && extent < 0.70;
      _showStopsContent = extent > 0.15;
    });
  }

  @override
  void initState() {
    super.initState();
    _sheetController = DraggableScrollableController();
    _sheetController.addListener(() => _updateFromSheetExtent(_sheetController.size));
    // Sync state after first frame so list is visible on load (listener may not fire until user drags)
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) _updateFromSheetExtent(_sheetController.size);
    });
  }

  @override
  void dispose() {
    _sheetController.dispose();
    _searchController.dispose();
    super.dispose();
  }

  /// Builds the scrollable list of terminals
  Widget _buildTerminalsList(ScrollController scrollController) {
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

    return SliverList(
      delegate: SliverChildBuilderDelegate(
        (context, index) {
          final terminal = terminals[index];
          return Padding(
            padding: EdgeInsets.only(
              bottom: index == terminals.length - 1 ? 24 : 12,
              left: 16,
              right: 16,
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
        childCount: terminals.length,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Stack(
        children: [
          // 🔹 Map background
          const Positioned.fill(
            child: MapWidget(),
          ),

          // 🔹 Search bar (top floating pill)
          // Positioned(
          //   top: 0,
          //   left: 0,
          //   right: 0,
          //   child: SafeArea(
          //     bottom: false,
          //     child: Padding(
          //       padding: const EdgeInsets.fromLTRB(16, 32, 16, 8),
          //       child: AppSearchBar(
          //         controller: _searchController,
          //         hintText: 'Where you going',
          //         onChanged: (_) {},
          //       ),
          //     ),
          //   ),
          // ),

           // 🔹 Free Ride banner (floating above bottom sheet, follows sheet movement with fade animation)
          // Only show when sheet is visible (not at 0)
          // Use IgnorePointer to ensure it doesn't block sheet dragging
          if (_sheetExtent > 0.0)
            Positioned(
              left: 16,
              right: 16,
              bottom: (_sheetExtent * MediaQuery.of(context).size.height) + 16,
              child: IgnorePointer(
                ignoring: false, // Allow banner interactions
                child: AnimatedOpacity(
                  duration: const Duration(milliseconds: 350),
                  curve: Curves.easeInOut,
                  opacity: _showFreeRide ? 1.0 : 0.0,
                  child: IgnorePointer(
                    ignoring: !_showFreeRide,
                    child: FreeRideBanner(
                      showDetails: _showFreeRideDetails,
                      onViewTap: () {
                        setState(() {
                          _showFreeRideDetails = !_showFreeRideDetails;
                        });
                      },
                      onClose: () {
                        setState(() {
                          _showFreeRideDetails = false;
                        });
                      },
                    ),
                  ),
                ),
              ),
            ),


           // 🔹 Bottom draggable sheet - min 10% so user always sees swipe hint
          DraggableScrollableSheet(
            controller: _sheetController,
            initialChildSize: 0.38,
            minChildSize: _minSheetExtent, // 10% peek with swipe icon
            maxChildSize: 0.85,
            snap: true, // Enable snapping to sizes
            snapSizes: const [_minSheetExtent, 0.38, 0.85], // Snap: peek, initial, max
            builder: (context, scrollController) {
              return Container(
                decoration: const BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.vertical(
                    top: Radius.circular(24),
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black12,
                      blurRadius: 12,
                      offset: Offset(0, -4),
                    ),
                  ],
                ),
                child: CustomScrollView(
                  controller: scrollController, // Use sheet's scroll controller for entire content
                  physics: const ClampingScrollPhysics(), // Important for DraggableScrollableSheet
                  slivers: [
                    // 🔹 Drag handle + swipe hint icon (always visible so user knows they can swipe)
                    SliverToBoxAdapter(
                      child: Container(
                        width: double.infinity,
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        child: Center(
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              // Always show arrow: up when minimized, down when card is up
                              Icon(
                                _sheetExtent <= _minSheetExtent + 0.02
                                    ? Icons.keyboard_arrow_up_rounded
                                    : Icons.keyboard_arrow_down_rounded,
                                size: 28,
                                color: Colors.grey.shade600,
                              ),
                              const SizedBox(height: 4),
                              Container(
                                width: 40,
                                height: 4,
                                decoration: BoxDecoration(
                                  color: Colors.grey.shade300,
                                  borderRadius: BorderRadius.circular(2),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),

                    // 🔹 Title - only show when sheet is above minimum threshold
                    if (_sheetExtent > 0.15)
                      SliverToBoxAdapter(
                        child: const Padding(
                          padding: EdgeInsets.symmetric(horizontal: 16),
                          child: Text(
                            'Nearby Stops and Terminal',
                            style: TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                      ),

                    if (_sheetExtent > 0.15)
                      const SliverToBoxAdapter(
                        child: SizedBox(height: 12),
                      ),

                    // 🔹 List - Scrollable list of terminals (shown when sheet is up so user sees data on load)
                    if (_sheetExtent > 0.15 && _showStopsContent)
                      _buildTerminalsList(scrollController),
                  ],
                ),
              );
            },
          ),
        ],
      ),
    );
  }
}
