import 'dart:async';
import 'dart:convert';
import 'dart:io' show HttpException, SocketException;

import 'package:firebase_auth/firebase_auth.dart';
import 'package:http/http.dart' as http;

import 'notification_badge_service.dart';
import 'subscription_ids_service.dart';

/// Fetches inbox unread count from the backend and updates [NotificationBadgeService]
/// without loading the full notifications UI.
class NotificationInboxBadgeSync {
  NotificationInboxBadgeSync._();

  static const String _inboxBase =
      'https://pasa-hero-server.vercel.app/api/notifications/inbox';

  static bool _isRetryableInboxNetworkError(Object e) {
    if (e is TimeoutException) return true;
    if (e is SocketException) return true;
    if (e is HttpException) return true;
    if (e is http.ClientException) return true;
    final m = e.toString().toLowerCase();
    return m.contains('connection abort') ||
        m.contains('connection closed') ||
        m.contains('connection reset') ||
        m.contains('broken pipe') ||
        m.contains('socketexception') ||
        m.contains('failed host lookup') ||
        m.contains('network is unreachable');
  }

  static Future<_UnreadFetch> _fetchUnreadForUserId(String userId) async {
    if (userId.trim().isEmpty) {
      return const _UnreadFetch(ok: false, unread: 0);
    }
    final uri = Uri.parse(
      '$_inboxBase/${Uri.encodeComponent(userId.trim())}',
    );
    const timeout = Duration(seconds: 22);

    for (var attempt = 0; attempt < 2; attempt++) {
      try {
        if (attempt > 0) {
          await Future<void>.delayed(const Duration(milliseconds: 600));
        }
        final response = await http
            .get(
              uri,
              headers: const {'Accept': 'application/json'},
            )
            .timeout(timeout);

        if (response.statusCode < 200 || response.statusCode >= 300) {
          return const _UnreadFetch(ok: false, unread: 0);
        }

        final decoded = jsonDecode(response.body);
        final data = decoded is Map<String, dynamic> ? decoded['data'] : null;
        var unreadCount = 0;
        final counts = data is Map<String, dynamic> ? data['counts'] : null;
        if (counts is Map<String, dynamic>) {
          final u = counts['unread'];
          if (u is num) unreadCount = u.toInt();
        }
        return _UnreadFetch(ok: true, unread: unreadCount);
      } catch (e) {
        if (attempt == 0 && _isRetryableInboxNetworkError(e)) {
          continue;
        }
        break;
      }
    }
    return _UnreadFetch(ok: false, unread: 0);
  }

  /// Updates server-backed unread dot from the inbox API (no UI loading state).
  static Future<void> syncServerUnreadBadgeSilently() async {
    final firebaseUser = FirebaseAuth.instance.currentUser;
    if (firebaseUser == null) {
      NotificationBadgeService.instance.setServerUnreadCount(0);
      return;
    }

    final backendUserId = await SubscriptionIdsService.backendUserIdForFirebaseUid(
      firebaseUser.uid,
      email: firebaseUser.email,
    );

    final idsToTry = <String>[];
    if (backendUserId != null && backendUserId.trim().isNotEmpty) {
      idsToTry.add(backendUserId.trim());
    }

    if (idsToTry.isEmpty) {
      NotificationBadgeService.instance.setServerUnreadCount(0);
      return;
    }

    var unread = 0;
    var gotOk = false;
    for (final id in idsToTry) {
      final r = await _fetchUnreadForUserId(id);
      if (!r.ok) continue;
      unread = r.unread;
      gotOk = true;
      break;
    }

    if (gotOk) {
      NotificationBadgeService.instance.setServerUnreadCount(unread);
    }
  }
}

class _UnreadFetch {
  const _UnreadFetch({required this.ok, required this.unread});

  final bool ok;
  final int unread;
}
