import 'package:flutter/material.dart';
import '../../../core/themes/validation_theme.dart';

class NotificationScreen extends StatelessWidget {
  const NotificationScreen({super.key});

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
                  vertical: 20,
                ),
                child: const Text(
                  'Notifications',
                  style: TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.w700,
                    color: ValidationTheme.textLight,
                  ),
                  textAlign: TextAlign.center,
                ),
              ),

              // Scrollable Notifications
              Expanded(
                child: Container(
                  padding: EdgeInsets.symmetric(horizontal: screenWidth * 0.05),
                  child: SingleChildScrollView(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Today Section
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text(
                              'Today',
                              style: TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.w700,
                                color: ValidationTheme.textPrimary,
                              ),
                            ),
                            TextButton(
                              onPressed: () {},
                              style: TextButton.styleFrom(
                                padding: EdgeInsets.zero,
                                minimumSize: Size.zero,
                                tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                              ),
                              child: const Text(
                                'Mark All as Read',
                                style: TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.w600,
                                  color: ValidationTheme.darkBlue,
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        _buildNotificationCard(
                          title: 'Delay: Route 01K',
                          description:
                              'Route 01K is delayed by 15 minutes due to heavy traffic.',
                          timestamp: 'Just now',
                          statusColor: ValidationTheme.errorRed,
                        ),
                        const SizedBox(height: 12),
                        _buildNotificationCard(
                          title: 'Delay: Route 13B',
                          description:
                              'Route 01K is delayed by 8 minutes due to Light traffic.',
                          timestamp: '1 min',
                          statusColor: const Color(0xFFFF9800), // Orange
                        ),
                        const SizedBox(height: 24),

                        // See All link between Today and Last Week
                        Align(
                          alignment: Alignment.centerRight,
                          child: TextButton(
                            onPressed: () {},
                            style: TextButton.styleFrom(
                              padding: EdgeInsets.zero,
                              minimumSize: Size.zero,
                              tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                            ),
                            child: const Text(
                              'See All',
                              style: TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.w600,
                                color: ValidationTheme.primaryBlue,
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(height: 12),

                        // Last Week Section
                        const Text(
                          'Last Week',
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w700,
                            color: ValidationTheme.textPrimary,
                          ),
                        ),
                        const SizedBox(height: 12),
                        _buildNotificationCard(
                          title: 'Route Change: Route 13B',
                          description:
                              'Route 13B is now re-routed due to a road closure.',
                          timestamp: '11 Feb',
                          statusColor: const Color(0xFFFFC107), // Yellow/Orange
                        ),
                        const SizedBox(height: 12),
                        _buildNotificationCard(
                          title: 'Arrived: Route 13B',
                          description:
                              'Route 13B has arrived at Parkmall Terminal.',
                          timestamp: '02 Feb',
                          statusColor: ValidationTheme.successGreen,
                        ),
                        const SizedBox(height: 16),
                      ],
                    ),
                  ),
                ),
              ),

              // Bottom Navigation Bar
              Container(
                decoration: BoxDecoration(
                  color: ValidationTheme.backgroundWhite.withOpacity(0.95),
                  borderRadius: const BorderRadius.only(
                    topLeft: Radius.circular(20),
                    topRight: Radius.circular(20),
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.05),
                      blurRadius: 10,
                      offset: const Offset(0, -2),
                    ),
                  ],
                ),
               
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildNotificationCard({
    required String title,
    required String description,
    required String timestamp,
    required Color statusColor,
  }) {
    return Container(
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
      child: Stack(
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                  color: ValidationTheme.textPrimary,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                description,
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.normal,
                  color: ValidationTheme.textPrimary,
                ),
              ),
              const SizedBox(height: 12),
              Align(
                alignment: Alignment.centerRight,
                child: Text(
                  timestamp,
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: ValidationTheme.primaryBlue,
                  ),
                ),
              ),
            ],
          ),
          // Status indicator dot
          Positioned(
            top: 0,
            right: 0,
            child: Container(
              width: 10,
              height: 10,
              decoration: BoxDecoration(
                color: statusColor,
                shape: BoxShape.circle,
              ),
            ),
          ),
        ],
      ),
    );
  }

  
  
}
