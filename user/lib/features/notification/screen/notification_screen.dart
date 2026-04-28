import 'dart:convert';

import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;

import '../../../core/services/subscription_ids_service.dart';
import '../../../core/themes/validation_theme.dart';

class NotificationScreen extends StatefulWidget {
  const NotificationScreen({super.key});

  @override
  State<NotificationScreen> createState() => _NotificationScreenState();
}

class _NotificationScreenState extends State<NotificationScreen> {
  static const String _notificationsInboxApiBase =
      'https://pasa-hero-server.vercel.app/api/notifications/inbox';

  bool _loading = true;
  String? _error;
  List<Map<String, dynamic>> _inboxItems = const [];

  @override
  void initState() {
    super.initState();
    _loadInbox();
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

      List<Map<String, dynamic>> items = <Map<String, dynamic>>[];
      String? lastError;
      for (final id in idsToTry) {
        final result = await _fetchInboxByUserId(id);
        if (result.error != null) {
          lastError = result.error;
          continue;
        }
        items = result.items;
        if (items.isNotEmpty) {
          break;
        }
      }
      if (items.isEmpty && lastError != null) {
        throw Exception(lastError);
      }

      if (!mounted) return;
      setState(() {
        _inboxItems = items;
        _loading = false;
      });
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
      return _InboxFetchResult(items: items);
    } catch (e) {
      return _InboxFetchResult(items: const [], error: e.toString());
    }
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

  Color _statusColorFor(Map<String, dynamic> item) {
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
                  child: _buildBody(),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildBody() {
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
    if (_inboxItems.isEmpty) {
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
    return RefreshIndicator(
      onRefresh: _loadInbox,
      child: ListView.separated(
        itemCount: _inboxItems.length,
        separatorBuilder: (_, _) => const SizedBox(height: 12),
        itemBuilder: (context, index) {
          final item = _inboxItems[index];
          return _buildNotificationCard(
            title: _resolveTitle(item),
            description: _resolveDescription(item),
            timestamp: _formatTimestamp(_resolveCreatedAt(item)),
            statusColor: _statusColorFor(item),
          );
        },
      ),
    );
  }

  Widget _buildNotificationCard({
    required String title,
    required String description,
    required String timestamp,
    required Color statusColor,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: ValidationTheme.backgroundWhite,
        borderRadius: BorderRadius.circular(12),
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
    this.error,
  });

  final List<Map<String, dynamic>> items;
  final String? error;
}
