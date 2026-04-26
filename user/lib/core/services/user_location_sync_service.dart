import 'dart:async';

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/foundation.dart';
import 'package:geolocator/geolocator.dart';

import 'location_service.dart';

const String userLocationsCollection = 'user_locations';

/// Periodically writes signed-in user's location to Firestore so operators
/// can see users on their map.
class UserLocationSyncService {
  UserLocationSyncService._();
  static final UserLocationSyncService instance = UserLocationSyncService._();

  final LocationService _locationService = LocationService();
  Timer? _timer;
  bool _tickInProgress = false;

  void start({Duration interval = const Duration(seconds: 20)}) {
    stop();
    Future<void> kickoff() async {
      await _tick();
      _timer = Timer.periodic(interval, (_) => _tick());
    }

    unawaited(kickoff());
  }

  void stop() {
    _timer?.cancel();
    _timer = null;
    _tickInProgress = false;
  }

  Future<void> _publish(User user, Position pos) async {
    await FirebaseFirestore.instance.collection(userLocationsCollection).doc(user.uid).set(
      {
        'uid': user.uid,
        'email': user.email,
        'latitude': pos.latitude,
        'longitude': pos.longitude,
        'accuracyMeters': pos.accuracy,
        'role': 'user',
        'roleid': 1,
        'online': 1,
        'status': 1,
        'updatedAt': FieldValue.serverTimestamp(),
      },
      SetOptions(merge: true),
    );
    debugPrint(
      '[UserLocationSync] published uid=${user.uid} '
      'lat=${pos.latitude.toStringAsFixed(6)} '
      'lng=${pos.longitude.toStringAsFixed(6)} '
      'acc=${pos.accuracy.toStringAsFixed(1)}m',
    );
  }

  Future<void> _tryLastKnown(User user) async {
    try {
      final last = await Geolocator.getLastKnownPosition().timeout(const Duration(seconds: 8));
      if (last == null) return;
      final age = DateTime.now().difference(last.timestamp);
      if (age > const Duration(hours: 2)) return;
      await _publish(user, last);
    } catch (e) {
      debugPrint('[UserLocationSync] last-known fallback failed: $e');
    }
  }

  Future<void> _tick() async {
    final user = FirebaseAuth.instance.currentUser;
    if (user == null) return;
    if (_tickInProgress) return;
    _tickInProgress = true;
    try {
      final hasPermission = await _locationService.requestPermission();
      if (!hasPermission) {
        debugPrint('[UserLocationSync] permission denied, trying last-known fallback');
        await _tryLastKnown(user);
        return;
      }
      final pos = await _locationService.getCurrentPosition(
        preferLowAccuracy: false,
        useCachedPosition: true,
        forceRefresh: false,
      );
      await _publish(user, pos);
    } catch (e, st) {
      debugPrint('[UserLocationSync] tick failed: $e\n$st');
      await _tryLastKnown(user);
    } finally {
      _tickInProgress = false;
    }
  }
}

