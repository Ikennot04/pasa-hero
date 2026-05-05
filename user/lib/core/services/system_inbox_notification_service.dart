import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'notification_os_gate.dart';

/// Requests OS notification permission once, then mirrors **new** inbox rows to the tray.
class SystemInboxNotificationService {
  SystemInboxNotificationService._();
  static final SystemInboxNotificationService instance =
      SystemInboxNotificationService._();

  static const _androidChannelId = 'pasa_inbox';
  static const _androidChannelName = 'Inbox notifications';
  static const _prefsPromptKey = 'pasa_inbox_os_notification_prompted_v2';

  final FlutterLocalNotificationsPlugin _plugin =
      FlutterLocalNotificationsPlugin();
  bool _initialized = false;

  /// Inbox row ids we have already announced or used for the first-load baseline.
  final Set<String> _knownUnreadIds = {};
  bool _baselineDone = false;
  int _notifIdSeq = 0;

  Future<void> ensureInitialized() async {
    if (_initialized) return;
    if (kIsWeb) return;
    if (!Platform.isAndroid && !Platform.isIOS) return;

    const androidInit = AndroidInitializationSettings('@mipmap/ic_launcher');
    const darwinInit = DarwinInitializationSettings(
      requestAlertPermission: false,
      requestBadgePermission: false,
      requestSoundPermission: false,
    );
    await _plugin.initialize(
      settings: const InitializationSettings(
        android: androidInit,
        iOS: darwinInit,
      ),
    );

    final android = _plugin.resolvePlatformSpecificImplementation<
        AndroidFlutterLocalNotificationsPlugin>();
    if (android != null) {
      await android.createNotificationChannel(
        const AndroidNotificationChannel(
          _androidChannelId,
          _androidChannelName,
          description: 'Alerts for your PasaHero inbox',
          importance: Importance.high,
        ),
      );
    }
    _initialized = true;
  }

  /// One-time system prompt after login (first time only).
  ///
  /// Waits for the next frame + a short delay so the Android activity is ready;
  /// calls Android 13+ [AndroidFlutterLocalNotificationsPlugin.requestNotificationsPermission]
  /// before falling back to [Permission.notification].
  Future<void> promptPermissionOnceAfterLogin() async {
    if (kIsWeb) return;
    if (!Platform.isAndroid && !Platform.isIOS) return;
    final prefs = await SharedPreferences.getInstance();
    if (prefs.getBool(_prefsPromptKey) == true) return;

    await Future<void>.delayed(const Duration(milliseconds: 600));

    await ensureInitialized();
    if (!_initialized) return;

    await requestOsNotificationPermission();

    await prefs.setBool(_prefsPromptKey, true);
  }

  Future<bool> requestOsNotificationPermission() async {
    if (kIsWeb) return false;
    await ensureInitialized();
    if (!_initialized) return false;

    if (Platform.isAndroid) {
      final android = _plugin.resolvePlatformSpecificImplementation<
          AndroidFlutterLocalNotificationsPlugin>();

      final pluginResult = await android?.requestNotificationsPermission();
      if (pluginResult == true) return true;

      final status = await Permission.notification.request();
      return status.isGranted;
    }
    if (Platform.isIOS) {
      final ios = _plugin.resolvePlatformSpecificImplementation<
          IOSFlutterLocalNotificationsPlugin>();
      final granted = await ios?.requestPermissions(
            alert: true,
            badge: true,
            sound: true,
          ) ??
          false;
      return granted;
    }
    return false;
  }

  Future<bool> _trayAllowedByOs() async {
    if (kIsWeb) return false;
    if (!_initialized) return false;
    if (Platform.isAndroid) {
      final android = _plugin.resolvePlatformSpecificImplementation<
          AndroidFlutterLocalNotificationsPlugin>();
      return await android?.areNotificationsEnabled() ?? false;
    }
    if (Platform.isIOS) {
      final ios = _plugin.resolvePlatformSpecificImplementation<
          IOSFlutterLocalNotificationsPlugin>();
      final settings = await ios?.checkPermissions();
      if (settings == null) return false;
      return settings.isEnabled || settings.isProvisionalEnabled;
    }
    return false;
  }

  void resetForLogout() {
    _baselineDone = false;
    _knownUnreadIds.clear();
    _notifIdSeq = 0;
  }

