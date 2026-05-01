import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';

import '../../../core/services/driver_status_service.dart';

class FreeRideCard extends StatelessWidget {
  const FreeRideCard({
    super.key,
    required this.currentRouteCode,
  });

  final String? currentRouteCode;

  static String _formatDateTime(DateTime d) {
    final y = d.year;
    final m = d.month.toString().padLeft(2, '0');
    final day = d.day.toString().padLeft(2, '0');
    final h = d.hour.toString().padLeft(2, '0');
    final min = d.minute.toString().padLeft(2, '0');
    return '$y-$m-$day $h:$min';
  }

  @override
  Widget build(BuildContext context) {
    if (currentRouteCode == null || currentRouteCode!.isEmpty) {
      return Card(
        elevation: 2,
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Icon(Icons.card_giftcard, color: Colors.grey.shade600),
                  const SizedBox(width: 12),
                  const Text(
                    'Free Ride',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                'Select a route to manage Free Ride',
                style: TextStyle(fontSize: 14, color: Colors.grey.shade600),
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
        final buttonText = isActive ? 'Stop the free ride' : 'Strat free ride';

        return Card(
          elevation: 2,
          child: Padding(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Text(
                  'Free Ride',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                    color: Colors.black87,
                  ),
                ),
                const SizedBox(height: 12),
                Material(
                  color: Colors.transparent,
                  child: InkWell(
                    onTap: () => _onFreeRideButtonTap(context, routeId, details),
                    borderRadius: BorderRadius.circular(8),
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        vertical: 14,
                        horizontal: 20,
                      ),
                      decoration: BoxDecoration(
                        color: isActive ? Colors.red.shade400 : Colors.blue.shade500,
                        borderRadius: BorderRadius.circular(8),
                        boxShadow: const [
                          BoxShadow(
                            color: Colors.black26,
                            blurRadius: 4,
                            offset: Offset(0, 2),
                          ),
                        ],
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          if (isActive) ...[
                            const Icon(
                              Icons.close,
                              color: Colors.white,
                              size: 24,
                            ),
                            const SizedBox(width: 10),
                          ],
                          Text(
                            buttonText,
                            style: const TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                              color: Colors.white,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 14),
                _buildTimeDetails(details),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildTimeDetails(FreeRideDetails? details) {
    if (details == null) {
      return Text(
        'No free ride scheduled',
        style: TextStyle(fontSize: 13, color: Colors.grey.shade600),
      );
    }
    if (!details.isActive && details.endTime == null && details.startTime == null) {
      return Text(
        'No free ride scheduled',
        style: TextStyle(fontSize: 13, color: Colors.grey.shade600),
      );
    }

    final startStr = details.startTime != null ? _formatDateTime(details.startTime!) : '—';
    final endStr = details.endTime != null ? _formatDateTime(details.endTime!) : '—';
    final durationText = details.durationMinutes != null
        ? '${details.durationMinutes} minute(s)'
        : (details.startTime != null && details.endTime != null)
            ? '${details.endTime!.difference(details.startTime!).inMinutes} minute(s)'
            : '—';

    // Bold + larger only while free ride is on (after operator confirms the start modal).
    if (!details.isActive) {
      final subtle = TextStyle(fontSize: 13, color: Colors.grey.shade700);
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Starts: $startStr', style: subtle),
          const SizedBox(height: 4),
          Text('Ends: $endStr', style: subtle),
          const SizedBox(height: 4),
          Text('Duration: $durationText', style: subtle),
        ],
      );
    }

    const emphasizedStyle = TextStyle(
      fontSize: 17,
      fontWeight: FontWeight.bold,
      color: Colors.black87,
    );

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Starts: $startStr', style: emphasizedStyle),
        const SizedBox(height: 6),
        Text('Ends: $endStr', style: emphasizedStyle),
        const SizedBox(height: 6),
        Text('Duration: $durationText', style: emphasizedStyle),
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
          title: const Text('Turn off Free Ride?'),
          content: const Text(
            'Free ride will be disabled for your route. Passengers will see the change immediately.',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(ctx).pop(false),
              child: const Text('Cancel'),
            ),
            TextButton(
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
            const SnackBar(
              content: Text('Free ride turned off'),
              backgroundColor: Colors.orange,
            ),
          );
        }
      }
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
            title: const Text('Turn on Free Ride'),
            content: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Set when the free ride should end:',
                    style: TextStyle(fontSize: 14),
                  ),
                  const SizedBox(height: 16),
                  ListTile(
                    title: const Text('End time'),
                    subtitle: Text(
                      endTime != null ? _formatDateTime(endTime!) : 'Not set',
                    ),
                    trailing: const Icon(Icons.access_time),
                    onTap: () async {
                      final t = await showTimePicker(
                        context: ctx,
                        initialTime: TimeOfDay.fromDateTime(endTime ?? now),
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
                child: const Text('Strat free ride'),
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
          const SnackBar(
            content: Text('Free ride is now on'),
            backgroundColor: Colors.green,
          ),
        );
      }
    }
  }
}
