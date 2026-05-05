import 'dart:convert';

import 'package:http/http.dart' as http;

import '../../features/routes/route_constants.dart';

/// Resolves Mongo `user_id` and `route_id` for `/api/user-subscriptions/`.
class SubscriptionIdsService {
  SubscriptionIdsService._();

  /// Parses `_id` / `id` from JSON (string or `{"$oid": "..."}`).
  static String? mongoIdFromJson(dynamic raw) {
    if (raw == null) return null;
    if (raw is String) {
      final s = raw.trim();
      return s.isEmpty ? null : s;
    }
    if (raw is Map) {
      final oid = raw[r'$oid'] ?? raw['oid'];
      if (oid != null) return mongoIdFromJson(oid);
    }
    return null;
  }

  /// Avoids repeat lookups of the same Firebase account during a session.
  static final Map<String, String> _backendUserIdByFirebaseUid = {};

  static const Duration _usersListTimeout = Duration(seconds: 22);

  static void clearBackendUserIdCache() {
    _backendUserIdByFirebaseUid.clear();
  }

  /// Call after backend auth/signup returns a Mongo user object so follow/inbox
  /// do not need a full `GET /api/users` scan.
  static void rememberMongoUserIdForFirebaseUid(
    String firebaseUid,
    String mongoUserId,
  ) {
    final f = firebaseUid.trim();
    final m = mongoUserId.trim();
    if (f.isEmpty || m.isEmpty || m == f) return;
    _backendUserIdByFirebaseUid[f] = m;
  }

  /// Parses `{ "success": true, "data": { "_id": "..." } }` (sign-in / sign-up).
  static String? parseMongoUserIdFromAuthUserEnvelope(String responseBody) {
    try {
      final decoded = jsonDecode(responseBody);
      if (decoded is! Map<String, dynamic>) return null;
      final data = decoded['data'];
      if (data is Map<String, dynamic>) {
        return mongoIdFromJson(data['_id']);
      }
    } catch (_) {}
    return null;
  }

  static Map<String, dynamic>? _asUserRow(dynamic raw) {
    if (raw is Map<String, dynamic>) return raw;
    if (raw is Map) return Map<String, dynamic>.from(raw);
    return null;
  }

  static const String routesApiUrl =
      'https://pasa-hero-server.vercel.app/api/routes';
  static const String usersApiUrl =
      'https://pasa-hero-server.vercel.app/api/users';

  static Future<Map<String, String>> fetchRouteIdByCodeMap() async {
    final response =
        await http.get(Uri.parse(routesApiUrl)).timeout(const Duration(seconds: 12));
    if (response.statusCode < 200 || response.statusCode >= 300) {
      return {};
    }
    final map = <String, String>{};
    try {
      final decoded = jsonDecode(response.body);
      Iterable<dynamic> routes = const [];
      if (decoded is List) {
        routes = decoded;
      } else if (decoded is Map<String, dynamic>) {
        final data = decoded['data'];
        if (data is List) {
          routes = data;
        }
      }
      for (final item in routes) {
        if (item is! Map<String, dynamic>) continue;
        final codeRaw = item['route_code'] ?? item['code'] ?? item['routeCode'];
        final code = codeRaw?.toString().trim().toUpperCase();
        final id = mongoIdFromJson(item['_id'] ?? item['id']);
        if (code != null &&
            code.isNotEmpty &&
            id != null &&
            id.isNotEmpty) {
          map[code] = id;
        }
      }
    } catch (_) {}
    return map;
  }

  static Future<String?> routeIdForCode(String routeCode) async {
    final map = await fetchRouteIdByCodeMap();
    return map[routeCode.trim().toUpperCase()];
  }

  /// Backend `GET /api/user-subscriptions/` reads `user_id` from **JSON body** only
  /// (same as [RouteScreen] — plain `http.get` with `?user_id=` is not enough).
  static Future<String?> _fetchUserSubscriptionsResponseBody(
    String effectiveUserId,
  ) async {
    final t = effectiveUserId.trim();
    if (t.isEmpty) return null;
    const timeout = Duration(seconds: 15);

    try {
      final request = http.Request(
        'GET',
        Uri.parse(kRouteSubscriptionsApiUrl),
      )
        ..headers.addAll(const {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        })
        ..body = jsonEncode({'user_id': t});
      final streamed = await request.send().timeout(timeout);
      final response = await http.Response.fromStream(streamed);
      if (response.statusCode >= 200 && response.statusCode < 300) {
        return response.body;
      }
    } catch (_) {}

    return null;
  }

  /// Resolves the MongoDB `User._id` used by `/api/user-subscriptions/`.
  ///
  /// Uses `GET /api/users` only (Mongo). Does not use `/api/users/firebase/…`
  /// (Firestore) or Firebase Auth uid — those are not Mongo user ids.
  ///
  /// Email/password signup may leave `firebase_id` null; then we match [email]
  /// to `User.email`.
  static String? _mongoUserIdFromRow(Map<String, dynamic> item) {
    return mongoIdFromJson(item['_id']);
  }

