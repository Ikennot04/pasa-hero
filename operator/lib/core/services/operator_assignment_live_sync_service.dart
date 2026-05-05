import 'dart:async';

import 'package:web_socket_channel/web_socket_channel.dart';

import '../config/api_config.dart';

/// Push-style updates for “terminal assigned you” without manual refresh.
///
/// - If `OPERATOR_ASSIGNMENT_WS_URL` is set: connects with [WebSocketChannel]; **any**
///   incoming message triggers [refreshes] so the app re-fetches pending assignments.
/// - If unset (no relay deployed yet): emits on a **timer** ([kOperatorAssignmentPollSeconds])
///   so behavior stays automatic without backend changes in this repo.
///
/// Use [acquire] / [release] with reference counting so multiple screens share one connection.
class OperatorAssignmentLiveSyncService {
  OperatorAssignmentLiveSyncService._();
  static final OperatorAssignmentLiveSyncService instance =
      OperatorAssignmentLiveSyncService._();

  final StreamController<void> _refreshes =
      StreamController<void>.broadcast(sync: true);

  /// Subscribe to request a silent assignment refetch (map panel, profile, etc.).
  Stream<void> get refreshes => _refreshes.stream;

  int _refCount = 0;
  Timer? _pollTimer;
  WebSocketChannel? _ws;
  StreamSubscription<dynamic>? _wsSub;
  Timer? _reconnectTimer;
  bool _started = false;

  void acquire() {
    _refCount++;
    if (_refCount == 1) {
      _start();
    }
  }

  void release() {
    if (_refCount <= 0) return;
    _refCount--;
    if (_refCount == 0) {
      _stop();
    }
  }

  void _emit() {
    if (!_refreshes.isClosed) {
      _refreshes.add(null);
    }
  }

  void _start() {
    if (_started) return;
    _started = true;
    final wsUrl = kOperatorAssignmentWsUrl.trim();
    if (wsUrl.isNotEmpty) {
      _connectWs(wsUrl);
    } else {
      _startPolling();
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

  void _startPolling() {
    _pollTimer?.cancel();
    final secs = kOperatorAssignmentPollSeconds.clamp(5, 120);
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
      final uri = Uri.parse(url);
      final channel = WebSocketChannel.connect(uri);
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
      _startPolling();
    }
  }

  void _scheduleReconnect(String url) {
    if (_refCount <= 0 || !_started) return;
    _reconnectTimer?.cancel();
    _reconnectTimer = Timer(const Duration(seconds: 8), () {
      if (_refCount > 0 && _started && kOperatorAssignmentWsUrl.trim().isNotEmpty) {
        _connectWs(url);
      }
    });
  }
}
