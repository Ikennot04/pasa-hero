import 'package:flutter/material.dart';

/// Near Me floating banner when Firestore `driver_status` shows an active free ride.
class FreeRideBanner extends StatelessWidget {
  final bool showDetails;
  /// Route / jeepney code from Firestore (`route_id`, or `route_code` / `routeCode`).
  final String? routeCode;
  /// Optional friendly name from local route list (API), if known.
  final String? routeDisplayName;
  /// `free_ride_until` from Firestore, when set.
  final DateTime? freeRideUntil;
  final VoidCallback? onViewTap;
  final VoidCallback? onClose;

  const FreeRideBanner({
    super.key,
    this.showDetails = false,
    this.routeCode,
    this.routeDisplayName,
    this.freeRideUntil,
    this.onViewTap,
    this.onClose,
  });

  String _formatDateTime(DateTime d) {
    final y = d.year;
    final m = d.month.toString().padLeft(2, '0');
    final day = d.day.toString().padLeft(2, '0');
    final h = d.hour.toString().padLeft(2, '0');
    final min = d.minute.toString().padLeft(2, '0');
    return '$y-$m-$day $h:$min';
  }

  String _routeSummaryLine() {
    final code = routeCode?.trim();
    final name = routeDisplayName?.trim();
    if (code != null && code.isNotEmpty) {
      if (name != null &&
          name.isNotEmpty &&
          name.toUpperCase() != code.toUpperCase()) {
        return '$name · $code';
      }
      return 'Route $code';
    }
    return 'Free ride is active';
  }

  String _untilLine() {
    final u = freeRideUntil;
    if (u == null) return 'End time not set by the driver.';
    return 'Ride free until ${_formatDateTime(u)}';
  }

  @override
  Widget build(BuildContext context) {
    if (showDetails) {
      return _buildDetailedBanner();
    }
    return _buildSimpleBanner();
  }

  Widget _buildSimpleBanner() {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.1),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            width: 56,
            height: 56,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(12),
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(12),
              child: Image.asset(
                'assets/images/logo/free_ride.png',
                width: 56,
                height: 56,
                fit: BoxFit.cover,
                errorBuilder: (context, error, stackTrace) {
                  return Container(
                    color: const Color(0xFF3B82F6),
                    child: const Icon(
                      Icons.directions_bus,
                      color: Colors.white,
                      size: 32,
                    ),
                  );
                },
              ),
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Free Ride Ongoing',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF1F2937),
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  _routeSummaryLine(),
                  style: TextStyle(
                    fontSize: 13,
                    color: Colors.grey[600],
                    fontWeight: FontWeight.w500,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  _untilLine(),
                  style: TextStyle(
                    fontSize: 12,
                    color: Colors.grey[600],
                  ),
                ),
              ],
            ),
          ),
          if (onViewTap != null)
            Container(
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(33.17),
                gradient: const LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [
                    Color(0xFF0062CA),
                    Color(0xFF0051A7),
                    Color(0xFF004084),
                  ],
                  stops: [0.0, 0.6938, 0.9056],
                ),
              ),
              child: Material(
                color: Colors.transparent,
                child: InkWell(
                  onTap: onViewTap,
                  borderRadius: BorderRadius.circular(33.17),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 9.21,
                      vertical: 9.21,
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const SizedBox(width: 9.21),
                        const Text(
                          'View',
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                            color: Colors.white,
                          ),
                        ),
                        const SizedBox(width: 9.21),
                      ],
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildDetailedBanner() {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.1),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Row(
                children: [
                  Container(
                    width: 48,
                    height: 48,
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(12),
                      child: Image.asset(
                        'assets/images/logo/free_ride.png',
                        width: 48,
                        height: 48,
                        fit: BoxFit.cover,
                        errorBuilder: (context, error, stackTrace) {
                          return Container(
                            color: const Color(0xFF3B82F6),
                            child: const Icon(
                              Icons.directions_bus,
                              color: Colors.white,
                              size: 28,
                            ),
                          );
                        },
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Free Ride Ongoing',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF1F2937),
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          _routeSummaryLine(),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            fontSize: 12,
                            color: Color(0xFF6B7280),
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          _untilLine(),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            fontSize: 12,
                            color: Color(0xFF6B7280),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              ),
              if (onClose != null)
                IconButton(
                  icon: const Icon(Icons.close, size: 20),
                  onPressed: onClose,
                  color: Colors.grey[600],
                ),
            ],
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Container(
                width: 8,
                height: 8,
                decoration: const BoxDecoration(
                  color: Color(0xFF10B981),
                  shape: BoxShape.circle,
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  _routeSummaryLine(),
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: Color(0xFF1F2937),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          _buildInfoItem(
            icon: Icons.access_time,
            text: _untilLine(),
            color: const Color(0xFF6B7280),
          ),
          const SizedBox(height: 8),
          _buildInfoItem(
            icon: Icons.people,
            text: 'Coverage: All passengers',
            color: const Color(0xFF6B7280),
          ),
          const SizedBox(height: 8),
          _buildInfoItem(
            icon: Icons.circle,
            text: 'Status: Ongoing',
            color: const Color(0xFF10B981),
          ),
        ],
      ),
    );
  }

  Widget _buildInfoItem({
    required IconData icon,
    required String text,
    required Color color,
  }) {
    return Row(
      children: [
        Icon(icon, size: 14, color: color),
        const SizedBox(width: 6),
        Expanded(
          child: Text(
            text,
            style: TextStyle(
              fontSize: 12,
              color: color,
              fontWeight: FontWeight.w500,
            ),
          ),
        ),
      ],
    );
  }
}
