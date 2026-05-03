import 'dart:async';
import 'dart:convert';

import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;

import '../../../core/services/driver_status_read_service.dart';
import '../../../core/services/notification_badge_service.dart';
import '../../../core/services/subscription_ids_service.dart';
import '../../../core/themes/validation_theme.dart';

class NotificationScreen extends StatefulWidget {
  const NotificationScreen({super.key});

  @override
  State<NotificationScreen> createState() => _NotificationScreenState();
}

class _MergedNotificationRow {
  _MergedNotificationRow._({
    required this.sortTime,
    this.inboxItem,
    this.followedRouteCode,
    this.freeRide,
  });

  factory _MergedNotificationRow.fromInbox(
    Map<String, dynamic> item,
    DateTime sortTime,
  ) {
    return _MergedNotificationRow._(
      sortTime: sortTime,
      inboxItem: item,
    );
  }

  factory _MergedNotificationRow.fromFollowedFreeRide({
    required String routeCode,
    required FreeRideStatusSnapshot freeRide,
  }) {
    return _MergedNotificationRow._(
      sortTime: freeRide.startTime ?? DateTime.now(),
      followedRouteCode: routeCode,
      freeRide: freeRide,
    );
  }

  final DateTime sortTime;
  final Map<String, dynamic>? inboxItem;
  final String? followedRouteCode;
  final FreeRideStatusSnapshot? freeRide;

  bool get isFollowedFreeRide =>
      freeRide != null &&
      freeRide!.isActive &&
      followedRouteCode != null;
}

class _NotificationScreenState extends State<NotificationScreen> {
  static const String _notificationsInboxApiBase =
      'https://pasa-hero-server.vercel.app/api/notifications/inbox';

  bool _loading = true;
  String? _error;
  List<Map<String, dynamic>> _inboxItems = const [];

  /// Followed route code (uppercase) → latest free ride snapshot from Firestore.
  final Map<String, FreeRideStatusSnapshot?> _freeRideByRouteCode = {};

  final List<StreamSubscription<FreeRideStatusSnapshot?>> _freeRideSubscriptions = [];

  int _lastInboxUnread = 0;
  String? _activeInboxUserId;

  @override
  void initState() {
    super.initState();
    NotificationBadgeService.instance.setOnTabOpenedHandler(_onNotificationTabOpened);
    _loadInbox();
  }

  @override
  void dispose() {
    NotificationBadgeService.instance.setOnTabOpenedHandler(null);
    for (final s in _freeRideSubscriptions) {
      s.cancel();
    }
    super.dispose();
  }

  void _onNotificationTabOpened() {
    unawaited(_applyViewedNotifications());
  }

