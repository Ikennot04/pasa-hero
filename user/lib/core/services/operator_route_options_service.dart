import 'package:cloud_firestore/cloud_firestore.dart';

import '../models/operator_route_option.dart';

/// Loads route codes the same way the operator app does: [route_code] and [routes]
/// in Firestore.
class OperatorRouteOptionsService {
  OperatorRouteOptionsService({FirebaseFirestore? firestore})
      : _db = firestore ?? FirebaseFirestore.instance;

  final FirebaseFirestore _db;

  static const String routeCodeCollection = 'route_code';
  static const String routesCollection = 'routes';

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
