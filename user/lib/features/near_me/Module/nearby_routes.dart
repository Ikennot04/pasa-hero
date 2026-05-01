import 'package:flutter/material.dart';

class NearbyRouteItem extends StatelessWidget {
  final String routeNumber;
  final String routeName;
  final String viaText;
  final String arrivalTime;

  const NearbyRouteItem({
    super.key,
    required this.routeNumber,
    required this.routeName,
    required this.viaText,
    required this.arrivalTime,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 4,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: const Color(0xFF3B82F6),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Center(
              child: Text(
                routeNumber,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  routeName,
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                    color: Color(0xFF1F2937),
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  viaText,
                  style: const TextStyle(
                    fontSize: 12,
                    color: Color(0xFF6B7280),
                  ),
                ),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
            decoration: BoxDecoration(
              color: const Color(0xFF10B981).withOpacity(0.1),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Text(
              arrivalTime,
              style: const TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: Color(0xFF10B981),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class NearbyRoutesList extends StatelessWidget {
  final List<NearbyRouteData> routes;
  final String title;

  const NearbyRoutesList({
    super.key,
    this.routes = const <NearbyRouteData>[],
    this.title = 'Nearby Routes',
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          child: Text(
            title,
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w600,
              color: Color(0xFF1F2937),
            ),
          ),
        ),
        if (routes.isEmpty)
          const Padding(
            padding: EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Text(
              'No route data available.',
              style: TextStyle(
                fontSize: 14,
                color: Color(0xFF6B7280),
              ),
            ),
          )
        else
          ...routes.map(
            (route) => NearbyRouteItem(
              routeNumber: route.routeNumber,
              routeName: route.routeName,
              viaText: route.viaText,
              arrivalTime: route.arrivalTime,
            ),
          ),
      ],
    );
  }
}

class NearbyRouteData {
  final String routeNumber;
  final String routeName;
  final String viaText;
  final String arrivalTime;

  const NearbyRouteData({
    required this.routeNumber,
    required this.routeName,
    required this.viaText,
    required this.arrivalTime,
  });
}
