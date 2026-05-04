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

  static const String routesApiUrl =
      'https://pasa-hero-server.vercel.app/api/routes';
  static const String usersByFirebaseUidBaseUrl =
      'https://pasa-hero-server.vercel.app/api/users/firebase';
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
  /// Email/password signup creates the Mongo user before Firebase, so [firebase_id]
  /// is often still null; in that case we match [email] to `User.email`.
  static String? _parseBackendUserIdFromJson(
    Map<String, dynamic> decoded,
    String firebaseUid,
  ) {
    final rootId = decoded['_id']?.toString().trim();
    if (rootId != null && rootId.isNotEmpty) return rootId;

    final rootDocId = decoded['id']?.toString().trim();
    if (rootDocId != null &&
        rootDocId.isNotEmpty &&
        rootDocId != firebaseUid) {
      return rootDocId;
    }

    final data = decoded['data'];
    if (data is Map<String, dynamic>) {
      final dataId = data['_id']?.toString().trim();
      if (dataId != null && dataId.isNotEmpty) return dataId;

      final dataDocId = data['id']?.toString().trim();
      if (dataDocId != null &&
          dataDocId.isNotEmpty &&
          dataDocId != firebaseUid) {
        return dataDocId;
      }

      final user = data['user'];
      if (user is Map<String, dynamic>) {
        final userId = user['_id']?.toString().trim();
        if (userId != null && userId.isNotEmpty) return userId;
      }
    }
    return null;
  }

  static Future<String?> backendUserIdForFirebaseUid(
    String firebaseUid, {
    String? email,
  }) async {
    if (firebaseUid.isEmpty) return null;

    final memo = _backendUserIdByFirebaseUid[firebaseUid];
    if (memo != null && memo.isNotEmpty) return memo;

    final uri = Uri.parse('$usersByFirebaseUidBaseUrl/$firebaseUid');
    final response = await http.get(uri).timeout(const Duration(seconds: 12));

    String? fromFirebase;
    if (response.statusCode >= 200 && response.statusCode < 300) {
      try {
        final decoded = jsonDecode(response.body);
        if (decoded is Map<String, dynamic>) {
          fromFirebase = _parseBackendUserIdFromJson(decoded, firebaseUid);
        }
      } catch (_) {}
    }
    if (fromFirebase != null && fromFirebase.isNotEmpty) {
      _backendUserIdByFirebaseUid[firebaseUid] = fromFirebase;
      return fromFirebase;
    }

    // Downloading `/api/users` is very slow on large datasets. Only do it when the
    // firebase-by-uid endpoint indicates the user doc is missing (404) or returns
    // 200 without a usable id — not on 5xx (server errors).
    final tryUsersList = response.statusCode == 404 ||
        (response.statusCode >= 200 && response.statusCode < 300);
    if (!tryUsersList) return null;

    final usersResponse =
        await http.get(Uri.parse(usersApiUrl)).timeout(const Duration(seconds: 12));
    if (usersResponse.statusCode < 200 || usersResponse.statusCode >= 300) {
      return null;
    }
    try {
      final decoded = jsonDecode(usersResponse.body);
      if (decoded is Map<String, dynamic>) {
        final data = decoded['data'];
        if (data is List) {
          for (final item in data) {
            if (item is! Map<String, dynamic>) continue;
            final uid = item['firebase_id']?.toString().trim();
            if (uid == firebaseUid) {
              final id = item['_id']?.toString().trim();
              if (id != null && id.isNotEmpty) {
                _backendUserIdByFirebaseUid[firebaseUid] = id;
                return id;
              }
            }
          }
          final emailNorm = email?.trim().toLowerCase();
          if (emailNorm != null && emailNorm.isNotEmpty) {
            for (final item in data) {
              if (item is! Map<String, dynamic>) continue;
              final e = item['email']?.toString().trim().toLowerCase();
              if (e == emailNorm) {
                final id = item['_id']?.toString().trim();
                if (id != null && id.isNotEmpty) {
                  _backendUserIdByFirebaseUid[firebaseUid] = id;
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

  /// Subscriptions may be stored under Mongo `User._id` **or** Firebase Auth `uid`.
  /// Merges results so followed routes still resolve when only one id has rows.
  static Future<Set<String>> fetchSubscribedRouteCodesMerged({
    required String? backendMongoUserId,
    required String firebaseUid,
    required Map<String, String> routeIdByCode,
  }) async {
    final out = <String>{};
    final tried = <String>{};

    Future<void> pull(String userId) async {
      final t = userId.trim();
      if (t.isEmpty || tried.contains(t)) return;
      tried.add(t);
      final s = await fetchSubscribedRouteCodes(
        effectiveUserId: t,
        routeIdByCode: routeIdByCode,
      );
      out.addAll(s);
    }

    if (backendMongoUserId != null && backendMongoUserId.trim().isNotEmpty) {
      await pull(backendMongoUserId.trim());
    }
    await pull(firebaseUid.trim());
    return out
        .map((c) => c.trim().toUpperCase())
        .where((c) => c.isNotEmpty)
        .toSet();
  }
}
