import 'dart:convert';

import 'package:http/http.dart' as http;

import '../../features/routes/route_constants.dart';

/// Resolves Mongo `user_id` and `route_id` for `/api/user-subscriptions/`.
class SubscriptionIdsService {
  SubscriptionIdsService._();

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
        final code = item['route_code']?.toString().trim().toUpperCase();
        final id = item['_id']?.toString().trim();
        if (code != null && id != null && id.isNotEmpty) {
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

  /// Resolves the MongoDB `User._id` used by `/api/user-subscriptions/`.
  ///
  /// Email/password signup creates the Mongo user before Firebase, so [firebase_id]
  /// is often still null; in that case we match [email] to `User.email`.
  static Future<String?> backendUserIdForFirebaseUid(
    String firebaseUid, {
    String? email,
  }) async {
    final uri = Uri.parse('$usersByFirebaseUidBaseUrl/$firebaseUid');
    final response = await http.get(uri).timeout(const Duration(seconds: 12));
    if (response.statusCode >= 200 && response.statusCode < 300) {
      try {
        final decoded = jsonDecode(response.body);
        if (decoded is Map<String, dynamic>) {
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
        }
      } catch (_) {}
    }

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
              if (id != null && id.isNotEmpty) return id;
            }
          }
          final emailNorm = email?.trim().toLowerCase();
          if (emailNorm != null && emailNorm.isNotEmpty) {
            for (final item in data) {
              if (item is! Map<String, dynamic>) continue;
              final e = item['email']?.toString().trim().toLowerCase();
              if (e == emailNorm) {
                final id = item['_id']?.toString().trim();
                if (id != null && id.isNotEmpty) return id;
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
      final request = http.Request(
        'GET',
        Uri.parse(kRouteSubscriptionsApiUrl),
      )
        ..headers.addAll(const {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        })
        ..body = jsonEncode({'user_id': effectiveUserId});
      final streamedResponse = await request.send();
      final response = await http.Response.fromStream(streamedResponse);

      String body = response.body;
      if (response.statusCode < 200 || response.statusCode >= 300) {
        final fallback = await http.get(
          Uri.parse(
            '$kRouteSubscriptionsApiUrl?user_id=${Uri.encodeQueryComponent(effectiveUserId)}',
          ),
          headers: const {'Accept': 'application/json'},
        );
        if (fallback.statusCode < 200 || fallback.statusCode >= 300) {
          return {};
        }
        body = fallback.body;
      }

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
      final request = http.Request(
        'GET',
        Uri.parse(kRouteSubscriptionsApiUrl),
      )
        ..headers.addAll(const {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        })
        ..body = jsonEncode({'user_id': effectiveUserId});
      final streamedResponse = await request.send();
      final response = await http.Response.fromStream(streamedResponse);

      String body = response.body;
      if (response.statusCode < 200 || response.statusCode >= 300) {
        final fallback = await http.get(
          Uri.parse(
            '$kRouteSubscriptionsApiUrl?user_id=${Uri.encodeQueryComponent(effectiveUserId)}',
          ),
          headers: const {'Accept': 'application/json'},
        );
        if (fallback.statusCode < 200 || fallback.statusCode >= 300) {
          return {};
        }
        body = fallback.body;
      }

      final decoded = jsonDecode(body);
      if (decoded is! Map<String, dynamic>) return {};
      final data = decoded['data'];
      if (data is! List) return {};

      final codes = <String>{};
      for (final item in data) {
        if (item is! Map<String, dynamic>) continue;
        final routeRef = item['route_id'];
        if (routeRef == null) continue;
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
}
