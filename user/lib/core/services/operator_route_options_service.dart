import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';

import '../models/operator_route_option.dart';

/// Loads route codes the same way the operator app does: [route_code] and [routes]
/// in Firestore.
class OperatorRouteOptionsService {
  OperatorRouteOptionsService({FirebaseFirestore? firestore})
      : _db = firestore ?? FirebaseFirestore.instance;

  final FirebaseFirestore _db;

  static const String routeCodeCollection = 'route_code';
  static const String routesCollection = 'routes';
  static const String routesApiUrl =
      'https://pasa-hero-server.vercel.app/api/routes';

  void _put(
    Map<String, OperatorRouteOption> map,
    String codeRaw,
    String displayNameRaw, {
    String? description,
  }) {
    final code = codeRaw.trim();
    if (code.isEmpty) return;
    final key = code.toUpperCase();
    final name = displayNameRaw.trim().isEmpty ? code : displayNameRaw.trim();
    final desc = description?.trim();
    map[key] = OperatorRouteOption(
      code: code,
      displayName: name,
      description: (desc == null || desc.isEmpty) ? null : desc,
    );
  }

  /// Returns distinct routes, sorted by display name.
  Future<List<OperatorRouteOption>> fetchAvailableRoutes() async {
    final byCode = <String, OperatorRouteOption>{};

    // 1) Primary source: backend routes API (same as operator app).
    try {
      final response =
          await http.get(Uri.parse(routesApiUrl)).timeout(const Duration(seconds: 12));
      if (response.statusCode >= 200 && response.statusCode < 300) {
        final decoded = jsonDecode(response.body);
        if (decoded is Map<String, dynamic>) {
          final rows = decoded['data'];
          if (rows is List) {
            for (final row in rows) {
              if (row is! Map) continue;
              final code = row['route_code']?.toString().trim() ?? '';
              if (code.isEmpty) continue;
              final name = row['route_name']?.toString().trim();
              final status = row['status']?.toString().trim();
              _put(
                byCode,
                code,
                (name == null || name.isEmpty) ? code : name,
                description: (status == null || status.isEmpty)
                    ? 'Live route from API'
                    : 'Status: $status',
              );
            }
          }
        }
      }
    } catch (_) {}

    if (byCode.isNotEmpty) {
      final list = byCode.values.toList();
      list.sort(
        (a, b) => a.displayName.toLowerCase().compareTo(b.displayName.toLowerCase()),
      );
      return list;
    }

    // 2) Fallback: Firestore.
    try {
      final snap = await _db.collection(routeCodeCollection).get();
      for (final doc in snap.docs) {
        final m = doc.data();
        final name = m['name'] as String?;
        final desc = m['description'] as String?;
        _put(byCode, doc.id, name ?? doc.id, description: desc);
      }
    } catch (_) {}

    try {
      final snap = await _db.collection(routesCollection).get();
      for (final doc in snap.docs) {
        final m = doc.data();
        final fromField = (m['code'] as String?)?.trim();
        final code = (fromField != null && fromField.isNotEmpty) ? fromField : doc.id;
        final name = m['name'] as String?;
        final desc = m['description'] as String?;
        _put(byCode, code, name ?? code, description: desc);
      }
    } catch (_) {}

    final list = byCode.values.toList();
    list.sort(
      (a, b) => a.displayName.toLowerCase().compareTo(b.displayName.toLowerCase()),
    );
    return list;
  }
}
