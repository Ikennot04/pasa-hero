import 'package:cloud_firestore/cloud_firestore.dart';
import '../models/bus_stop.dart';

/// Loads bus stops from the Firestore collection [bus_stops].
const String busStopsCollection = 'bus_stops';

class BusStopsService {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  /// One-time load of all bus stops. Uses sample data when collection is empty or read fails.
  Future<List<BusStop>> getBusStops() async {
    try {
      final snapshot = await _firestore.collection(busStopsCollection).get();
      final stops = snapshot.docs
          .map((doc) => BusStop.fromFirestore(doc.id, doc.data()))
          .where((stop) => stop.lat != 0.0 && stop.lng != 0.0)
          .toList();
      if (stops.isNotEmpty) return stops;
    } catch (e) {
      // Firestore error (e.g. rules, network): fall back to sample data
      assert(() {
        print('⚠️ [BusStopsService] Firestore read failed: $e');
        return true;
      }());
    }
    return _getSampleBusStops();
  }

  /// Sample bus stops near default map center (Manila 14.6, 121.0) for development or empty collection.
  static List<BusStop> _getSampleBusStops() {
    return [
      const BusStop(id: 'BS-001', name: 'Pacific Terminal', route: '01K', lat: 14.6020, lng: 120.9820),
      const BusStop(id: 'BS-002', name: 'Ayala Center Bus Stop', route: '02A', lat: 14.5980, lng: 120.9860),
      const BusStop(id: 'BS-003', name: 'SM City Manila', route: '03D', lat: 14.5950, lng: 120.9780),
      const BusStop(id: 'BS-004', name: 'Robinsons Ermita', route: '01K', lat: 14.5780, lng: 120.9840),
      const BusStop(id: 'BS-005', name: 'LRT Central', route: '13B', lat: 14.5890, lng: 120.9920),
    ];
  }

  /// Real-time stream of bus stops (updates when collection changes).
  Stream<List<BusStop>> busStopsStream() {
    return _firestore.collection(busStopsCollection).snapshots().map((snapshot) {
      return snapshot.docs
          .map((doc) => BusStop.fromFirestore(doc.id, doc.data()))
          .where((stop) => stop.lat != 0.0 && stop.lng != 0.0)
          .toList();
    });
  }
}
