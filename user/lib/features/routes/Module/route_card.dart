import 'package:flutter/material.dart';
import '../../../core/themes/validation_theme.dart';
import '../screen/route_details_screen.dart';
import 'follow_button.dart';

class RouteCard extends StatelessWidget {
  final String routeId;
  final String estimatedTime;
  final String routeDescription;
  final String? status; // 'Free-flow', 'Light traffic', 'Heavy traffic'
  final bool showFollowButton;
  final bool isFollowing;
  final int activeBuses;

  const RouteCard({
    super.key,
    required this.routeId,
    required this.estimatedTime,
    required this.routeDescription,
    this.status,
    this.showFollowButton = false,
    this.isFollowing = false,
    this.activeBuses = 0,
  });

  Color _getStatusColor() {
    switch (status) {
      case 'Free-flow':
        return ValidationTheme.successGreen;
      case 'Light traffic':
        return const Color(0xFFFF9800); // Orange
      case 'Heavy traffic':
        return ValidationTheme.errorRed;
      default:
        return ValidationTheme.primaryBlue;
    }
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () {
        Navigator.of(context).push(
          MaterialPageRoute(
            builder: (context) => RouteDetailsScreen(
              routeId: routeId,
              estimatedArrival: estimatedTime.replaceAll('Estimated: ', ''),
              status: status,
              routeDescription: routeDescription,
            ),
          ),
        );
      },
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: ValidationTheme.backgroundWhite,
          borderRadius: BorderRadius.circular(12),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.04),
              blurRadius: 3,
              offset: const Offset(0, 1),
            ),
          ],
        ),
        child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Route Identifier
                    Text(
                      routeId,
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                        color: ValidationTheme.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 4),
                    // Estimated Time
                    Text(
                      estimatedTime,
                      style: const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.normal,
                        color: ValidationTheme.textSecondary,
                      ),
                    ),
                    const SizedBox(height: 8),
                    // Route Description
                    Text(
                      routeDescription,
                      style: const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w600,
                        color: ValidationTheme.textPrimary,
                      ),
                    ),
                  ],
                ),
              ),
              // Status Button or Follow Button
              if (status != null)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: _getStatusColor().withOpacity(0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    status!,
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: _getStatusColor(),
                    ),
                  ),
                ),
              if (showFollowButton && status == null)
                FollowButton(
                  onPressed: () {},
                  isFollowing: isFollowing,
                ),
              if (showFollowButton && status != null)
                Container(
                  margin: const EdgeInsets.only(left: 8),
                  child: FollowButton(
                    onPressed: () {},
                    isFollowing: isFollowing,
                  ),
                ),
            ],
          ),
          const SizedBox(height: 12),
          // Active Buses Count
          Text(
            'Active: $activeBuses Bus${activeBuses != 1 ? 'es' : ''}',
            style: const TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.normal,
              color: ValidationTheme.textPrimary,
            ),
          ),
        ],
      ),
      ),
    );
  }
}
