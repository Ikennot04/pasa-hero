import 'package:flutter/material.dart';
import '../../../core/models/nearby_operator.dart';
import '../../../core/models/operator_route_option.dart';
import 'nearby_terminal.dart';

class NearMeBottomSheet extends StatelessWidget {
  const NearMeBottomSheet({
    super.key,
    required this.sheetController,
    required this.sheetExtent,
    required this.minSheetExtent,
    required this.routeOptionsLoading,
    required this.routeOptions,
    required this.selectedRouteCode,
    required this.onRouteChanged,
    required this.labelForSelectedRoute,
    required this.nearbyOperators,
    required this.operatorsFirestoreError,
    required this.userPositionAvailable,
    required this.terminals,
    required this.showStopsContent,
  });

  final DraggableScrollableController sheetController;
  final double sheetExtent;
  final double minSheetExtent;
  final bool routeOptionsLoading;
  final List<OperatorRouteOption> routeOptions;
  final String? selectedRouteCode;
  final Future<void> Function(String?) onRouteChanged;
  final String Function() labelForSelectedRoute;
  final List<NearbyOperator> nearbyOperators;
  final String? operatorsFirestoreError;
  final bool userPositionAvailable;
  final List<Map<String, dynamic>> terminals;
  final bool showStopsContent;

