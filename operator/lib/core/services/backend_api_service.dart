import 'dart:convert';

import 'package:http/http.dart' as http;

import '../config/api_config.dart';

/// Client for the Node.js backend API. Use for operator auth, trips, etc.
class BackendApiService {
  String get _base => getBackendBaseUrl();

  static Map<String, String> get _defaultHeaders => {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      };

  Map<String, String> _headers([Map<String, String>? extra]) {
    final m = Map<String, String>.from(_defaultHeaders);
    if (extra != null) m.addAll(extra);
    return m;
  }

  /// GET request to [path] (e.g. '/api/health'). [path] should start with /.
  Future<BackendResponse> get(String path, {Map<String, String>? headers}) async {
    try {
      final uri = Uri.parse('$_base$path');
      final response = await http.get(uri, headers: _headers(headers)).timeout(const Duration(seconds: 15));
      return _toResponse(response);
    } catch (e) {
      return BackendResponse.error(e.toString());
    }
  }

  /// POST request to [path] with optional [body] (encoded as JSON).
  Future<BackendResponse> post(
    String path, {
    Map<String, dynamic>? body,
    Map<String, String>? headers,
  }) async {
    try {
      final uri = Uri.parse('$_base$path');
      final resp = await http
          .post(
            uri,
            headers: _headers(headers),
            body: body != null ? jsonEncode(body) : null,
          )
          .timeout(const Duration(seconds: 15));
      return _toResponse(resp);
    } catch (e) {
      return BackendResponse.error(e.toString());
    }
  }

  /// PUT request to [path] with optional [body].
  Future<BackendResponse> put(
    String path, {
    Map<String, dynamic>? body,
    Map<String, String>? headers,
  }) async {
    try {
      final uri = Uri.parse('$_base$path');
      final resp = await http
          .put(
            uri,
            headers: _headers(headers),
            body: body != null ? jsonEncode(body) : null,
          )
          .timeout(const Duration(seconds: 15));
      return _toResponse(resp);
    } catch (e) {
      return BackendResponse.error(e.toString());
    }
  }

  /// PATCH request to [path] with optional [body].
  Future<BackendResponse> patch(
    String path, {
    Map<String, dynamic>? body,
    Map<String, String>? headers,
  }) async {
    try {
      final uri = Uri.parse('$_base$path');
      final resp = await http
          .patch(
            uri,
            headers: _headers(headers),
            body: body != null ? jsonEncode(body) : null,
          )
          .timeout(const Duration(seconds: 15));
      return _toResponse(resp);
    } catch (e) {
      return BackendResponse.error(e.toString());
    }
  }

  BackendResponse _toResponse(http.Response response) {
    final ok = response.statusCode >= 200 && response.statusCode < 300;
    Map<String, dynamic>? data;
    try {
      if (response.body.isNotEmpty) {
        data = jsonDecode(response.body) as Map<String, dynamic>?;
      }
    } catch (_) {
      data = {'raw': response.body};
    }
    return BackendResponse(
      success: ok,
      statusCode: response.statusCode,
      data: data,
      error: ok ? null : (data?['message'] as String? ?? data?['error'] as String? ?? response.body),
    );
  }

  /// Check if the backend is reachable (e.g. GET /api/health).
  Future<bool> checkHealth() async {
    final r = await get('/api/health');
    return r.success;
  }
}

/// Result of a backend API call.
class BackendResponse {
  const BackendResponse({
    required this.success,
    required this.statusCode,
    this.data,
    this.error,
  });

  factory BackendResponse.error(String message) {
    return BackendResponse(success: false, statusCode: -1, error: message);
  }

  final bool success;
  final int statusCode;
  final Map<String, dynamic>? data;
  final String? error;
}
