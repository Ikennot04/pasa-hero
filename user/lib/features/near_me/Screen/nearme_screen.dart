import 'package:flutter/material.dart';
import '../../../shared/bottom_navBar.dart';
import '../../../shared/search_bar.dart';
import '../../map/map.dart';
import '../Module/nearby_terminal.dart';
import '../Module/free_ride.dart';

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

  @override
  void initState() {
    super.initState();
    _sheetController = DraggableScrollableController();
    _sheetController.addListener(() {
      final extent = _sheetController.size;
      
      setState(() {
        _sheetExtent = extent;
        _showFreeRide = extent < 0.70;
      });
    });
  }

  @override
  void dispose() {
    _sheetController.dispose();
    _searchController.dispose();
    super.dispose();
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
          Positioned(
            top: 0,
            left: 0,
            right: 0,
            child: SafeArea(
              bottom: false,
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 32, 16, 8),
                child: AppSearchBar(
                  controller: _searchController,
                  hintText: 'Where you going',
                  onChanged: (_) {},
                ),
              ),
            ),
          ),

           // 🔹 Free Ride banner (floating above bottom sheet, follows sheet movement with fade animation)
          Positioned(
            left: 16,
            right: 16,
            bottom: (_sheetExtent * MediaQuery.of(context).size.height) + 16,
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


           // 🔹 Bottom draggable sheet
          DraggableScrollableSheet(
            controller: _sheetController,
            initialChildSize: 0.38,
            minChildSize: 0.30,
            maxChildSize: 0.85,
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
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // 🔹 Drag handle
                    Center(
                      child: Container(
                        margin: const EdgeInsets.symmetric(vertical: 12),
                        width: 40,
                        height: 4,
                        decoration: BoxDecoration(
                          color: Colors.grey.shade300,
                          borderRadius: BorderRadius.circular(2),
                        ),
                      ),
                    ),

                    // 🔹 Title
                    const Padding(
                      padding: EdgeInsets.symmetric(horizontal: 16),
                      child: Text(
                        'Nearby Stops and Terminal',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),

                    const SizedBox(height: 12),

                    // 🔹 List
                    Expanded(
                      child: ListView(
                        controller: scrollController,
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                        children: const [
                          NearbyTerminalCard(
                            terminalName: 'Pacific Terminal',
                            location: 'Pacific Mall, Mandaue',
                            routes: ['01K', '13B', '01F', '46E'],
                            distance: '0.6 Km',
                            isHighlighted: true,
                          ),
                          SizedBox(height: 12),
                          NearbyTerminalCard(
                            terminalName: 'Marpa',
                            location: 'Maguikay, Mandaue City',
                            routes: ['01K', '13B', '01F', '46E'],
                            distance: '0.6 Km',
                            isHighlighted: false,
                          ),
                          SizedBox(height: 12),
                          NearbyTerminalCard(
                            terminalName: 'Jmall',
                            location: 'Jmall, Mandaue City',
                            routes: ['01K', '13B', '01F', '46E'],
                            distance: '0.7 Km',
                            isHighlighted: false,
                          ),
                          SizedBox(height: 24),
                        ],
                      ),
                    ),
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