  @override
  Widget build(BuildContext context) {
    return DraggableScrollableSheet(
      controller: sheetController,
      initialChildSize: 0.38,
      minChildSize: minSheetExtent,
      maxChildSize: 1.0,
      snap: false,
      builder: (context, scrollController) {
        return Container(
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
            boxShadow: [
              BoxShadow(
                color: Colors.black12,
                blurRadius: 12,
                offset: Offset(0, -4),
              ),
            ],
          ),
          child: CustomScrollView(
            controller: scrollController,
            physics: const ClampingScrollPhysics(),
            slivers: [
              SliverToBoxAdapter(
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  child: Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          sheetExtent <= minSheetExtent + 0.02
                              ? Icons.keyboard_arrow_up_rounded
                              : Icons.keyboard_arrow_down_rounded,
                          size: 28,
                          color: Colors.grey.shade600,
                        ),
                        const SizedBox(height: 4),
                        Container(
                          width: 40,
                          height: 4,
                          decoration: BoxDecoration(
                            color: Colors.grey.shade300,
                            borderRadius: BorderRadius.circular(2),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
              if (sheetExtent > 0.15) ...[
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Route / jeepney code',
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                            color: Colors.grey.shade800,
                          ),
                        ),
                        const SizedBox(height: 8),
                        if (routeOptionsLoading)
                          Padding(
                            padding: const EdgeInsets.symmetric(vertical: 16),
                            child: Row(
                              children: [
                                SizedBox(
                                  width: 20,
                                  height: 20,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                    color: Colors.blue.shade700,
                                  ),
                                ),
                                const SizedBox(width: 12),
                                Text(
                                  'Loading route list…',
                                  style: TextStyle(
                                    color: Colors.grey.shade700,
                                    fontSize: 14,
                                  ),
                                ),
                              ],
                            ),
                          )
                        else
                          DropdownButtonFormField<String?>(
                            // FormField only applies [initialValue] on first mount; keep in sync
                            // when the parent clears or changes the route (e.g. "All nearby buses").
                            key: ValueKey<String>(
                              '${selectedRouteCode ?? 'all'}|${routeOptions.length}|$routeOptionsLoading',
                            ),
                            initialValue: selectedRouteCode,
                            isExpanded: true,
                            decoration: InputDecoration(
                              prefixIcon: const Icon(Icons.directions_bus_outlined),
                              filled: true,
                              fillColor: Colors.grey.shade100,
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(12),
                                borderSide: BorderSide.none,
                              ),
                              contentPadding: const EdgeInsets.symmetric(
                                horizontal: 12,
                                vertical: 8,
                              ),
                            ),
                            hint: const Text('All nearby buses'),
                            items: [
                              const DropdownMenuItem<String?>(
                                value: null,
                                child: Text('All nearby buses (any route)'),
                              ),
                              ...routeOptions.map(
                                (o) => DropdownMenuItem<String?>(
                                  value: o.code,
                                  child: Text(
                                    o.description != null
                                        ? '${o.displayName} · ${o.code}'
                                        : '${o.displayName} (${o.code})',
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                              ),
                            ],
                            onChanged: (value) => onRouteChanged(value),
                          ),
                        const SizedBox(height: 4),
                        Text(
                          'Same routes operators pick in the driver app. Choose one to see those buses on the map.',
                          style: TextStyle(
                            fontSize: 12,
                            color: Colors.grey.shade600,
                            height: 1.3,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
                    child: Text(
                      (selectedRouteCode == null || selectedRouteCode!.isEmpty)
                          ? (nearbyOperators.isEmpty
                              ? 'Operators near you'
                              : 'Operators near you (${nearbyOperators.length})')
                          : (nearbyOperators.isEmpty
                              ? 'Drivers — ${labelForSelectedRoute()}'
                              : 'Drivers — ${labelForSelectedRoute()} (${nearbyOperators.length})'),
                      style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
                    ),
                  ),
                ),
                if (nearbyOperators.isEmpty)
                  SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          if (operatorsFirestoreError != null) ...[
                            Text(
                              'Could not load live buses from the server. Sign in, check your connection, and confirm Firestore rules allow authenticated reads on operator_locations. (${operatorsFirestoreError!.length > 120 ? '${operatorsFirestoreError!.substring(0, 120)}…' : operatorsFirestoreError})',
                              style: TextStyle(
                                fontSize: 13,
                                color: Colors.red.shade800,
                                height: 1.35,
                              ),
                            ),
                            const SizedBox(height: 12),
                          ],
                          Text(
                            (selectedRouteCode != null && selectedRouteCode!.isNotEmpty)
                                ? 'No drivers match this route. Try "All nearby buses", or ensure the driver chose the same route in Profile and keeps the driver app open.'
                                : !userPositionAvailable
                                    ? 'Allow location to see buses near you, or choose a route above.'
                                    : 'No drivers found for this route. Try "All nearby buses".',
                            style: TextStyle(
                              fontSize: 14,
                              color: Colors.grey.shade700,
                              height: 1.35,
                            ),
                          ),
                        ],
                      ),
                    ),
                  )
                else
                  SliverList(
                    delegate: SliverChildBuilderDelegate(
                      (context, index) {
                        final op = nearbyOperators[index];
                        return Padding(
                          padding: EdgeInsets.only(
                            bottom: index == nearbyOperators.length - 1 ? 8 : 6,
                            left: 16,
                            right: 16,
                          ),
                          child: Material(
                            elevation: 1,
                            borderRadius: BorderRadius.circular(12),
                            color: Colors.orange.shade50,
                            child: ListTile(
                              leading: Icon(
                                Icons.directions_bus_filled_rounded,
                                color: Colors.orange.shade800,
                              ),
                              title: Text(
                                op.routeCode != null && op.routeCode!.isNotEmpty
                                    ? 'Route ${op.routeCode}'
                                    : 'Bus operator',
                                style: const TextStyle(fontWeight: FontWeight.w600),
                              ),
                              subtitle: Text(op.distanceLabel),
                            ),
                          ),
                        );
                      },
                      childCount: nearbyOperators.length,
                    ),
                  ),
                const SliverToBoxAdapter(child: SizedBox(height: 20)),
              ],
              if (sheetExtent > 0.15)
                const SliverToBoxAdapter(
                  child: Padding(
                    padding: EdgeInsets.symmetric(horizontal: 16),
                    child: Text(
                      'Nearby Stops and Terminal',
                      style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
                    ),
                  ),
                ),
              if (sheetExtent > 0.15)
                const SliverToBoxAdapter(child: SizedBox(height: 12)),
              if (sheetExtent > 0.15 && showStopsContent)
                SliverList(
                  delegate: SliverChildBuilderDelegate(
                    (context, index) {
                      final terminal = terminals[index];
                      return Padding(
                        padding: EdgeInsets.only(
                          bottom: index == terminals.length - 1 ? 24 : 12,
                          left: 16,
                          right: 16,
                        ),
                        child: NearbyTerminalCard(
                          terminalName: terminal['terminalName'] as String,
                          location: terminal['location'] as String,
                          routes: terminal['routes'] as List<String>,
                          distance: terminal['distance'] as String,
                          isHighlighted: terminal['isHighlighted'] as bool,
                        ),
                      );
                    },
                    childCount: terminals.length,
                  ),
                ),
            ],
          ),
        );
      },
    );
  }
}