  /// Call after a successful inbox fetch ([items] = API inbox list).
  Future<void> onInboxReloaded(List<Map<String, dynamic>> items) async {
    if (kIsWeb) return;
    if (!Platform.isAndroid && !Platform.isIOS) return;
    await ensureInitialized();
    if (!_initialized) return;
    if (!await _trayAllowedByOs()) {
      _seedBaselineOnly(items);
      return;
    }

    final unreadIdsNow = <String>{};
    final newUnreadRows = <Map<String, dynamic>>[];
    for (final item in items) {
      if (_inboxItemIsRead(item)) continue;
      final id = _inboxRowId(item);
      if (id == null || id.isEmpty) continue;
      unreadIdsNow.add(id);
      if (_baselineDone && !_knownUnreadIds.contains(id)) {
        newUnreadRows.add(item);
      }
    }

    if (!_baselineDone) {
      _knownUnreadIds
        ..clear()
        ..addAll(unreadIdsNow);
      _baselineDone = true;
      return;
    }

    if (newUnreadRows.isEmpty) return;

    if (NotificationOsGate.suppressInboxTrayWhileViewingInbox) {
      _knownUnreadIds.addAll(unreadIdsNow);
      return;
    }

    newUnreadRows.sort(
      (a, b) => _resolveCreatedAt(b).compareTo(_resolveCreatedAt(a)),
    );

    final title = newUnreadRows.length == 1
        ? _resolveTitle(newUnreadRows.first)
        : 'PasaHero';
    final shortBody = newUnreadRows.length == 1
        ? _resolveDescription(newUnreadRows.first)
        : '${newUnreadRows.length} new notifications';
    final expanded = newUnreadRows
        .map((r) => '• ${_resolveTitle(r)}')
        .join('\n');

    final androidStyle = newUnreadRows.length > 1
        ? BigTextStyleInformation(
            expanded,
            contentTitle: shortBody,
            summaryText: 'Inbox',
          )
        : null;

    try {
      await _plugin.show(
        id: _notifIdSeq++ & 0x7fffffff,
        title: title,
        body: shortBody,
        notificationDetails: NotificationDetails(
          android: AndroidNotificationDetails(
            _androidChannelId,
            _androidChannelName,
            channelDescription: 'Inbox updates from PasaHero',
            importance: Importance.high,
            priority: Priority.high,
            styleInformation: androidStyle,
          ),
          iOS: DarwinNotificationDetails(
            presentAlert: true,
            presentBanner: true,
            presentList: true,
            presentBadge: true,
            presentSound: true,
            subtitle: newUnreadRows.length > 1 ? '${newUnreadRows.length} new' : null,
          ),
        ),
      );
    } catch (_) {}

    _knownUnreadIds.addAll(unreadIdsNow);
  }

  void _seedBaselineOnly(List<Map<String, dynamic>> items) {
    final unreadIdsNow = <String>{};
    for (final item in items) {
      if (_inboxItemIsRead(item)) continue;
      final id = _inboxRowId(item);
      if (id == null || id.isEmpty) continue;
      unreadIdsNow.add(id);
    }
    if (!_baselineDone) {
      _knownUnreadIds
        ..clear()
        ..addAll(unreadIdsNow);
      _baselineDone = true;
    } else {
      _knownUnreadIds.addAll(unreadIdsNow);
    }
  }

  static bool? _parseReadFlag(dynamic v) {
    if (v == null) return null;
    if (v is bool) return v;
    if (v is num) return v != 0;
    final s = v.toString().trim().toLowerCase();
    if (s == 'true' || s == '1') return true;
    if (s == 'false' || s == '0' || s.isEmpty) return false;
    return null;
  }

  static bool _inboxItemIsRead(Map<String, dynamic> item) {
    final flag =
        _parseReadFlag(item['is_read']) ?? _parseReadFlag(item['isRead']);
    return flag == true;
  }

  static String? _inboxRowId(Map<String, dynamic> item) {
    final raw = item['_id'];
    if (raw != null) {
      if (raw is Map) {
        final oid = raw[r'$oid'];
        if (oid != null) {
          final s = oid.toString().trim();
          if (s.isNotEmpty) return s;
        }
      } else {
        final s = raw.toString().trim();
        if (s.isNotEmpty && s != 'null') return s;
      }
    }
    final id = item['id']?.toString().trim();
    if (id != null && id.isNotEmpty) return id;
    return null;
  }

  static String _resolveTitle(Map<String, dynamic> item) {
    final notification = item['notification_id'];
    if (notification is Map<String, dynamic>) {
      final t = notification['title']?.toString().trim();
      if (t != null && t.isNotEmpty) return t;
    }
    return 'Notification';
  }

  static String _resolveDescription(Map<String, dynamic> item) {
    final notification = item['notification_id'];
    if (notification is Map<String, dynamic>) {
      final m = notification['message']?.toString().trim();
      if (m != null && m.isNotEmpty) return m;
    }
    return 'Open the app for details.';
  }

  static DateTime _resolveCreatedAt(Map<String, dynamic> item) {
    final notification = item['notification_id'];
    final raw = (notification is Map<String, dynamic>)
        ? notification['createdAt'] ?? item['createdAt']
        : item['createdAt'];
    if (raw == null) return DateTime.fromMillisecondsSinceEpoch(0);
    try {
      return DateTime.parse(raw.toString()).toLocal();
    } catch (_) {
      return DateTime.fromMillisecondsSinceEpoch(0);
    }
  }
}
