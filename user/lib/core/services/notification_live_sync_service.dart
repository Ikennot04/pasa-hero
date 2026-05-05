import 'dart:async';

import 'package:web_socket_channel/web_socket_channel.dart';

import '../config/api_config.dart';

/// Push-style refresh triggers for the user Notifications tab.
///
/// - If [kUserNotificationWsUrl] is set, connects a WebSocket; **any message** emits
///   [refreshes]. The server must actually push frames when notifications change;
///   many relays only keep the socket open — this service still runs **periodic**
///   refreshes (same interval as poll fallback) so the inbox stays current.
/// - If the URL is empty, only periodic polling is used.
///
/// Reference counted with [acquire]/[release] so multiple consumers share one pipe.
class NotificationLiveSyncService {
  NotificationLiveSyncService._();
  static final NotificationLiveSyncService instance =
      NotificationLiveSyncService._();

  final StreamController<void> _refreshes =
      StreamController<void>.broadcast(sync: true);
  Stream<void> get refreshes => _refreshes.stream;

  int _refCount = 0;
  bool _started = false;
  Timer? _pollTimer;
  WebSocketChannel? _ws;
  StreamSubscription<dynamic>? _wsSub;
  Timer? _reconnectTimer;

  void acquire() {
    _refCount++;
    if (_refCount == 1) _start();
  }

  void release() {
    if (_refCount <= 0) return;
    _refCount--;
    if (_refCount == 0) _stop();
  }

  void _emit() {
    if (!_refreshes.isClosed) {
      _refreshes.add(null);
    }
  }

  void _start() {
    if (_started) return;
    _started = true;
    _startPeriodicRefresh();
    final wsUrl = kUserNotificationWsUrl.trim();
    if (wsUrl.isNotEmpty) {
      _connectWs(wsUrl);
    }
  }

  void _stop() {
    _started = false;
    _pollTimer?.cancel();
    _pollTimer = null;
    _reconnectTimer?.cancel();
    _reconnectTimer = null;
    _wsSub?.cancel();
    _wsSub = null;
    try {
      _ws?.sink.close();
    } catch (_) {}
    _ws = null;
  }

  void _startPeriodicRefresh() {
    _pollTimer?.cancel();
    final secs = kUserNotificationPollSeconds.clamp(1, 180);
    _emit();
    _pollTimer = Timer.periodic(Duration(seconds: secs), (_) => _emit());
  }

  void _connectWs(String url) {
    _wsSub?.cancel();
    _wsSub = null;
    try {
      _ws?.sink.close();
    } catch (_) {}
    _ws = null;

    try {
      final channel = WebSocketChannel.connect(Uri.parse(url));
      _ws = channel;
      _wsSub = channel.stream.listen(
        (_) => _emit(),
        onError: (_) {
          _emit();
          _scheduleReconnect(url);
        },
        onDone: () => _scheduleReconnect(url),
        cancelOnError: false,
      );
    } catch (_) {
      // [refreshes] still driven by [_startPeriodicRefresh].
    }
  }

  void _scheduleReconnect(String url) {
    if (_refCount <= 0 || !_started) return;
    _reconnectTimer?.cancel();
    _reconnectTimer = Timer(const Duration(seconds: 8), () {
      if (_refCount > 0 &&
          _started &&
          kUserNotificationWsUrl.trim().isNotEmpty) {
        _connectWs(url);
      }
    });
  }
}