  static Future<String?> backendUserIdForFirebaseUid(
    String firebaseUid, {
    String? email,
  }) async {
    final uidTrim = firebaseUid.trim();
    if (uidTrim.isEmpty) return null;

    final memo = _backendUserIdByFirebaseUid[uidTrim];
    if (memo != null &&
        memo.isNotEmpty &&
        memo.trim() != uidTrim) {
      return memo;
    }

    final usersResponse =
        await http.get(Uri.parse(usersApiUrl)).timeout(_usersListTimeout);
    if (usersResponse.statusCode < 200 || usersResponse.statusCode >= 300) {
      return null;
    }
    try {
      final decoded = jsonDecode(usersResponse.body);
      if (decoded is Map<String, dynamic>) {
        final data = decoded['data'];
        if (data is List) {
          for (final raw in data) {
            final item = _asUserRow(raw);
            if (item == null) continue;
            final fid = item['firebase_id']?.toString().trim();
            if (fid != null && fid == uidTrim) {
              final id = _mongoUserIdFromRow(item);
              if (id != null && id.isNotEmpty && id.trim() != uidTrim) {
                _backendUserIdByFirebaseUid[uidTrim] = id;
                return id;
              }
            }
          }
          final emailNorm = email?.trim().toLowerCase();
          if (emailNorm != null && emailNorm.isNotEmpty) {
            for (final raw in data) {
              final item = _asUserRow(raw);
              if (item == null) continue;
              final e = item['email']?.toString().trim().toLowerCase();
              if (e == emailNorm) {
                final id = _mongoUserIdFromRow(item);
                if (id != null && id.isNotEmpty && id.trim() != uidTrim) {
                  _backendUserIdByFirebaseUid[uidTrim] = id;
                  return id;
                }
              }
            }
          }
        }
      }
    } catch (_) {}
    return null;
  }

  /// MongoDB `Route._id` values for routes the user follows (from subscriptions API).
  static Future<Set<String>> fetchSubscribedMongoRouteIds({
    required String effectiveUserId,
  }) async {
    if (effectiveUserId.isEmpty) return {};
    try {
      final body =
          await _fetchUserSubscriptionsResponseBody(effectiveUserId);
      if (body == null || body.isEmpty) return {};

      final decoded = jsonDecode(body);
      if (decoded is! Map<String, dynamic>) return {};
      final data = decoded['data'];
      if (data is! List) return {};

      final ids = <String>{};
      for (final item in data) {
        if (item is! Map<String, dynamic>) continue;
        final routeRef = item['route_id'];
        if (routeRef == null) continue;
        if (routeRef is Map<String, dynamic>) {
          final id = routeRef['_id']?.toString().trim();
          if (id != null && id.isNotEmpty) ids.add(id);
          continue;
        }
        final id = routeRef.toString().trim();
        if (id.isNotEmpty) ids.add(id);
      }
      return ids;
    } catch (_) {
      return {};
    }
  }

  /// Route codes (uppercase) for followed routes. Matches Firestore `driver_status`
  /// document ids — operators use [route_code], not Mongo `Route._id`.
  static Future<Set<String>> fetchSubscribedRouteCodes({
    required String effectiveUserId,
    required Map<String, String> routeIdByCode,
  }) async {
    if (effectiveUserId.isEmpty) return {};
    final codeByMongoId = <String, String>{};
    for (final e in routeIdByCode.entries) {
      if (e.value.isNotEmpty) {
        codeByMongoId[e.value] = e.key.toUpperCase();
      }
    }
    try {
      final body =
          await _fetchUserSubscriptionsResponseBody(effectiveUserId);
      if (body == null || body.isEmpty) return {};

      final decoded = jsonDecode(body);
      if (decoded is! Map<String, dynamic>) return {};
      final data = decoded['data'];
      if (data is! List) return {};

      final codes = <String>{};
      for (final item in data) {
        if (item is! Map<String, dynamic>) continue;
        final routeRef = item['route_id'];
        if (routeRef == null) {
          final orphan = item['route_code']?.toString().trim().toUpperCase();
          if (orphan != null && orphan.isNotEmpty) codes.add(orphan);
          continue;
        }
        if (routeRef is Map<String, dynamic>) {
          final code = routeRef['route_code']?.toString().trim().toUpperCase();
          if (code != null && code.isNotEmpty) {
            codes.add(code);
            continue;
          }
          final mongoId = routeRef['_id']?.toString().trim();
          if (mongoId != null && mongoId.isNotEmpty) {
            final c = codeByMongoId[mongoId];
            if (c != null && c.isNotEmpty) codes.add(c);
          }
          continue;
        }
        final rawId = routeRef.toString().trim();
        if (rawId.isNotEmpty) {
          final c = codeByMongoId[rawId];
          if (c != null && c.isNotEmpty) codes.add(c);
        }
      }
      return codes;
    } catch (_) {
      return {};
    }
  }

  /// Followed route codes for the Mongo `User._id` only (not Firebase Auth uid).
  static Future<Set<String>> fetchSubscribedRouteCodesMerged({
    required String? backendMongoUserId,
    required Map<String, String> routeIdByCode,
  }) async {
    final mongo = backendMongoUserId?.trim() ?? '';
    if (mongo.isEmpty) {
      return {};
    }
    final s = await fetchSubscribedRouteCodes(
      effectiveUserId: mongo,
      routeIdByCode: routeIdByCode,
    );
    return s
        .map((c) => c.trim().toUpperCase())
        .where((c) => c.isNotEmpty)
        .toSet();
  }
}
