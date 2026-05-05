import 'backend_api_service.dart';
import 'operator_session_service.dart';

/// Reports arrival/departure via `POST /api/terminal-logs` so the server can set
/// [BusAssignment.latest_terminal_log_id] and notify terminal admins.
///
/// Does not modify the backend; uses existing `TerminalLog` schema fields.
class OperatorTerminalLogService {
  OperatorTerminalLogService._();
  static final OperatorTerminalLogService instance = OperatorTerminalLogService._();

  final BackendApiService _api = BackendApiService();

  Map<String, String> _authHeaders() {
    final jwt = OperatorSessionService.instance.jwt?.trim();
    if (jwt == null || jwt.isEmpty) return {};
    return {'Authorization': 'Bearer $jwt'};
  }

  static String? _refId(dynamic raw) {
    if (raw == null) return null;
    if (raw is String && raw.isNotEmpty) return raw;
    if (raw is Map) {
      final o = raw[r'$oid'] ?? raw['oid'] ?? raw['_id'];
      if (o is String && o.isNotEmpty) return o;
      if (o is Map) {
        final inner = o[r'$oid'] ?? o['oid'];
        if (inner is String && inner.isNotEmpty) return inner;
      }
    }
    final s = raw.toString();
    if (s.isEmpty || s == 'null') return null;
    return s;
  }

  String? _assignedTerminalFromSession() {
    final u = OperatorSessionService.instance.userMap;
    if (u == null) return null;
    return _refId(u['assigned_terminal']);
  }

  Future<({String? startTerminalId, String? endTerminalId})> _fetchRouteTerminalIds(
    String routeId,
  ) async {
    final encoded = Uri.encodeComponent(routeId);
    final res = await _api.get('/api/routes/$encoded');
    if (!res.success || res.data == null) {
      return (startTerminalId: null, endTerminalId: null);
    }
    final data = res.data!['data'];
    if (data is! Map) {
      return (startTerminalId: null, endTerminalId: null);
    }
    final m = Map<String, dynamic>.from(data);
    return (
      startTerminalId: _refId(m['start_terminal_id']),
      endTerminalId: _refId(m['end_terminal_id']),
    );
  }

  Future<BackendResponse> _createTerminalLog({
    required String busAssignmentId,
    required String terminalId,
    required String busId,
    required String eventType,
  }) async {
    await OperatorSessionService.instance.loadFromPrefs();
    final reporter = OperatorSessionService.instance.resolveMongoUserId();

    final body = <String, dynamic>{
      'bus_assignment_id': busAssignmentId,
      'terminal_id': terminalId,
      'bus_id': busId,
      'event_type': eventType,
      'event_time': DateTime.now().toUtc().toIso8601String(),
      'auto_detected': false,
    };
    if (reporter != null && reporter.isNotEmpty) {
      body['reported_by'] = reporter;
    }

    return _api.post(
      '/api/terminal-logs',
      body: body,
      headers: _authHeaders(),
    );
  }

  /// [eventType] `departure` — prefers route start terminal, then operator [assigned_terminal], then end terminal.
  Future<BackendResponse> reportDeparture({
    required String busAssignmentId,
    required String busId,
    required String routeId,
  }) async {
    final terminals = await _fetchRouteTerminalIds(routeId);
    final terminalId = terminals.startTerminalId ??
        _assignedTerminalFromSession() ??
        terminals.endTerminalId;
    if (terminalId == null || terminalId.isEmpty) {
      return BackendResponse.error(
        'Cannot report departure: no terminal (route terminals and profile terminal missing).',
      );
    }
    return _createTerminalLog(
      busAssignmentId: busAssignmentId,
      terminalId: terminalId,
      busId: busId,
      eventType: 'departure',
    );
  }

  /// [eventType] `arrival` — prefers route end terminal, then operator [assigned_terminal], then start terminal.
  Future<BackendResponse> reportArrival({
    required String busAssignmentId,
    required String busId,
    required String routeId,
  }) async {
    final terminals = await _fetchRouteTerminalIds(routeId);
    final terminalId = terminals.endTerminalId ??
        _assignedTerminalFromSession() ??
        terminals.startTerminalId;
    if (terminalId == null || terminalId.isEmpty) {
      return BackendResponse.error(
        'Cannot report arrival: no terminal (route terminals and profile terminal missing).',
      );
    }
    return _createTerminalLog(
      busAssignmentId: busAssignmentId,
      terminalId: terminalId,
      busId: busId,
      eventType: 'arrival',
    );
  }
}
