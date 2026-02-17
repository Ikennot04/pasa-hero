import 'package:flutter/material.dart';
import '../../../core/themes/validation_theme.dart';

class TerminalScreen extends StatelessWidget {
  final String terminalName;
  final String terminalLocation;
  
  const TerminalScreen({
    super.key,
    this.terminalName = 'Pacific Terminal',
    this.terminalLocation = 'Pacific Mall, Mandaue City',
  });

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
              // Custom header with back button and title
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
                    // Title and location
                    Center(
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            terminalName,
                            style: const TextStyle(
                              fontSize: 20,
                              fontWeight: FontWeight.w600,
                              color: Color.fromARGB(255, 235, 231, 231),
                            ),
                            textAlign: TextAlign.center,
                          ),
                          const SizedBox(height: 4),
                          Text(
                            terminalLocation,
                            style: const TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.normal,
                              color: Color.fromARGB(255, 231, 233, 236),
                            ),
                            textAlign: TextAlign.center,
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),

              // Scrollable content
              Expanded(
                child: SingleChildScrollView(
                  child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Terminal Image Section
                    Padding(
                      padding: const EdgeInsets.all(16),
                      child: Container(
                        height: 200,
                        decoration: BoxDecoration(
                          color: ValidationTheme.borderLight,
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(12),
                          child: Image.asset(
                            'assets/images/terminal_placeholder.png',
                            fit: BoxFit.cover,
                            errorBuilder: (context, error, stackTrace) {
                              return Container(
                                color: ValidationTheme.borderLight,
                                child: const Center(
                                  child: Icon(
                                    Icons.image,
                                    size: 64,
                                    color: ValidationTheme.textSecondary,
                                  ),
                                ),
                              );
                            },
                          ),
                        ),
                      ),
                    ),

                    // Active Buses Section
                    const Padding(
                      padding: EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                      child: Text(
                        'Active Buses',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          color: ValidationTheme.textPrimary,
                        ),
                      ),
                    ),

                    // Active Bus Items
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      child: Column(
                        children: [
                          _buildBusRouteItem(
                            routeNumber: '01K',
                            routeDescription: 'Pacific Mall → Colon Market',
                            availability: '5/5',
                          ),
                          const SizedBox(height: 8),
                          _buildBusRouteItem(
                            routeNumber: '13B',
                            routeDescription: 'Pacific Mall → SM Cebu',
                            availability: '5/5',
                          ),
                          const SizedBox(height: 8),
                          _buildBusRouteItem(
                            routeNumber: '01F',
                            routeDescription: 'Pacific Mall → Plaza Indenpendencia',
                            availability: '5/5',
                          ),
                          const SizedBox(height: 8),
                          _buildBusRouteItem(
                            routeNumber: '46E',
                            routeDescription: 'Pacific Mall → Tamiya Terminal',
                            availability: '5/5',
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 16),
                  ],
                ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildBusRouteItem({
    required String routeNumber,
    required String routeDescription,
    required String availability,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
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
      child: Row(
        children: [
          // Bus Icon
          Image.asset(
            'assets/images/logo/Bus.png',
            width: 24,
            height: 24,
            errorBuilder: (context, error, stackTrace) {
              return const Icon(
                Icons.directions_bus,
                color: ValidationTheme.textPrimary,
                size: 24,
              );
            },
          ),
          const SizedBox(width: 12),
          
          // Route Info
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'BUS: $routeNumber',
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w600,
                    color: ValidationTheme.textPrimary,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  routeDescription,
                  style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.normal,
                    color: ValidationTheme.textSecondary,
                  ),
                ),
              ],
            ),
          ),
          
          // Availability Badge (Oval)
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
            decoration: BoxDecoration(
              color: ValidationTheme.primaryBlue.withOpacity(0.1),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Text(
              availability,
              style: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: ValidationTheme.primaryBlue,
              ),
            ),
          ),
        ],
      ),
    );
  }


}
