import 'package:flutter/material.dart';

/// Destination form: single field that opens a scrollable list to pick a destination.
class FromToForm extends StatelessWidget {
  /// List of destination options (e.g. terminals). Each map should have 'terminalName', 'location', and optionally 'lat'/'lng' for routing.
  final List<Map<String, dynamic>> destinations;

  /// Currently selected destination, or null if none chosen.
  final Map<String, dynamic>? selectedDestination;

  /// When true, shows a loading indicator (e.g. while bus stops are being fetched).
  final bool isLoading;

  /// Nearest stop used as route origin (POINT_A), if known — same as map / distance logic.
  final String? startingPointLabel;

  /// Called when the user selects a destination from the list.
  final ValueChanged<Map<String, dynamic>>? onDestinationSelected;

  const FromToForm({
    super.key,
    required this.destinations,
    this.selectedDestination,
    this.isLoading = false,
    this.startingPointLabel,
    this.onDestinationSelected,
  });

  @override
  Widget build(BuildContext context) {
    final selected = selectedDestination;
    final label = isLoading
        ? 'Loading bus stops...'
        : selected != null
            ? '${selected['terminalName']} · ${selected['location']}'
            : 'Choose destination';
    return Material(
      elevation: 4,
      shadowColor: Colors.black26,
      borderRadius: BorderRadius.circular(16),
      color: Colors.white,
      child: InkWell(
        onTap: () => _showDestinationPicker(context),
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          child: Row(
            children: [
              Icon(Icons.place, color: Colors.red.shade400, size: 22),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    if (startingPointLabel != null &&
                        startingPointLabel!.trim().isNotEmpty) ...[
                      Text(
                        'From (nearest stop)',
                        style: TextStyle(fontSize: 11, color: Colors.grey.shade600),
                      ),
                      Text(
                        startingPointLabel!.trim(),
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          color: Colors.blueGrey.shade800,
                        ),
                        overflow: TextOverflow.ellipsis,
                        maxLines: 1,
                      ),
                      const SizedBox(height: 8),
                    ],
                    Text(
                      'Destination',
                      style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      label,
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w500,
                        color: selected != null ? Colors.black87 : Colors.grey.shade600,
                      ),
                      overflow: TextOverflow.ellipsis,
                      maxLines: 2,
                    ),
                  ],
                ),
              ),
              Icon(Icons.keyboard_arrow_down_rounded, color: Colors.grey.shade600),
            ],
          ),
        ),
      ),
    );
  }

  void _showDestinationPicker(BuildContext context) {
    final destinations = this.destinations;
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => DraggableScrollableSheet(
        initialChildSize: 0.6,
        minChildSize: 0.3,
        maxChildSize: 0.9,
        builder: (_, scrollController) => Container(
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const SizedBox(height: 12),
              Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: Colors.grey.shade300,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              const Padding(
                padding: EdgeInsets.all(16),
                child: Text(
                  'Choose destination',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
                ),
              ),
              Flexible(
                child: ListView.builder(
                  controller: scrollController,
                  padding: const EdgeInsets.only(bottom: 24),
                  itemCount: destinations.length,
                  itemBuilder: (_, index) {
                    final t = destinations[index];
                    final name = t['terminalName'] as String? ?? '';
                    final location = t['location'] as String? ?? '';
                    return ListTile(
                      leading: CircleAvatar(
                        backgroundColor: Colors.red.shade100,
                        child: Icon(Icons.place, color: Colors.red.shade700, size: 20),
                      ),
                      title: Text(name, style: const TextStyle(fontWeight: FontWeight.w600)),
                      subtitle: Text(
                        location,
                        style: TextStyle(fontSize: 13, color: Colors.grey.shade600),
                      ),
                      onTap: () {
                        onDestinationSelected?.call(t);
                        Navigator.of(ctx).pop();
                      },
                    );
                  },
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
