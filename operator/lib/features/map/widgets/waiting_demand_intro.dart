import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'waiting_demand_legend.dart';

const _prefsKeyIntroSeen = 'operator_waiting_demand_legend_intro_v1';

Future<bool> _introAlreadySeen() async {
  final p = await SharedPreferences.getInstance();
  return p.getBool(_prefsKeyIntroSeen) == true;
}

Future<void> _markIntroSeen() async {
  final p = await SharedPreferences.getInstance();
  await p.setBool(_prefsKeyIntroSeen, true);
}

/// One-time dialog (first Map or Route open) so operators see what the pins mean
/// before using the map. Matches the bottom-right legend.
Future<void> showWaitingDemandIntroIfNeeded(BuildContext context) async {
  if (!context.mounted) return;
  if (await _introAlreadySeen()) return;
  if (!context.mounted) return;

  await showDialog<void>(
    context: context,
    barrierDismissible: false,
    builder: (ctx) {
      final theme = Theme.of(ctx);
      return AlertDialog(
        icon: Icon(Icons.groups_outlined, size: 32, color: theme.colorScheme.primary),
        title: const Text('Waiting demand on the map'),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Colored pins group riders who are nearby. More riders in one area '
                'means higher demand. Tap a pin to see the exact count.',
                style: theme.textTheme.bodyMedium?.copyWith(height: 1.35),
              ),
              const SizedBox(height: 18),
              for (final row in WaitingDemandLegend.demandLegendRows)
                Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.center,
                    children: [
                      SizedBox(
                        width: 40,
                        height: 40,
                        child: Image.asset(
                          row.asset,
                          fit: BoxFit.contain,
                          filterQuality: FilterQuality.medium,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          row.label,
                          style: theme.textTheme.bodyLarge?.copyWith(
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              const SizedBox(height: 4),
              Text(
                'The same guide stays in the bottom-right corner. Use ✕ there to hide it.',
                style: theme.textTheme.bodySmall?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                  height: 1.3,
                ),
              ),
            ],
          ),
        ),
        actions: [
          FilledButton(
            onPressed: () async {
              await _markIntroSeen();
              if (ctx.mounted) Navigator.of(ctx).pop();
            },
            child: const Text('Got it'),
          ),
        ],
      );
    },
  );
}
