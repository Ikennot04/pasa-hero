import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';

import '../../../core/services/driver_status_service.dart';

class FreeRideCard extends StatelessWidget {
  const FreeRideCard({
    super.key,
    required this.currentRouteCode,
    this.isDesignatedFreeRideRoute = false,
  });

  final String? currentRouteCode;
  /// True when this route is a free-ride line in the server catalog (`is_free_ride`).
  final bool isDesignatedFreeRideRoute;

  /// 12-hour clock, UX-friendly (e.g. `May 3, 2026 · 2:05 PM`).
  static String formatDateTime12h(DateTime d) {
    final local = d.toLocal();
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    ];
    final mon = months[local.month - 1];
    var hour = local.hour;
    final minute = local.minute.toString().padLeft(2, '0');
    final isPm = hour >= 12;
    final period = isPm ? 'PM' : 'AM';
    hour = hour % 12;
    if (hour == 0) hour = 12;
    return '$mon ${local.day}, ${local.year} · $hour:$minute $period';
  }

  @override
  Widget build(BuildContext context) {
    if (currentRouteCode == null || currentRouteCode!.isEmpty) {
      return Card(
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
          side: BorderSide(color: Colors.grey.shade300),
        ),
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Icon(Icons.card_giftcard_rounded, color: Colors.blue.shade700, size: 26),
                  const SizedBox(width: 12),
                  Text(
                    'Free ride',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w700,
                      color: Colors.grey.shade900,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Text(
                'Select a route first to manage timed free-ride promos.',
                style: TextStyle(fontSize: 14, height: 1.35, color: Colors.grey.shade700),
              ),
            ],
          ),
        ),
      );
    }

    final routeId = currentRouteCode!;
    return StreamBuilder<FreeRideDetails?>(
      stream: DriverStatusService.instance.freeRideDetailsStream(routeId),
      builder: (context, snapshot) {
        final details = snapshot.data;
        final isActive = details?.isActive ?? false;
        final hideStartBecauseDesignated =
            isDesignatedFreeRideRoute && !isActive;

        return Card(
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
            side: BorderSide(color: Colors.grey.shade300),
          ),
          clipBehavior: Clip.antiAlias,
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(
                  children: [
                    Icon(Icons.card_giftcard_rounded, color: Colors.blue.shade700, size: 24),
                    const SizedBox(width: 10),
                    Text(
                      'Free ride',
                      style: TextStyle(
                        fontSize: 17,
                        fontWeight: FontWeight.w700,
                        color: Colors.grey.shade900,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                if (hideStartBecauseDesignated) ...[
                  _buildDesignatedRouteCallout(context),
                  const SizedBox(height: 16),
                  _buildTimeDetails(details, emphasize: false),
                ] else ...[
                  Material(
                    color: Colors.transparent,
                    child: InkWell(
                      onTap: () => _onFreeRideButtonTap(context, routeId, details),
                      borderRadius: BorderRadius.circular(10),
                      child: Ink(
                        decoration: BoxDecoration(
                          color: isActive ? Colors.red.shade500 : Colors.blue.shade600,
                          borderRadius: BorderRadius.circular(10),
                          boxShadow: [
                            BoxShadow(
                              color: (isActive ? Colors.red : Colors.blue).withOpacity(0.25),
                              blurRadius: 8,
                              offset: const Offset(0, 3),
                            ),
                          ],
                        ),
                        child: Padding(
                          padding: const EdgeInsets.symmetric(vertical: 15, horizontal: 16),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              if (isActive) ...[
                                const Icon(Icons.stop_circle_outlined, color: Colors.white, size: 22),
                                const SizedBox(width: 10),
                              ],
                              Text(
                                isActive ? 'Stop free ride' : 'Start free ride',
                                style: const TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w700,
                                  color: Colors.white,
                                  letterSpacing: 0.2,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  _buildTimeDetails(details, emphasize: isActive),
                ],
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildDesignatedRouteCallout(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.amber.shade50,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: Colors.amber.shade700.withOpacity(0.35)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(Icons.info_outline_rounded, color: Colors.amber.shade900, size: 22),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'The route is already in a free ride',
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                    color: Colors.amber.shade900,
                    height: 1.3,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'This line is a free-ride route in the system. Passengers already see it that way, so you do not need to start a separate promo. If a timed window is active below, you can still end it.',
                  style: TextStyle(
                    fontSize: 13,
                    height: 1.4,
                    color: Colors.brown.shade800,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTimeDetails(FreeRideDetails? details, {required bool emphasize}) {
    if (details == null) {
      return Text(
        'No timed promo on this route.',
        style: TextStyle(fontSize: 13, color: Colors.grey.shade600),
      );
    }
    if (!details.isActive && details.endTime == null && details.startTime == null) {
      return Text(
        'No timed promo on this route.',
        style: TextStyle(fontSize: 13, color: Colors.grey.shade600),
      );
    }

    final startStr =
        details.startTime != null ? formatDateTime12h(details.startTime!) : '—';
    final endStr =
        details.endTime != null ? formatDateTime12h(details.endTime!) : '—';
    final durationText = details.durationMinutes != null
        ? '${details.durationMinutes} min'
        : (details.startTime != null && details.endTime != null)
            ? '${details.endTime!.difference(details.startTime!).inMinutes} min'
            : '—';

    final subtle = TextStyle(fontSize: 13, height: 1.35, color: Colors.grey.shade700);
    final strong = TextStyle(
      fontSize: 15,
      fontWeight: FontWeight.w700,
      height: 1.35,
      color: Colors.grey.shade900,
    );
    final labelStyle = TextStyle(
      fontSize: 12,
      fontWeight: FontWeight.w600,
      letterSpacing: 0.2,
      color: Colors.grey.shade600,
    );

    Widget row(String label, String value, TextStyle valueStyle) {
      return Padding(
        padding: const EdgeInsets.only(bottom: 10),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            SizedBox(
              width: 72,
              child: Text(label, style: labelStyle),
            ),
            Expanded(child: Text(value, style: valueStyle)),
          ],
        ),
      );
    }

    if (!details.isActive) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Last schedule', style: labelStyle.copyWith(fontSize: 11)),
          const SizedBox(height: 6),
          row('Starts', startStr, subtle),
          row('Ends', endStr, subtle),
          row('Duration', durationText, subtle),
        ],
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Active promo', style: labelStyle.copyWith(fontSize: 11, color: Colors.green.shade800)),
        const SizedBox(height: 6),
        row('Starts', startStr, emphasize ? strong : subtle),
        row('Ends', endStr, emphasize ? strong : subtle),
        row('Duration', durationText, emphasize ? strong : subtle),
      ],
    );
  }

  Future<void> _onFreeRideButtonTap(
    BuildContext context,
    String routeId,
    FreeRideDetails? details,
  ) async {
    final isActive = details?.isActive ?? false;
    if (isActive) {
      final confirm = await showDialog<bool>(
        context: context,
        builder: (ctx) => AlertDialog(
          title: const Text('Turn off free ride?'),
          content: const Text(
            'The timed free ride will end. Passengers will see the update shortly.',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(ctx).pop(false),
              child: const Text('Cancel'),
            ),
            FilledButton(
              onPressed: () => Navigator.of(ctx).pop(true),
              child: const Text('Turn off'),
            ),
          ],
        ),
      );

      if (confirm == true && context.mounted) {
        final operatorId = FirebaseAuth.instance.currentUser?.uid;
        if (operatorId == null || operatorId.isEmpty) return;
        await DriverStatusService.instance.setFreeRideStatus(
          routeId,
          isFreeRide: false,
          operatorId: operatorId,
        );
        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: const Text('Free ride turned off'),
              behavior: SnackBarBehavior.floating,
              backgroundColor: Colors.orange.shade800,
            ),
          );
        }
      }
      return;
    }

    if (isDesignatedFreeRideRoute) {
      return;
    }

    final now = DateTime.now();
    if (!context.mounted) return;
    DateTime? endTime = now.add(const Duration(hours: 1));
    final picked = await showDialog<DateTime>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setState) {
          return AlertDialog(
            title: const Text('Start free ride'),
            content: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Choose when this promo should end (shown in 12-hour time):',
                    style: TextStyle(fontSize: 14, color: Colors.grey.shade800),
                  ),
                  const SizedBox(height: 16),
                  ListTile(
                    contentPadding: EdgeInsets.zero,
                    title: const Text('End time'),
                    subtitle: Text(
                      endTime != null ? formatDateTime12h(endTime!) : 'Not set',
                      style: const TextStyle(fontWeight: FontWeight.w600),
                    ),
                    trailing: Icon(Icons.schedule_rounded, color: Colors.blue.shade700),
                    onTap: () async {
                      final t = await showTimePicker(
                        context: ctx,
                        initialTime: TimeOfDay.fromDateTime(endTime ?? now),
                        builder: (context, child) {
                          return MediaQuery(
                            data: MediaQuery.of(context).copyWith(alwaysUse24HourFormat: false),
                            child: child ?? const SizedBox.shrink(),
                          );
                        },
                      );
                      if (t == null) return;
                      final d = endTime ?? now;
                      setState(() {
                        endTime = DateTime(
                          d.year,
                          d.month,
                          d.day,
                          t.hour,
                          t.minute,
                        );
                        if (endTime!.isBefore(now)) {
                          final tomorrow = now.add(const Duration(days: 1));
                          endTime = DateTime(
                            tomorrow.year,
                            tomorrow.month,
                            tomorrow.day,
                            t.hour,
                            t.minute,
                          );
                        }
                      });
                    },
                  ),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      ActionChip(
                        label: const Text('30 min'),
                        onPressed: () {
                          setState(() => endTime = now.add(const Duration(minutes: 30)));
                        },
                      ),
                      ActionChip(
                        label: const Text('1 hour'),
                        onPressed: () {
                          setState(() => endTime = now.add(const Duration(hours: 1)));
                        },
                      ),
                      ActionChip(
                        label: const Text('2 hours'),
                        onPressed: () {
                          setState(() => endTime = now.add(const Duration(hours: 2)));
                        },
                      ),
                    ],
                  ),
                ],
              ),
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.of(ctx).pop(),
                child: const Text('Cancel'),
              ),
              FilledButton(
                onPressed: endTime != null ? () => Navigator.of(ctx).pop(endTime) : null,
                child: const Text('Start free ride'),
              ),
            ],
          );
        },
      ),
    );

    if (picked != null && context.mounted) {
      final operatorId = FirebaseAuth.instance.currentUser?.uid;
      if (operatorId == null || operatorId.isEmpty) return;
      await DriverStatusService.instance.setFreeRideStatus(
        routeId,
        isFreeRide: true,
        operatorId: operatorId,
        freeRideUntil: picked,
        freeRideFrom: now,
      );
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Text('Free ride is on'),
            behavior: SnackBarBehavior.floating,
            backgroundColor: Colors.green.shade700,
          ),
        );
      }
    }
  }
}
