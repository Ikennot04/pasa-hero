import 'package:flutter/material.dart';
import '../../../core/themes/validation_theme.dart';
import '../route_constants.dart';
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
  /// Backend Mongo user id (for `/api/user-subscriptions/`).
  final String? backendUserId;
  /// Backend Mongo route id (for `/api/user-subscriptions/`).
  final String? backendRouteId;
  final String followRouteCode;
  final void Function(String routeCode, bool isFollowing)? onFollowChanged;

  const RouteCard({
    super.key,
    required this.routeId,
    required this.estimatedTime,
    required this.routeDescription,
    this.status,
    this.showFollowButton = false,
    this.isFollowing = false,
    this.activeBuses = 0,
    this.backendUserId,
    this.backendRouteId,
    this.followRouteCode = '',
    this.onFollowChanged,
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
    void openRouteDetails() {
      Navigator.of(context).push(
        MaterialPageRoute(
          builder: (context) => RouteDetailsScreen(
            routeCode: followRouteCode.trim(),
            routeId: routeId,
            estimatedArrival: estimatedTime.replaceAll('Estimated: ', ''),
            status: status,
            routeDescription: routeDescription,
          ),
        ),
      );
    }

    return Container(
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
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: GestureDetector(
                  behavior: HitTestBehavior.opaque,
                  onTap: openRouteDetails,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        routeId,
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                          color: ValidationTheme.textPrimary,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        estimatedTime,
                        style: const TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.normal,
                          color: ValidationTheme.textSecondary,
                        ),
                      ),
                      const SizedBox(height: 8),
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
              ),
              if (status != null)
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
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
                  userId: backendUserId,
                  routeId: backendRouteId,
                  isFollowing: isFollowing,
                  routeLabel: followRouteCode,
                  onFollowChanged: onFollowChanged,
                ),
              if (showFollowButton && status != null)
                Container(
                  margin: const EdgeInsets.only(left: 8),
                  child: FollowButton(
                    userId: backendUserId,
                    routeId: backendRouteId,
                    isFollowing: isFollowing,
                    routeLabel: followRouteCode,
                    onFollowChanged: onFollowChanged,
                  ),
                ),
            ],
          ),
          const SizedBox(height: 12),
          GestureDetector(
            behavior: HitTestBehavior.opaque,
            onTap: openRouteDetails,
            child: Text(
              '$kActiveLabelPrefix$activeBuses Bus${activeBuses != 1 ? 'es' : ''}',
              style: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.normal,
                color: ValidationTheme.textPrimary,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
