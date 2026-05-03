import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'driver_status_read_service.dart';

/// Bottom-nav red dot: server inbox unread + free-ride alerts not yet "seen".
class NotificationBadgeService {
  NotificationBadgeService._();
  static final NotificationBadgeService instance = NotificationBadgeService._();

  static const _kLastVisitMs = 'notification_tab_last_visit_ms';

  final ValueNotifier<bool> showBadge = ValueNotifier(false);

  VoidCallback? _onTabOpened;
  int _serverUnread = 0;
  Map<String, FreeRideStatusSnapshot?> _freeRideByRoute = {};

  void setOnTabOpenedHandler(VoidCallback? handler) {
    _onTabOpened = handler;
  }

  void notifyNotificationTabOpened() {
    _onTabOpened?.call();
  }

  void setServerUnreadCount(int count) {
    _serverUnread = count < 0 ? 0 : count;
    unawaited(_refresh());
  }

  void setFreeRideMap(Map<String, FreeRideStatusSnapshot?> map) {
    _freeRideByRoute = Map<String, FreeRideStatusSnapshot?>.from(map);
    unawaited(_refresh());
  }

  Future<DateTime?> _lastTabVisit() async {
    final p = await SharedPreferences.getInstance();
    final v = p.getInt(_kLastVisitMs);
    if (v == null) return null;
    return DateTime.fromMillisecondsSinceEpoch(v);
  }

  Future<void> _refresh() async {
    final lastVisit = await _lastTabVisit();
    var unseenFreeRide = false;
    for (final snap in _freeRideByRoute.values) {
      if (snap == null || !snap.isActive) continue;
      final ref = snap.startTime ?? snap.updatedAt;
      if (ref == null) {
        if (lastVisit == null) unseenFreeRide = true;
        continue;
      }
      if (lastVisit == null || ref.isAfter(lastVisit)) {
        unseenFreeRide = true;
        break;
      }
    }
    final show = _serverUnread > 0 || unseenFreeRide;
    if (showBadge.value != show) {
      showBadge.value = show;
    }
  }

  /// User opened the Notifications tab: clear server-unread for the dot and remember visit time for free ride.
  Future<void> markNotificationsTabOpened() async {
    final p = await SharedPreferences.getInstance();
    await p.setInt(_kLastVisitMs, DateTime.now().millisecondsSinceEpoch);
    _serverUnread = 0;
    await _refresh();
  }
}
