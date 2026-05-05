import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';

import '../../../core/models/route_map_label_point.dart';
import '../../../core/services/backend_route_geometry.dart';
import '../../../core/services/route_path_coordinates_service.dart';
import '../../../core/themes/validation_theme.dart';
import '../route_constants.dart';
import '../../map/map.dart';

/// Route detail: **map** + **status** on the gradient; **numbered stops** live in the white sheet below.
class RouteDetailsScreen extends StatefulWidget {
  const RouteDetailsScreen({
    super.key,
    required this.routeCode,
    required this.routeId,
    required this.estimatedArrival,
    this.status,
    this.routeDescription = '',
  });

  /// Catalog route code (Mongo `route_code`), used to load `/api/routes`.
  final String routeCode;

  final String routeId;
  final String estimatedArrival;
  final String? status;
  final String routeDescription;

  @override
  State<RouteDetailsScreen> createState() => _RouteDetailsScreenState();
}

class _RouteDetailsScreenState extends State<RouteDetailsScreen> {
  final RoutePathCoordinatesService _pathService = RoutePathCoordinatesService();

  bool _loading = true;
  List<RouteMapLabelPoint>? _points;
  List<LatLng>? _highlight;

  @override
  void initState() {
    super.initState();
    _loadRouteGeometry();
  }

  Future<void> _loadRouteGeometry() async {
    final code = widget.routeCode.trim();
    if (code.isEmpty) {
      setState(() {
        _loading = false;
        _points = const [];
      });
      return;
    }

    try {
      final detail = await BackendRouteGeometry.fetchRouteDetailByCode(code);
      if (!mounted) return;

      if (detail == null) {
        setState(() {
          _loading = false;
          _points = const [];
          _highlight = null;
        });
        return;
      }

      final labeled = BackendRouteGeometry.labeledAnchorPointsFromDetail(detail);
      final points = labeled
          .map(
            (e) => RouteMapLabelPoint(name: e.name, position: e.position),
          )
          .toList();

      final hl = await _pathService.fetchRoutePathLatLng(code);
      if (!mounted) return;

      setState(() {
        _points = points;
        _highlight = hl.length >= 2 ? hl : null;
        _loading = false;
      });
    } catch (_) {
      if (mounted) {
        setState(() {
          _loading = false;
          _points = const [];
        });
      }
    }
  }

  Color _getStatusColor() {
    switch (widget.status) {
      case 'Free-flow':
        return ValidationTheme.successGreen;
      case 'Light traffic':
        return const Color(0xFFFF9800);
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
              Container(
                padding: EdgeInsets.symmetric(
                  horizontal: screenWidth * 0.05,
                  vertical: 16,
                ),
                child: Stack(
                  children: [
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
                    Center(
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            widget.routeId,
                            style: const TextStyle(
                              fontSize: 22,
                              fontWeight: FontWeight.w700,
                              color: Color.fromARGB(255, 255, 251, 251),
                            ),
                            textAlign: TextAlign.center,
                          ),
                          const SizedBox(height: 4),
                          Text(
                            'Estimated Arrival: ${widget.estimatedArrival}',
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

              Container(
                height: 300,
                margin: EdgeInsets.symmetric(horizontal: screenWidth * 0.05),
                decoration: BoxDecoration(
                  color: ValidationTheme.borderLight,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(12),
                  child: _loading
                      ? const Center(child: CircularProgressIndicator())
                      : MapWidget(
                          routeDetailPoints: _points,
                          routeCatalogHighlightPoints: _highlight,
                          nearbyOperators: const [],
                          routeOrigin: null,
                          routeDestination: null,
                        ),
                ),
              ),

              const SizedBox(height: 16),

              if (widget.status != null) ...[
                Padding(
                  padding:
                      EdgeInsets.symmetric(horizontal: screenWidth * 0.05),
                  child: Align(
                    alignment: Alignment.centerLeft,
                    child: Text(
                      'Status:',
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: ValidationTheme.textLight.withOpacity(0.95),
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 8),
                Container(
                  margin: EdgeInsets.symmetric(horizontal: screenWidth * 0.05),
                  padding:
                      const EdgeInsets.symmetric(horizontal: 24, vertical: 8),
                  decoration: BoxDecoration(
                    color: _getStatusColor(),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    widget.status!,
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: ValidationTheme.textLight,
                    ),
                  ),
                ),
                const SizedBox(height: 16),
              ],

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
                    padding:
                        EdgeInsets.symmetric(horizontal: screenWidth * 0.05),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const SizedBox(height: 24),
                        if (!_loading &&
                            _points != null &&
                            _points!.isNotEmpty) ...[
                          const Text(
                            'Stops on this route',
                            style: TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.w700,
                              color: ValidationTheme.textPrimary,
                            ),
                          ),
                          const SizedBox(height: 12),
                          for (var i = 0; i < _points!.length; i++) ...[
                            Padding(
                              padding: const EdgeInsets.only(bottom: 10),
                              child: Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  SizedBox(
                                    width: 26,
                                    child: Text(
                                      '${i + 1}.',
                                      style: const TextStyle(
                                        fontSize: 14,
                                        fontWeight: FontWeight.w600,
                                        color: ValidationTheme.textSecondary,
                                      ),
                                    ),
                                  ),
                                  Expanded(
                                    child: Text(
                                      _points![i].name,
                                      style: const TextStyle(
                                        fontSize: 15,
                                        fontWeight: FontWeight.w500,
                                        color: ValidationTheme.textPrimary,
                                        height: 1.35,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                          const SizedBox(height: 20),
                        ],
                        if (widget.routeDescription.trim().isNotEmpty)
                          Text(
                            widget.routeDescription.trim(),
                            style: const TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.w500,
                              color: ValidationTheme.textPrimary,
                              height: 1.4,
                            ),
                          )
                        else if (!_loading &&
                            (_points == null || _points!.isEmpty))
                          const Padding(
                            padding: EdgeInsets.symmetric(vertical: 16),
                            child: Text(
                              kNoStopsAvailableMessage,
                              style: TextStyle(
                                fontSize: 14,
                                color: ValidationTheme.textSecondary,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
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
}
