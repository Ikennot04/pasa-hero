import 'package:http/http.dart' as http;
import 'dart:convert';

import '../models/operator_route_option.dart';
import 'subscription_ids_service.dart';

/// Loads routes from the backend only ([/api/routes] on Vercel) so every row has a
/// Mongo `route_id` for follow/subscribe. No Firestore fallback (avoids orphan codes).
class OperatorRouteOptionsService {
  OperatorRouteOptionsService();

  static const String routesApiUrl =
      'https://pasa-hero-server.vercel.app/api/routes';

  static bool _readIsFreeRideFromRow(Map<dynamic, dynamic> row) {
    final v = row['is_free_ride'] ?? row['isFreeRide'];
    if (v is bool) return v;
    if (v is num) return v != 0;
    if (v is String) {
      final s = v.trim().toLowerCase();
      return s == '1' || s == 'true' || s == 'yes';
    }
    return false;
  }

  void _put(
    Map<String, OperatorRouteOption> map,
    String codeRaw,
    String displayNameRaw, {
    String? description,
    bool isFreeRideRoute = false,
    String? mongoRouteId,
  }) {
    final code = codeRaw.trim();
    if (code.isEmpty) return;
    final key = code.toUpperCase();
    final name = displayNameRaw.trim().isEmpty ? code : displayNameRaw.trim();
    final desc = description?.trim();
    final existing = map[key];
    final mergedFree =
        isFreeRideRoute || (existing?.isFreeRideRoute ?? false);
    final idTrim = mongoRouteId?.trim();
    final mergedMongo = (idTrim != null && idTrim.isNotEmpty)
        ? idTrim
        : existing?.mongoRouteId;
    map[key] = OperatorRouteOption(
      code: code,
      displayName: name,
      description: (desc == null || desc.isEmpty) ? null : desc,
      isFreeRideRoute: mergedFree,
      mongoRouteId:
          (mergedMongo != null && mergedMongo.isNotEmpty) ? mergedMongo : null,
    );
  }

  /// Routes from [routesApiUrl] only, sorted by display name. Returns an empty list on failure.
  Future<List<OperatorRouteOption>> fetchAvailableRoutes() async {
    final byCode = <String, OperatorRouteOption>{};

    try {
      final response = await http
          .get(Uri.parse(routesApiUrl))
          .timeout(const Duration(seconds: 12));
      if (response.statusCode >= 200 && response.statusCode < 300) {
        final decoded = jsonDecode(response.body);
        if (decoded is Map<String, dynamic>) {
          final rows = decoded['data'];
          if (rows is List) {
            for (final row in rows) {
              if (row is! Map) continue;
              final rowMap = Map<dynamic, dynamic>.from(row);
              final codeRaw =
                  rowMap['route_code'] ?? rowMap['code'] ?? rowMap['routeCode'];
              final code = codeRaw?.toString().trim() ?? '';
              if (code.isEmpty) continue;
              final name = rowMap['route_name']?.toString().trim();
              final status = rowMap['status']?.toString().trim();
              final mongoId = SubscriptionIdsService.mongoIdFromJson(
                rowMap['_id'] ?? rowMap['id'],
              );
              _put(
                byCode,
                code,
                (name == null || name.isEmpty) ? code : name,
                description: (status == null || status.isEmpty)
                    ? 'Live route from API'
                    : 'Status: $status',
                isFreeRideRoute: _readIsFreeRideFromRow(rowMap),
                mongoRouteId: mongoId,
              );
            }
          }
        }
      }
    } catch (_) {}

    final list = byCode.values.toList();
    list.sort(
      (a, b) => a.displayName.toLowerCase().compareTo(b.displayName.toLowerCase()),
    );
    return list;
  }
}
