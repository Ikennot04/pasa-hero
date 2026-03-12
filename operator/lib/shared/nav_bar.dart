import 'package:flutter/material.dart';
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

  static const List<Widget> _screens = [
    RouteScreen(),
    ProfileScreen(),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: IndexedStack(
        index: _currentIndex,
        children: _screens,
      ),
      bottomNavigationBar: BottomNavigationBar(
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
    );
  }
}
