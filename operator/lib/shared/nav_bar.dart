import 'package:flutter/material.dart';
import '../../core/services/operator_location_sync_service.dart';
import '../../features/profile/screen/profile_screen_data.dart';
import '../../features/profile/profile_screen.dart';
import '../../features/route/route_screen.dart';

/// Shell screen with bottom navigation between Routes and Profile.
class NavBar extends StatefulWidget {
  const NavBar({super.key});

  static const String routeName = '/home';

  @override
  State<NavBar> createState() => _NavBarState();
}

class _NavBarState extends State<NavBar> {
  int _currentIndex = 0;
  String? _routeCode;

  static const List<Widget> _screens = [
    RouteScreen(),
    ProfileScreen(),
  ];

  @override
  void initState() {
    super.initState();
    OperatorLocationSyncService.instance.start();
    _loadRouteCode();
  }

  Future<void> _loadRouteCode() async {
    final code = (await ProfileDataService.getOperatorRouteCode())?.trim();
    if (!mounted) return;
    setState(() {
      _routeCode = (code == null || code.isEmpty) ? null : code;
    });
  }

  @override
  void dispose() {
    OperatorLocationSyncService.instance.stop();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: IndexedStack(
        index: _currentIndex,
        children: _screens,
      ),
      bottomNavigationBar: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (_routeCode != null)
            Align(
              alignment: Alignment.centerRight,
              child: Padding(
                padding: const EdgeInsets.only(right: 24, bottom: 4),
                child: Text(
                  'Route: $_routeCode',
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: Colors.blueGrey,
                  ),
                ),
              ),
            ),
          BottomNavigationBar(
            currentIndex: _currentIndex,
            onTap: (index) => setState(() => _currentIndex = index),
            selectedItemColor: Colors.blue,
            unselectedItemColor: Colors.grey,
            items: const [
              BottomNavigationBarItem(
                icon: Icon(Icons.route),
                label: 'Routes',
              ),
              BottomNavigationBarItem(
                icon: Icon(Icons.person),
                label: 'Profile',
              ),
            ],
          ),
        ],
      ),
    );
  }
}
