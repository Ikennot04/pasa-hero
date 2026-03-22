import 'dart:async';

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/foundation.dart';
import 'package:geolocator/geolocator.dart';

import '../../features/profile/screen/profile_screen_data.dart';
import 'location_service.dart';

/// Firestore collection where operators publish live GPS (read by passenger app).
const String operatorLocationsCollection = 'operator_locations';

/// Periodically writes the signed-in operator's position to Firestore so riders
/// can see buses near them.
class OperatorLocationSyncService {
  OperatorLocationSyncService._();
  static final OperatorLocationSyncService instance = OperatorLocationSyncService._();

  final LocationService _locationService = LocationService();
  Timer? _timer;
  bool _tickInProgress = false;
  int _session = 0;

  void start({Duration interval = const Duration(seconds: 30)}) {
    stop();
    final sid = _session;
    // Defer first publish slightly so RouteScreen / profile can set [locationSyncRouteFallback]
    // before we write [operator_locations.routeCode] (avoids one empty-route write on cold start).
    Future<void> kickoff() async {
      await Future<void>.delayed(const Duration(milliseconds: 1500));
      if (sid != _session) return;
      await _tick();
      if (sid != _session) return;
      _timer = Timer.periodic(interval, (_) => _tick());
    }

    unawaited(kickoff());
  }

  void stop() {
    _session++;
    _timer?.cancel();
    _timer = null;
    _tickInProgress = false;
  }

  Future<bool> _ensureForegroundLocationPermission() async {
    try {
      final enabled = await Geolocator.isLocationServiceEnabled();
      if (!enabled) {
        debugPrint('[OperatorLocationSync] location services disabled');
        return false;
      }
      var p = await Geolocator.checkPermission();
      if (p == LocationPermission.denied) {
        p = await Geolocator.requestPermission();
      }
      if (p == LocationPermission.denied || p == LocationPermission.deniedForever) {
        debugPrint('[OperatorLocationSync] location permission: $p');
        return false;
      }
      return true;
    } catch (e) {
      debugPrint('[OperatorLocationSync] permission check failed: $e');
      return false;
    }
  }

  Future<void> _publishLocation(User user, Position pos, String codeForFirestore) async {
    await FirebaseFirestore.instance
        .collection(operatorLocationsCollection)
        .doc(user.uid)
        .set(
      {
        'uid': user.uid,
        'latitude': pos.latitude,
        'longitude': pos.longitude,
        'accuracyMeters': pos.accuracy,
        'routeCode': codeForFirestore,
        'updatedAt': FieldValue.serverTimestamp(),
      },
      SetOptions(merge: true),
    );
  }

  /// If a full GPS fix fails, still publish last known coordinates so riders see the bus.
  Future<void> _tryLastKnownFallback(User user) async {
    try {
      final last = await Geolocator.getLastKnownPosition().timeout(
        const Duration(seconds: 4),
      );
      if (last == null) return;
      final age = DateTime.now().difference(last.timestamp);
      if (age > const Duration(minutes: 20)) return;

      final codeForFirestore = await ProfileDataService.resolveRouteCodeForLocationPublish();

      await _publishLocation(user, last, codeForFirestore);
      debugPrint(
        '[OperatorLocationSync] published last-known fallback (age ${age.inMinutes}m)',
      );
    } catch (e) {
      debugPrint('[OperatorLocationSync] last-known fallback failed: $e');
    }
  }

  Future<void> _tick() async {
    final user = FirebaseAuth.instance.currentUser;
    if (user == null) return;
    if (_tickInProgress) return;
    _tickInProgress = true;
    try {
      final ok = await _ensureForegroundLocationPermission();
      if (!ok) {
        await _tryLastKnownFallback(user);
        return;
      }

      final pos = await _locationService.getCurrentPosition(
        preferLowAccuracy: false,
        useCachedPosition: true,
        forceRefresh: false,
      );
      final codeForFirestore = await ProfileDataService.resolveRouteCodeForLocationPublish();

      await _publishLocation(user, pos, codeForFirestore);
    } catch (e, st) {
      debugPrint('[OperatorLocationSync] tick failed: $e\n$st');
      await _tryLastKnownFallback(user);
    } finally {
      _tickInProgress = false;
    }
  }
}
