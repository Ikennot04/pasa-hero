import 'package:flutter/material.dart';

import '../core/services/notification_badge_service.dart';
import '../features/notification/screen/notification_screen.dart';
import '../features/profile/screen/profile_screen.dart';
import '../features/routes/screen/route_screen.dart';

class MainNavigationScreen extends StatefulWidget {
  final Widget nearMeContent;
  final int initialIndex;
  
  const MainNavigationScreen({
    super.key,
    required this.nearMeContent,
    this.initialIndex = 0,
  });

  @override
  State<MainNavigationScreen> createState() => _MainNavigationScreenState();
}

class _MainNavigationScreenState extends State<MainNavigationScreen> {
  late int _selectedIndex;

  late final List<Widget> _screens;
  @override
  void initState() {
    super.initState();
    _selectedIndex = widget.initialIndex.clamp(0, 3).toInt();
    _screens = [
      widget.nearMeContent,
      const RouteScreen(),
      const NotificationScreen(),
      const ProfileScreen(),
    ];
    if (_selectedIndex == 2) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        NotificationBadgeService.instance.notifyNotificationTabOpened();
      });
    }
  }

  void _onItemTapped(int index) {
    setState(() {
      _selectedIndex = index;
    });
    if (index == 2) {
      NotificationBadgeService.instance.notifyNotificationTabOpened();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: IndexedStack(
        index: _selectedIndex,
        children: _screens,
      ),
      bottomNavigationBar: ValueListenableBuilder<bool>(
        valueListenable: NotificationBadgeService.instance.showBadge,
        builder: (context, showNotificationBadge, _) {
          return BottomNavBar(
            currentIndex: _selectedIndex,
            onTap: _onItemTapped,
            showNotificationBadge: showNotificationBadge,
          );
        },
      ),
    );
  }
}

class BottomNavBar extends StatelessWidget {
  final int currentIndex;
  final Function(int) onTap;
  final bool showNotificationBadge;

  const BottomNavBar({
    super.key,
    required this.currentIndex,
    required this.onTap,
    this.showNotificationBadge = false,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: Colors.white,
        border: Border(
          top: BorderSide(
            color: Color(0xFFE5E5E5),
            width: 1,
          ),
        ),
      ),
      child: SafeArea(
        child: Container(
          height: 70,
          padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 4),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              Expanded(
                child: _buildNavItem(
                  icon: Icons.near_me,
                  label: 'Near me',
                  isActive: currentIndex == 0,
                  onTap: () => onTap(0),
                ),
              ),
              Expanded(
                child: _buildNavItem(
                  icon: Icons.route,
                  label: 'Route',
                  isActive: currentIndex == 1,
                  onTap: () => onTap(1),
                ),
              ),
              Expanded(
                child: _buildNavItem(
                  icon: Icons.notifications_outlined,
                  label: 'Notification',
                  isActive: currentIndex == 2,
                  onTap: () => onTap(2),
                  showRedBadge: showNotificationBadge,
                ),
              ),
              Expanded(
                child: _buildNavItem(
                  icon: Icons.account_circle_outlined,
                  label: 'Profile',
                  isActive: currentIndex == 3,
                  onTap: () => onTap(3),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildNavItem({
    required IconData icon,
    required String label,
    required bool isActive,
    required VoidCallback onTap,
    bool showRedBadge = false,
  }) {
    final color = isActive ? const Color(0xFF3B82F6) : const Color(0xFF9CA3AF);
    
    return GestureDetector(
      onTap: onTap,
      behavior: HitTestBehavior.opaque,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 4),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            Stack(
              clipBehavior: Clip.none,
              children: [
                Icon(
                  icon,
                  size: 24,
                  color: color,
                ),
                if (showRedBadge)
                  Positioned(
                    right: -2,
                    top: -2,
                    child: Container(
                      width: 8,
                      height: 8,
                      decoration: const BoxDecoration(
                        color: Color(0xFFEF4444),
                        shape: BoxShape.circle,
                      ),
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 4),
            Flexible(
              child: Text(
                label,
                style: TextStyle(
                  color: color,
                  fontSize: 12,
                  fontWeight: isActive ? FontWeight.w600 : FontWeight.w500,
                ),
                textAlign: TextAlign.center,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
