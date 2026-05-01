import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';

String waitingDemandTitle(int userCount) =>
    userCount == 1 ? '1 user waiting' : '$userCount users waiting';

String? formatWaitingLastUpdated(DateTime? t) {
  if (t == null) return null;
  final now = DateTime.now();
  final d = now.difference(t);
  if (d.isNegative) return 'Just now';
  if (d.inSeconds < 60) return 'Just now';
  if (d.inMinutes < 60) return '${d.inMinutes} min ago';
  if (d.inHours < 24) return '${d.inHours} hr ago';
  return '${d.inDays} days ago';
}

String? formatApproxArea(LatLng? p) {
  if (p == null) return null;
  return 'Area · ${p.latitude.toStringAsFixed(4)}, ${p.longitude.toStringAsFixed(4)}';
}

/// Bottom sheet shown when the operator taps a waiting-user cluster marker.
Future<void> showWaitingDemandBottomSheet(
  BuildContext context, {
  required int userCount,
  DateTime? lastUpdated,
  LatLng? approxLocation,
}) {
  final theme = Theme.of(context);
  final lastStr = formatWaitingLastUpdated(lastUpdated);
  final areaStr = formatApproxArea(approxLocation);

  return showModalBottomSheet<void>(
    context: context,
    showDragHandle: true,
    isScrollControlled: true,
    builder: (ctx) {
      return SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(24, 8, 24, 28),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                waitingDemandTitle(userCount),
                textAlign: TextAlign.center,
                style: theme.textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.w700,
                ),
              ),
              if (lastStr != null) ...[
                const SizedBox(height: 12),
                Text(
                  'Last updated: $lastStr',
                  textAlign: TextAlign.center,
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                ),
              ],
              if (areaStr != null) ...[
                const SizedBox(height: 8),
                Text(
                  areaStr,
                  textAlign: TextAlign.center,
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                ),
              ],
              const SizedBox(height: 20),
              FilledButton(
                onPressed: () => Navigator.of(ctx).pop(),
                child: const Text('Close'),
              ),
            ],
          ),
        ),
      );
    },
  );
}
