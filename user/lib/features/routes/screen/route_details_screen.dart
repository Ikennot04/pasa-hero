import 'package:flutter/material.dart';
import '../../../core/themes/validation_theme.dart';
import '../../map/map.dart';

class RouteDetailsScreen extends StatelessWidget {
  final String routeId;
  final String estimatedArrival;
  final String? status;
  final String routeDescription;

  const RouteDetailsScreen({
    super.key,
    required this.routeId,
    required this.estimatedArrival,
    this.status,
    this.routeDescription = 'Tamiya to Plaza Independencia',
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
    final screenWidth = MediaQuery.of(context).size.width;

    return Scaffold(
      body: Container(
        width: double.infinity,
        height: double.infinity,
        decoration: ValidationTheme.gradientDecoration,
        child: SafeArea(
          child: Column(
            children: [
              // Header Section
              Container(
                padding: EdgeInsets.symmetric(
                  horizontal: screenWidth * 0.05,
                  vertical: 16,
                ),
                child: Stack(
                  children: [
                    // Back button
                    Align(
                      alignment: Alignment.centerLeft,
                      child: IconButton(
                        onPressed: () => Navigator.of(context).pop(),
                        icon: Container(
                          width: 40,
                          height: 40,
                          decoration: BoxDecoration(
                            color: ValidationTheme.backgroundWhite,
                            shape: BoxShape.circle,
                            boxShadow: [
                              BoxShadow(
                                color: Colors.black.withOpacity(0.1),
                                blurRadius: 4,
                                offset: const Offset(0, 2),
                              ),
                            ],
                          ),
                          child: const Icon(
                            Icons.arrow_back,
                            color: ValidationTheme.textPrimary,
                            size: 20,
                          ),
                        ),
                      ),
                    ),
                    // Title and subtitle
                    Center(
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            routeId,
                            style: const TextStyle(
                              fontSize: 22,
                              fontWeight: FontWeight.w700,
                              color: Color.fromARGB(255, 255, 251, 251),
                            ),
                            textAlign: TextAlign.center,
                          ),
                          const SizedBox(height: 4),
                          Text(
                            'Estimated Arrival: $estimatedArrival',
                            style: const TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.normal,
                              color: Color.fromARGB(255, 250, 250, 250),
                            ),
                            textAlign: TextAlign.center,
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),

              // Status Button
              if (status != null)
                Container(
                  margin: const EdgeInsets.only(bottom: 16),
                  padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 8),
                  decoration: BoxDecoration(
                    color: _getStatusColor(),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    status!,
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: ValidationTheme.textLight,
                    ),
                  ),
                ),

              // Map Section
              Container(
                height: 300,
                margin: EdgeInsets.symmetric(horizontal: screenWidth * 0.05),
                decoration: BoxDecoration(
                  color: ValidationTheme.borderLight,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(12),
                  child: const MapWidget(),
                ),
              ),

              const SizedBox(height: 16),

              // Route Stops Section
              Expanded(
                child: Container(
                  width: double.infinity,
                  decoration: const BoxDecoration(
                    color: ValidationTheme.backgroundWhite,
                    borderRadius: BorderRadius.only(
                      topLeft: Radius.circular(20),
                      topRight: Radius.circular(20),
                    ),
                  ),
                  child: SingleChildScrollView(
                    padding: EdgeInsets.symmetric(horizontal: screenWidth * 0.05),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const SizedBox(height: 24),
                        _buildRouteStop(
                          isFirst: true,
                          isLast: false,
                          stopName: 'Tamiya Terminal',
                          stopAddress: null,
                          arrivalTime: null,
                          isActive: false,
                          icon: Icons.directions_bus,
                        ),
                        _buildRouteStop(
                          isFirst: false,
                          isLast: false,
                          stopName: 'University of Cebu - Lapu-lapu & Mandaue',
                          stopAddress: null,
                          arrivalTime: 'Arriving in 7 min',
                          isActive: true,
                          icon: Icons.directions_bus,
                        ),
                        _buildRouteStop(
                          isFirst: false,
                          isLast: false,
                          stopName: 'DPWH',
                          stopAddress: 'A.C Cortes Ave',
                          arrivalTime: null,
                          isActive: false,
                          icon: null,
                        ),
                        _buildRouteStop(
                          isFirst: false,
                          isLast: false,
                          stopName: 'Parkmall',
                          stopAddress: 'Reclamation Area, Mandaue City',
                          arrivalTime: null,
                          isActive: false,
                          icon: null,
                        ),
                        _buildRouteStop(
                          isFirst: false,
                          isLast: false,
                          stopName: 'Pier 5',
                          stopAddress: 'Cebu City',
                          arrivalTime: null,
                          isActive: false,
                          icon: null,
                        ),
                        _buildRouteStop(
                          isFirst: false,
                          isLast: false,
                          stopName: 'Pier 4',
                          stopAddress: 'Cebu City',
                          arrivalTime: null,
                          isActive: false,
                          icon: null,
                        ),
                        _buildRouteStop(
                          isFirst: false,
                          isLast: false,
                          stopName: 'Pier 3',
                          stopAddress: 'Cebu City',
                          arrivalTime: null,
                          isActive: false,
                          icon: null,
                        ),
                        _buildRouteStop(
                          isFirst: false,
                          isLast: true,
                          stopName: 'Plaza Independencia',
                          stopAddress: 'Cebu City',
                          arrivalTime: null,
                          isActive: false,
                          icon: Icons.location_on,
                          isDestination: true,
                        ),
                        const SizedBox(height: 24),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildRouteStop({
    required bool isFirst,
    required bool isLast,
    required String stopName,
    String? stopAddress,
    String? arrivalTime,
    required bool isActive,
    IconData? icon,
    bool isDestination = false,
  }) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Timeline indicator
        Column(
          children: [
            if (!isFirst)
              Container(
                width: 2,
                height: 40,
                color: ValidationTheme.primaryBlue,
              ),
            Container(
              width: 20,
              height: 20,
              decoration: BoxDecoration(
                color: isActive
                    ? const Color(0xFFFF9800) // Orange for active
                    : isDestination
                        ? ValidationTheme.errorRed // Red for destination
                        : ValidationTheme.primaryBlue,
                shape: BoxShape.circle,
                border: Border.all(
                  color: ValidationTheme.backgroundWhite,
                  width: 3,
                ),
              ),
              child: icon != null
                  ? Icon(
                      icon,
                      size: 10,
                      color: ValidationTheme.backgroundWhite,
                    )
                  : null,
            ),
            if (!isLast)
              Container(
                width: 2,
                height: 40,
                color: ValidationTheme.primaryBlue,
              ),
          ],
        ),
        const SizedBox(width: 16),
        // Stop information
        Expanded(
          child: Padding(
            padding: EdgeInsets.only(
              top: isFirst ? 0 : 8,
              bottom: isLast ? 0 : 8,
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  stopName,
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                    color: ValidationTheme.textPrimary,
                  ),
                ),
                if (stopAddress != null) ...[
                  const SizedBox(height: 2),
                  Text(
                    stopAddress,
                    style: const TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.normal,
                      color: ValidationTheme.textSecondary,
                    ),
                  ),
                ],
                if (arrivalTime != null) ...[
                  const SizedBox(height: 4),
                  Text(
                    arrivalTime,
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: const Color(0xFFFF9800), // Orange
                    ),
                  ),
                ],
              ],
            ),
          ),
        ),
      ],
    );
  }
}
