import 'dart:ui';

import 'package:flutter/material.dart';

/// Legend for color-coded waiting-user cluster markers (same assets as the map).
/// Anchored bottom-right; starts expanded; [X] minimizes to a chip (tap chip to restore).
///
/// When placed above other widgets in a bottom-right [Column] (e.g. with
/// [OperatorAssignmentActionPanel]), set [expandAlignToBottomRight] to false so the
/// legend does not expand vertically and push content off-screen.
class WaitingDemandLegend extends StatefulWidget {
  const WaitingDemandLegend({
    super.key,
    this.expandAlignToBottomRight = true,
  });

  /// If true (default), wraps content in [Align] bottom-right (fills height in a [Column]).
  final bool expandAlignToBottomRight;

  /// Shared with [showWaitingDemandIntroIfNeeded] so the intro matches the corner legend.
  static const List<({String asset, String label})> demandLegendRows = [
    (asset: 'assets/images/green_marker.png', label: '1–15 passengers'),
    (asset: 'assets/images/yellow_marker.png', label: '16–30 passengers'),
    (asset: 'assets/images/red_marker.png', label: '31+ passengers'),
  ];

  @override
  State<WaitingDemandLegend> createState() => _WaitingDemandLegendState();
}

class _WaitingDemandLegendState extends State<WaitingDemandLegend> {
  bool _expanded = true;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    final content =
        _expanded ? _legendCard(theme) : _collapsedChip(theme);

    final padded = SafeArea(
      minimum: const EdgeInsets.only(right: 8),
      child: widget.expandAlignToBottomRight
          ? Align(
              alignment: Alignment.bottomRight,
              child: content,
            )
          : content,
    );
    return padded;
  }

  Widget _collapsedChip(ThemeData theme) {
    return Material(
      elevation: 6,
      shadowColor: Colors.black26,
      borderRadius: BorderRadius.circular(24),
      color: Colors.white.withValues(alpha: 0.94),
      child: InkWell(
        onTap: () => setState(() => _expanded = true),
        borderRadius: BorderRadius.circular(24),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.layers_outlined, size: 20, color: theme.colorScheme.primary),
              const SizedBox(width: 8),
              Text(
                'Demand',
                style: theme.textTheme.labelLarge?.copyWith(
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _legendCard(ThemeData theme) {
    return Material(
      elevation: 8,
      shadowColor: Colors.black26,
      borderRadius: BorderRadius.circular(14),
      color: Colors.transparent,
      child: ClipRRect(
        borderRadius: BorderRadius.circular(14),
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 12, sigmaY: 12),
          child: Container(
            constraints: const BoxConstraints(maxWidth: 240),
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.88),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: Colors.black.withValues(alpha: 0.06)),
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(12, 8, 4, 6),
                  child: Row(
                    children: [
                      Icon(
                        Icons.groups_outlined,
                        size: 20,
                        color: theme.colorScheme.primary,
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          'Waiting demand',
                          style: theme.textTheme.titleSmall?.copyWith(
                            fontWeight: FontWeight.w800,
                            letterSpacing: -0.2,
                          ),
                        ),
                      ),
                      IconButton(
                        visualDensity: VisualDensity.compact,
                        tooltip: 'Minimize',
                        onPressed: () => setState(() => _expanded = false),
                        icon: const Icon(Icons.close, size: 22),
                      ),
                    ],
                  ),
                ),
                Divider(height: 1, thickness: 1, color: Colors.black.withValues(alpha: 0.06)),
                Padding(
                  padding: const EdgeInsets.fromLTRB(10, 8, 12, 12),
                  child: Column(
                    children: [
                      for (final row in WaitingDemandLegend.demandLegendRows)
                        Padding(
                          padding: const EdgeInsets.symmetric(vertical: 5),
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.center,
                            children: [
                              SizedBox(
                                width: 36,
                                height: 36,
                                child: Image.asset(
                                  row.asset,
                                  fit: BoxFit.contain,
                                  filterQuality: FilterQuality.medium,
                                ),
                              ),
                              const SizedBox(width: 10),
                              Expanded(
                                child: Text(
                                  row.label,
                                  style: theme.textTheme.bodyMedium?.copyWith(
                                    fontWeight: FontWeight.w600,
                                    height: 1.2,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
