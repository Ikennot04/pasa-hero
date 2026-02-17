import 'package:flutter/material.dart';
import '../../../core/themes/validation_theme.dart';
import '../Module/route_card.dart';

class RouteScreen extends StatelessWidget {
  const RouteScreen({super.key});

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
              // Header Section with Title, Search Bar, and Filter
              Container(
                padding: EdgeInsets.symmetric(
                  horizontal: screenWidth * 0.05,
                  vertical: 20,
                ),
                child: Column(
                  children: [
                    // Title
                    const Text(
                      'Active Routes',
                      style: TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.w700,
                        color: ValidationTheme.textLight,
                      ),
                    ),
                    const SizedBox(height: 16),
                    // Search Bar and Filter
                    Row(
                      children: [
                        // Search Bar
                        Expanded(
                          child: Container(
                            height: 48,
                            decoration: BoxDecoration(
                              color: ValidationTheme.backgroundWhite,
                              borderRadius: BorderRadius.circular(24),
                              boxShadow: [
                                BoxShadow(
                                  color: Colors.black.withOpacity(0.05),
                                  blurRadius: 4,
                                  offset: const Offset(0, 2),
                                ),
                              ],
                            ),
                            child: TextField(
                              decoration: InputDecoration(
                                hintText: 'Search route',
                                hintStyle: const TextStyle(
                                  color: ValidationTheme.textSecondary,
                                  fontSize: 14,
                                ),
                                prefixIcon: const Icon(
                                  Icons.search,
                                  color: ValidationTheme.textSecondary,
                                  size: 20,
                                ),
                                border: InputBorder.none,
                                contentPadding: const EdgeInsets.symmetric(
                                  horizontal: 20,
                                  vertical: 14,
                                ),
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        // Filter Button
                        Container(
                          width: 48,
                          height: 48,
                          decoration: BoxDecoration(
                            color: ValidationTheme.backgroundWhite,
                            shape: BoxShape.circle,
                            boxShadow: [
                              BoxShadow(
                                color: Colors.black.withOpacity(0.05),
                                blurRadius: 4,
                                offset: const Offset(0, 2),
                              ),
                            ],
                          ),
                          child: IconButton(
                            onPressed: () {},
                            icon: const Icon(
                              Icons.tune,
                              color: ValidationTheme.textPrimary,
                              size: 20,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),

              // Scrollable Route Cards
              Expanded(
                child: Container(
                  padding: EdgeInsets.symmetric(horizontal: screenWidth * 0.05),
                  child: SingleChildScrollView(
                    child: Column(
                      children: [
                        RouteCard(
                          routeId: 'Route 01K',
                          estimatedTime: 'Estimated: 20 min',
                          routeDescription: 'Tamiya to Plaza Independencia',
                          status: 'Free-flow',
                          activeBuses: 3,
                        ),
                        RouteCard(
                          routeId: 'Route 01K',
                          estimatedTime: 'Estimated: 20 min',
                          routeDescription: 'Parkmall to Colon Market',
                          status: 'Light traffic',
                          activeBuses: 3,
                        ),
                        RouteCard(
                          routeId: 'Route 01K',
                          estimatedTime: 'Estimated: 20 min',
                          routeDescription: 'Parkmall to Colon Market',
                          status: 'Heavy traffic',
                          activeBuses: 3,
                        ),
                        RouteCard(
                          routeId: 'Route 01K',
                          estimatedTime: 'Estimated: 20 min',
                          routeDescription: 'Parkmall to Colon Market',
                          showFollowButton: true,
                          activeBuses: 3,
                        ),
                        RouteCard(
                          routeId: 'Route 01K',
                          estimatedTime: 'Estimated: 20 min',
                          routeDescription: 'Parkmall to Colon Market',
                          showFollowButton: true,
                          isFollowing: true,
                          activeBuses: 3,
                        ),
                        RouteCard(
                          routeId: 'Route 01K',
                          estimatedTime: 'Estimated: 20 min',
                          routeDescription: 'Parkmall to Colon Market',
                          status: 'Heavy traffic',
                          showFollowButton: true,
                          activeBuses: 3,
                        ),
                        RouteCard(
                          routeId: 'Route 01K',
                          estimatedTime: 'Estimated: 20 min',
                          routeDescription: 'Parkmall to Colon Market',
                          status: 'Free-flow',
                          activeBuses: 2,
                        ),
                        const SizedBox(height: 16),
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
}
