import 'dart:convert';

import 'package:http/http.dart' as http;

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
}