  Future<void> _applyViewedNotifications() async {
    await NotificationBadgeService.instance.markNotificationsTabOpened();
    _lastInboxUnread = 0;

    final userId = _activeInboxUserId;
    if (userId == null || userId.isEmpty) return;

    final ids = <String>[];
    for (final item in _inboxItems) {
      if (item['is_read'] == true) continue;
      final id = item['_id']?.toString().trim();
      if (id != null && id.isNotEmpty) ids.add(id);
    }
    if (ids.isEmpty) return;

    try {
      final uri = Uri.parse(
        'https://pasa-hero-server.vercel.app/api/user-notifications/read',
      );
      final response = await http
          .patch(
            uri,
            headers: const {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
            body: jsonEncode({
              'user_id': userId,
              'user_notification_ids': ids,
            }),
          )
          .timeout(const Duration(seconds: 15));
      if (response.statusCode >= 200 &&
          response.statusCode < 300 &&
          mounted) {
        setState(() {
          _inboxItems = _inboxItems.map((item) {
            if (item['is_read'] == true) return item;
            final copy = Map<String, dynamic>.from(item);
            copy['is_read'] = true;
            return copy;
          }).toList();
        });
      }
    } catch (_) {}
  }

  void _syncNavBadge() {
    NotificationBadgeService.instance.setServerUnreadCount(_lastInboxUnread);
    NotificationBadgeService.instance.setFreeRideMap(_freeRideByRouteCode);
  }

  void _cancelFreeRideSubscriptions() {
    for (final s in _freeRideSubscriptions) {
      s.cancel();
    }
    _freeRideSubscriptions.clear();
    _freeRideByRouteCode.clear();
  }

  void _attachFreeRideListeners(Set<String> routeCodesUpper) {
    _cancelFreeRideSubscriptions();
    if (routeCodesUpper.isEmpty) return;

    for (final routeCode in routeCodesUpper) {
      _freeRideByRouteCode[routeCode] = null;
      final sub = DriverStatusReadService.instance
          .freeRideStream(routeCode)
          .listen((snapshot) {
        if (!mounted) return;
        setState(() {
          _freeRideByRouteCode[routeCode] = snapshot;
        });
        _syncNavBadge();
      });
      _freeRideSubscriptions.add(sub);
    }
  }

  Future<void> _loadInbox() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final firebaseUser = FirebaseAuth.instance.currentUser;
      if (firebaseUser == null) {
        if (!mounted) return;
        setState(() {
          _loading = false;
          _error = 'Please sign in first.';
        });
        _cancelFreeRideSubscriptions();
        _lastInboxUnread = 0;
        _activeInboxUserId = null;
        NotificationBadgeService.instance.setServerUnreadCount(0);
        NotificationBadgeService.instance.setFreeRideMap({});
        return;
      }

      final backendUserId =
          await SubscriptionIdsService.backendUserIdForFirebaseUid(
        firebaseUser.uid,
        email: firebaseUser.email,
      );
      final effectiveUserId =
          (backendUserId != null && backendUserId.isNotEmpty)
              ? backendUserId
              : firebaseUser.uid;

      final idsToTry = <String>[];
      if (backendUserId != null && backendUserId.isNotEmpty) {
        idsToTry.add(backendUserId);
      }
      if (!idsToTry.contains(firebaseUser.uid)) {
        idsToTry.add(firebaseUser.uid);
      }
      if (!idsToTry.contains(effectiveUserId)) {
        idsToTry.add(effectiveUserId);
      }

      final routeIdByCode = await SubscriptionIdsService.fetchRouteIdByCodeMap();
      final followedRouteCodes =
          await SubscriptionIdsService.fetchSubscribedRouteCodes(
        effectiveUserId: effectiveUserId,
        routeIdByCode: routeIdByCode,
      );

      List<Map<String, dynamic>> items = <Map<String, dynamic>>[];
      String? lastError;
      var serverUnread = 0;
      String? successInboxUserId;
      for (final id in idsToTry) {
        final result = await _fetchInboxByUserId(id);
        if (result.error != null) {
          lastError = result.error;
          continue;
        }
        items = result.items;
        serverUnread = result.unreadCount;
        successInboxUserId = id;
        break;
      }
      if (items.isEmpty && lastError != null) {
        throw Exception(lastError);
      }

      if (!mounted) return;
      _lastInboxUnread = serverUnread;
      _activeInboxUserId = successInboxUserId;
      setState(() {
        _inboxItems = items;
        _loading = false;
      });

      _attachFreeRideListeners(followedRouteCodes);
      _syncNavBadge();
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = e.toString().replaceFirst('Exception: ', '');
      });
    }
  }

  Future<_InboxFetchResult> _fetchInboxByUserId(String userId) async {
    try {
      final response = await http.get(
        Uri.parse('$_notificationsInboxApiBase/$userId'),
        headers: const {'Accept': 'application/json'},
      );

      if (response.statusCode < 200 || response.statusCode >= 300) {
        return _InboxFetchResult(
          items: const [],
          error: 'Failed to load notifications (${response.statusCode})',
        );
      }

      final decoded = jsonDecode(response.body);
      final data = decoded is Map<String, dynamic> ? decoded['data'] : null;
      final inbox = data is Map<String, dynamic> ? data['inbox'] : null;
      final items = <Map<String, dynamic>>[];
      if (inbox is List) {
        for (final item in inbox) {
          if (item is Map<String, dynamic>) {
            items.add(item);
          }
        }
      }
      var unreadCount = 0;
      final counts = data is Map<String, dynamic> ? data['counts'] : null;
      if (counts is Map<String, dynamic>) {
        final u = counts['unread'];
        if (u is num) unreadCount = u.toInt();
      }
      return _InboxFetchResult(items: items, unreadCount: unreadCount);
    } catch (e) {
      return _InboxFetchResult(items: const [], error: e.toString());
    }
  }

  bool _isInboxUnread(Map<String, dynamic> item) {
    final v = item['is_read'];
    if (v == null) return true;
    if (v is bool) return !v;
    return v.toString().toLowerCase() != 'true';
  }

  /// New = unread inbox + active free ride on followed routes. Older = read inbox (kept on screen).
  ({List<_MergedNotificationRow> fresh, List<_MergedNotificationRow> older})
      _partitionNewAndOlder() {
    final fresh = <_MergedNotificationRow>[];
    final older = <_MergedNotificationRow>[];

    for (final item in _inboxItems) {
      final t = _resolveCreatedAt(item) ?? DateTime.fromMillisecondsSinceEpoch(0);
      final row = _MergedNotificationRow.fromInbox(item, t);
      if (_isInboxUnread(item)) {
        fresh.add(row);
      } else {
        older.add(row);
      }
    }

    for (final e in _freeRideByRouteCode.entries) {
      final snap = e.value;
      if (snap == null || !snap.isActive) continue;
      final code = e.key;
      if (code.isEmpty) continue;
      fresh.add(
        _MergedNotificationRow.fromFollowedFreeRide(
          routeCode: code,
          freeRide: snap,
        ),
      );
    }

    fresh.sort((a, b) => b.sortTime.compareTo(a.sortTime));
    older.sort((a, b) => b.sortTime.compareTo(a.sortTime));
    return (fresh: fresh, older: older);
  }

  String _resolveTitle(Map<String, dynamic> item) {
    final notification = item['notification_id'];
    if (notification is Map<String, dynamic>) {
      final title = notification['title']?.toString().trim();
      if (title != null && title.isNotEmpty) {
        return title;
      }
    }
    return 'Notification';
  }

  String _resolveDescription(Map<String, dynamic> item) {
    final notification = item['notification_id'];
    if (notification is Map<String, dynamic>) {
      final message = notification['message']?.toString().trim();
      if (message != null && message.isNotEmpty) {
        return message;
      }
    }
    return 'No details available.';
  }

  DateTime? _resolveCreatedAt(Map<String, dynamic> item) {
    final notification = item['notification_id'];
    final raw = (notification is Map<String, dynamic>)
        ? notification['createdAt'] ?? item['createdAt']
        : item['createdAt'];
    if (raw == null) return null;
    try {
      return DateTime.parse(raw.toString()).toLocal();
    } catch (_) {
      return null;
    }
  }

  String _formatTimestamp(DateTime? dt) {
    if (dt == null) return '';
    final now = DateTime.now();
    final diff = now.difference(dt);
    if (diff.inMinutes < 1) return 'Just now';
    if (diff.inMinutes < 60) return '${diff.inMinutes} min ago';
    if (diff.inHours < 24) return '${diff.inHours}h ago';
    if (diff.inDays < 7) return '${diff.inDays}d ago';
    return '${dt.month}/${dt.day}/${dt.year}';
  }

  String _freeRideDescription(FreeRideStatusSnapshot snap, String routeCode) {
    final until = snap.endTime;
    if (until != null) {
      final local = until.toLocal();
      final now = DateTime.now();
      final sameDay = local.year == now.year &&
          local.month == now.month &&
          local.day == now.day;
      final datePart =
          sameDay ? 'today' : '${local.month}/${local.day}/${local.year}';
      final hm =
          '${local.hour.toString().padLeft(2, '0')}:${local.minute.toString().padLeft(2, '0')}';
      return 'Free ride is active on route $routeCode until $hm on $datePart. '
          'Board while the promo is on.';
    }
    return 'A free ride is active right now on route $routeCode.';
  }

  Color _statusColorForInbox(Map<String, dynamic> item) {
    final notification = item['notification_id'];
    if (notification is! Map<String, dynamic>) {
      return ValidationTheme.primaryBlue;
    }
    final type = notification['notification_type']?.toString().toLowerCase();
    switch (type) {
      case 'delay':
      case 'full':
      case 'skipped_stop':
        return ValidationTheme.errorRed;
      case 'arrival_reported':
      case 'arrival_confirmed':
      case 'departure_reported':
      case 'departure_confirmed':
        return ValidationTheme.successGreen;
      default:
        return ValidationTheme.primaryBlue;
    }
  }

  @override
  Widget build(BuildContext context) {
    final screenWidth = MediaQuery.of(context).size.width;
    final partitioned = _partitionNewAndOlder();

    return Scaffold(
      body: Container(
        width: double.infinity,
        height: double.infinity,
        decoration: ValidationTheme.gradientDecoration,
        child: SafeArea(
          child: Column(
            children: [
              Container(
                padding: EdgeInsets.symmetric(
                  horizontal: screenWidth * 0.05,
                  vertical: 20,
                ),
                child: const Text(
                  'Notifications',
                  style: TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.w700,
                    color: ValidationTheme.textLight,
                  ),
                  textAlign: TextAlign.center,
                ),
              ),
              Expanded(
                child: Container(
                  padding: EdgeInsets.symmetric(horizontal: screenWidth * 0.05),
                  child: _buildBody(partitioned),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildBody(
    ({List<_MergedNotificationRow> fresh, List<_MergedNotificationRow> older})
        partitioned,
  ) {
    if (_loading) {
      return const Center(child: CircularProgressIndicator());
    }
    if (_error != null) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(
              _error!,
              textAlign: TextAlign.center,
              style: const TextStyle(color: ValidationTheme.textPrimary),
            ),
            const SizedBox(height: 12),
            TextButton(
              onPressed: _loadInbox,
              child: const Text('Retry'),
            ),
          ],
        ),
      );
    }
    final fresh = partitioned.fresh;
    final older = partitioned.older;
    if (fresh.isEmpty && older.isEmpty) {
      return const Center(
        child: Text(
          'No notifications yet.',
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w600,
            color: ValidationTheme.textPrimary,
          ),
        ),
      );
    }

    final children = <Widget>[];
    if (fresh.isNotEmpty) {
      children.add(_sectionHeader('New'));
      for (var i = 0; i < fresh.length; i++) {
        if (i > 0) children.add(const SizedBox(height: 12));
        children.add(_rowToCard(fresh[i], emphasizeNew: true));
      }
    }
    if (older.isNotEmpty) {
      if (children.isNotEmpty) {
        children.add(const SizedBox(height: 20));
      }
      children.add(_sectionHeader('Older'));
      for (var i = 0; i < older.length; i++) {
        if (i > 0) children.add(const SizedBox(height: 12));
        children.add(_rowToCard(older[i], emphasizeNew: false));
      }
    }

    return RefreshIndicator(
      color: ValidationTheme.textPrimary,
      onRefresh: _loadInbox,
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.only(bottom: 24),
        children: children,
      ),
    );
  }

  Widget _sectionHeader(String title) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8, top: 4),
      child: Text(
        title,
        style: const TextStyle(
          fontSize: 14,
          fontWeight: FontWeight.w700,
          color: ValidationTheme.textPrimary,
          letterSpacing: 0.3,
        ),
      ),
    );
  }

  Widget _rowToCard(_MergedNotificationRow row, {required bool emphasizeNew}) {
    if (row.isFollowedFreeRide) {
      final snap = row.freeRide!;
      final code = row.followedRouteCode!;
      return _buildNotificationCard(
        title: 'Free ride — Route $code',
        description: _freeRideDescription(snap, code),
        timestamp: _formatTimestamp(snap.startTime ?? snap.endTime),
        statusColor: ValidationTheme.successGreen,
        emphasizeNew: emphasizeNew,
      );
    }
    final item = row.inboxItem!;
    return _buildNotificationCard(
      title: _resolveTitle(item),
      description: _resolveDescription(item),
      timestamp: _formatTimestamp(_resolveCreatedAt(item)),
      statusColor: _statusColorForInbox(item),
      emphasizeNew: emphasizeNew,
    );
  }

  Widget _buildNotificationCard({
    required String title,
    required String description,
    required String timestamp,
    required Color statusColor,
    bool emphasizeNew = false,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: emphasizeNew
            ? ValidationTheme.backgroundWhite
            : const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(12),
        border: emphasizeNew
            ? Border.all(
                color: ValidationTheme.primaryBlue.withOpacity(0.35),
                width: 1,
              )
            : Border.all(
                color: const Color(0xFFE2E8F0),
                width: 1,
              ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.04),
            blurRadius: 3,
            offset: const Offset(0, 1),
          ),
        ],
      ),
      child: Stack(
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                  color: ValidationTheme.textPrimary,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                description,
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.normal,
                  color: ValidationTheme.textPrimary,
                ),
              ),
              const SizedBox(height: 12),
              Align(
                alignment: Alignment.centerRight,
                child: Text(
                  timestamp,
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: ValidationTheme.primaryBlue,
                  ),
                ),
              ),
            ],
          ),
          Positioned(
            top: 0,
            right: 0,
            child: Container(
              width: 10,
              height: 10,
              decoration: BoxDecoration(
                color: statusColor,
                shape: BoxShape.circle,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _InboxFetchResult {
  const _InboxFetchResult({
    required this.items,
    this.unreadCount = 0,
    this.error,
  });

  final List<Map<String, dynamic>> items;
  final int unreadCount;
  final String? error;
}
