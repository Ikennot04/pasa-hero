import 'dart:math' as math;

import 'package:google_maps_flutter/google_maps_flutter.dart';

/// One online rider position from `user_locations`.
class WaitingRiderInput {
  const WaitingRiderInput({
    required this.docId,
    required this.lat,
    required this.lng,
    this.updatedAt,
  });

  final String docId;
  final double lat;
  final double lng;
  final DateTime? updatedAt;
}

enum WaitingDemandTier {
  green,
  yellow,
  red,
}

WaitingDemandTier waitingDemandTierForCount(int count) {
  if (count <= 15) return WaitingDemandTier.green;
  if (count <= 30) return WaitingDemandTier.yellow;
  return WaitingDemandTier.red;
}

extension WaitingDemandTierAssets on WaitingDemandTier {
  String get assetPath {
    switch (this) {
      case WaitingDemandTier.green:
        return 'assets/images/green_marker.png';
      case WaitingDemandTier.yellow:
        return 'assets/images/yellow_marker.png';
      case WaitingDemandTier.red:
        return 'assets/images/red_marker.png';
    }
  }

  double get fallbackMarkerHue {
    switch (this) {
      case WaitingDemandTier.green:
        return BitmapDescriptor.hueGreen;
      case WaitingDemandTier.yellow:
        return BitmapDescriptor.hueOrange;
      case WaitingDemandTier.red:
        return BitmapDescriptor.hueRed;
    }
  }
}

/// One map marker representing riders grouped in a small geographic cell.
class WaitingClusterModel {
  WaitingClusterModel({
    required this.markerIdValue,
    required this.position,
    required this.count,
    this.lastUpdated,
  });

  final String markerIdValue;
  final LatLng position;
  final int count;
  final DateTime? lastUpdated;

  WaitingDemandTier get tier => waitingDemandTierForCount(count);
}

/// Groups riders in the same ~[radiusMeters] grid cell into one cluster (centroid position).
/// Fast O(n) for Firestore snapshot sizes; refines in near real time as locations update.
List<WaitingClusterModel> buildWaitingClusters(
  List<WaitingRiderInput> riders, {
  double radiusMeters = 120,
}) {
  if (riders.isEmpty) return [];

  final avgLat =
      riders.fold<double>(0, (s, r) => s + r.lat) / riders.length;
  final latDegree = radiusMeters / 111320.0;
  final lngDegree = radiusMeters /
      (111320.0 *
          math.cos(avgLat.clamp(-85.0, 85.0) * math.pi / 180.0));

  final buckets = <String, List<WaitingRiderInput>>{};
  for (final r in riders) {
    final gi = (r.lat / latDegree).floor();
    final gj = (r.lng / lngDegree).floor();
    final key = '$gi:$gj';
    buckets.putIfAbsent(key, () => []).add(r);
  }

  final out = <WaitingClusterModel>[];
  for (final e in buckets.entries) {
    final list = e.value;
    final sumLat = list.fold<double>(0, (s, r) => s + r.lat);
    final sumLng = list.fold<double>(0, (s, r) => s + r.lng);
    final n = list.length;
    DateTime? newest;
    for (final r in list) {
      final t = r.updatedAt;
      if (t != null && (newest == null || t.isAfter(newest))) newest = t;
    }
    final safeKey = e.key.replaceAll(RegExp(r'[^a-zA-Z0-9_]'), '_');
    out.add(
      WaitingClusterModel(
        markerIdValue: 'waiting_cluster_$safeKey',
        position: LatLng(sumLat / n, sumLng / n),
        count: n,
        lastUpdated: newest,
      ),
    );
  }

  out.sort((a, b) => b.count.compareTo(a.count));
  return out;
}
