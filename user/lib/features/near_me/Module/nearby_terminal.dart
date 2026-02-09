import 'package:flutter/material.dart';

class NearbyTerminal extends StatelessWidget {
  final String terminalName;
  final String distance;
  final List<String> routeTags;

  const NearbyTerminal({
    super.key,
    required this.terminalName,
    required this.distance,
    required this.routeTags,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 160,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 4,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: const Color(0xFF3B82F6).withOpacity(0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Icon(
                  Icons.directions_bus,
                  color: Color(0xFF3B82F6),
                  size: 20,
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      terminalName,
                      style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: Color(0xFF1F2937),
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 2),
                    Text(
                      distance,
                      style: const TextStyle(
                        fontSize: 12,
                        color: Color(0xFF6B7280),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 6,
            runSpacing: 6,
            children: routeTags.map((tag) {
              Color tagColor;
              if (tag.startsWith('MI-')) {
                tagColor = const Color(0xFFF97316); // Orange
              } else if (tag.contains('B')) {
                tagColor = const Color(0xFF10B981); // Green
              } else {
                tagColor = const Color(0xFFEF4444); // Red
              }
              
              return Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: tagColor.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(6),
                  border: Border.all(
                    color: tagColor.withOpacity(0.3),
                    width: 1,
                  ),
                ),
                child: Text(
                  tag,
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    color: tagColor,
                  ),
                ),
              );
            }).toList(),
          ),
        ],
      ),
    );
  }
}

class NearbyTerminalsList extends StatelessWidget {
  const NearbyTerminalsList({super.key});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Padding(
          padding: EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          child: Text(
            'Nearby Terminals',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w600,
              color: Color(0xFF1F2937),
            ),
          ),
        ),
        SizedBox(
          height: 140,
          child: ListView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16),
            children: const [
              NearbyTerminal(
                terminalName: 'Tamiya Terminal',
                distance: '0.2 miles',
                routeTags: ['MI-04A', '21B', '13C'],
              ),
              SizedBox(width: 12),
              NearbyTerminal(
                terminalName: 'Tamiya Terminal',
                distance: '0.2 miles',
                routeTags: ['MI-04A', '21B', '13C'],
              ),
              SizedBox(width: 12),
              NearbyTerminal(
                terminalName: 'Tamiya Terminal',
                distance: '0.2 miles',
                routeTags: ['MI-04A', '21B', '13C'],
              ),
            ],
          ),
        ),
      ],
    );
  }
}
