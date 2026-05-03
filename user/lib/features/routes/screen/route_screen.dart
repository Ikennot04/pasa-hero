import 'dart:async';
import 'dart:convert';

import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import '../../../core/themes/validation_theme.dart';
import '../../../core/models/operator_route_option.dart';
import '../../../core/services/operator_route_options_service.dart';
import '../../../core/services/nearby_operators_service.dart';
import '../../../core/services/subscription_ids_service.dart';
import '../route_constants.dart';
import '../Module/route_card.dart';

class RouteScreen extends StatefulWidget {
  const RouteScreen({super.key});

  @override
  State<RouteScreen> createState() => _RouteScreenState();
}

class _RouteScreenState extends State<RouteScreen> with WidgetsBindingObserver {
  static const Duration _mongoPollInterval = Duration(seconds: 45);

  final OperatorRouteOptionsService _routeOptionsService =
      OperatorRouteOptionsService();
  final NearbyOperatorsService _nearbyOperatorsService =
      NearbyOperatorsService();
  final TextEditingController _searchController = TextEditingController();

  Timer? _pollTimer;
  List<OperatorRouteOption> _routes = [];
  Map<String, int> _activeByRoute = {};
  Map<String, String> _mongoRouteIdByCode = {};
  String? _backendUserId;
  final Set<String> _followingRouteCodes = {};
  bool _loading = true;
  String _search = '';

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _refreshFromMongo(showFullLoading: true);
    _pollTimer = Timer.periodic(_mongoPollInterval, (_) {
      if (mounted) _refreshFromMongo(showFullLoading: false);
    });
  }

  @override
  void dispose() {
    _pollTimer?.cancel();
    WidgetsBinding.instance.removeObserver(this);
    _searchController.dispose();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed && mounted) {
      _refreshFromMongo(showFullLoading: false);
    }
  }

  /// Reloads routes, operator counts, id map, and follow state from the API (MongoDB).
  Future<void> _refreshFromMongo({required bool showFullLoading}) async {
    if (showFullLoading && mounted) {
      setState(() => _loading = true);
    }
    try {
      final routes = await _routeOptionsService.fetchAvailableRoutes();
      final counts = <String, int>{};
      for (final r in routes) {
        try {
          final ops = await _nearbyOperatorsService.fetchNearby(
            routeCodeFilter: r.code,
          );
          counts[r.code.toUpperCase()] = ops.length;
        } catch (_) {
          counts[r.code.toUpperCase()] = 0;
        }
      }

      String? backendUserId;
      final firebaseUser = FirebaseAuth.instance.currentUser;
      if (firebaseUser != null) {
        backendUserId =
            await SubscriptionIdsService.backendUserIdForFirebaseUid(
          firebaseUser.uid,
          email: firebaseUser.email,
        );
      }
      final mongoRouteIds = await SubscriptionIdsService.fetchRouteIdByCodeMap();
      final followedRouteCodes = await _loadFollowedRouteCodes(
        backendUserId: backendUserId,
        mongoRouteIdByCode: mongoRouteIds,
      );

      if (!mounted) return;
      setState(() {
        _routes = routes;
        _activeByRoute = counts;
        _mongoRouteIdByCode = mongoRouteIds;
        _backendUserId = backendUserId;
        _followingRouteCodes
          ..clear()
          ..addAll(followedRouteCodes);
        _loading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        if (showFullLoading) _loading = false;
      });
    }
  }

  Future<Set<String>> _loadFollowedRouteCodes({
    required String? backendUserId,
    required Map<String, String> mongoRouteIdByCode,
  }) async {
    final firebaseUid = FirebaseAuth.instance.currentUser?.uid ?? '';
    final effectiveUserId = (backendUserId != null && backendUserId.isNotEmpty)
        ? backendUserId
        : firebaseUid;
    if (effectiveUserId.isEmpty) {
      return <String>{};
    }

    try {
      // Mobile-only compatibility: backend currently reads user_id from GET body.
      // Use http.Request so we can attach body to GET.
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

      if (response.statusCode < 200 || response.statusCode >= 300) {
        // Fallback: if backend eventually supports query param, keep this path.
        final fallback = await http.get(
          Uri.parse(
            '$kRouteSubscriptionsApiUrl?user_id=${Uri.encodeQueryComponent(effectiveUserId)}',
          ),
          headers: const {
            'Accept': 'application/json',
          },
        );
        if (fallback.statusCode < 200 || fallback.statusCode >= 300) {
          return <String>{};
        }
        return _extractFollowedRouteCodes(
          responseBody: fallback.body,
          mongoRouteIdByCode: mongoRouteIdByCode,
        );
      }
      return _extractFollowedRouteCodes(
        responseBody: response.body,
        mongoRouteIdByCode: mongoRouteIdByCode,
      );
    } catch (_) {
      return <String>{};
    }
  }

  Set<String> _extractFollowedRouteCodes({
    required String responseBody,
    required Map<String, String> mongoRouteIdByCode,
  }) {
    final decoded = jsonDecode(responseBody);
    if (decoded is! Map<String, dynamic>) {
      return <String>{};
    }

    final data = decoded['data'];
    if (data is! List) {
      return <String>{};
    }

    final routeCodeById = <String, String>{};
    for (final entry in mongoRouteIdByCode.entries) {
      routeCodeById[entry.value] = entry.key.toUpperCase();
    }

    final followed = <String>{};
    for (final item in data) {
      if (item is! Map<String, dynamic>) continue;
      final routeRef = item['route_id'];
      if (routeRef == null) continue;

      if (routeRef is Map<String, dynamic>) {
        final code = routeRef['route_code']?.toString().trim().toUpperCase();
        if (code != null && code.isNotEmpty) {
          followed.add(code);
          continue;
        }
        final routeId = routeRef['_id']?.toString().trim();
        if (routeId != null && routeId.isNotEmpty) {
          final mappedCode = routeCodeById[routeId];
          if (mappedCode != null) followed.add(mappedCode);
        }
        continue;
      }

      final routeId = routeRef.toString().trim();
      if (routeId.isEmpty) continue;
      final mappedCode = routeCodeById[routeId];
      if (mappedCode != null) {
        followed.add(mappedCode);
      }
    }
    return followed;
  }

  @override
  Widget build(BuildContext context) {
    final screenWidth = MediaQuery.of(context).size.width;
    final filtered = _routes.where((r) {
      if (_search.trim().isEmpty) return true;
      final q = _search.toLowerCase();
      return r.code.toLowerCase().contains(q) ||
          r.displayName.toLowerCase().contains(q) ||
          (r.description?.toLowerCase().contains(q) ?? false);
    }).toList();

    return Scaffold(
      body: Container(
        width: double.infinity,
        height: double.infinity,
        decoration: ValidationTheme.gradientDecoration,
        child: SafeArea(
          child: Column(
            children: [
              // Header Section with Title, Search Bar, and Filter
              Container(
                padding: EdgeInsets.symmetric(
                  horizontal: screenWidth * 0.05,
                  vertical: 20,
                ),
                child: Column(
                  children: [
                    // Title
                    const Text(
                      kRoutesTitle,
                      style: TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.w700,
                        color: ValidationTheme.textLight,
                      ),
                    ),
                    const SizedBox(height: 16),
                    // Search Bar and Filter
                    Row(
                      children: [
                        // Search Bar
                        Expanded(
                          child: Container(
                            height: 48,
                            decoration: BoxDecoration(
                              color: ValidationTheme.backgroundWhite,
                              borderRadius: BorderRadius.circular(24),
                              boxShadow: [
                                BoxShadow(
                                  color: Colors.black.withOpacity(0.05),
                                  blurRadius: 4,
                                  offset: const Offset(0, 2),
                                ),
                              ],
                            ),
                            child: TextField(
                              controller: _searchController,
                              onChanged: (v) => setState(() => _search = v),
                              decoration: InputDecoration(
                                hintText: kRoutesSearchHint,
                                hintStyle: const TextStyle(
                                  color: ValidationTheme.textSecondary,
                                  fontSize: 14,
                                ),
                                prefixIcon: const Icon(
                                  Icons.search,
                                  color: ValidationTheme.textSecondary,
                                  size: 20,
                                ),
                                border: InputBorder.none,
                                contentPadding: const EdgeInsets.symmetric(
                                  horizontal: 20,
                                  vertical: 14,
                                ),
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        // Filter Button
                        Container(
                          width: 48,
                          height: 48,
                          decoration: BoxDecoration(
                            color: ValidationTheme.backgroundWhite,
                            shape: BoxShape.circle,
                            boxShadow: [
                              BoxShadow(
                                color: Colors.black.withOpacity(0.05),
                                blurRadius: 4,
                                offset: const Offset(0, 2),
                              ),
                            ],
                          ),
                          child: IconButton(
                            onPressed: () {},
                            icon: const Icon(
                              Icons.tune,
                              color: ValidationTheme.textPrimary,
                              size: 20,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),

              // Scrollable Route Cards
              Expanded(
                child: Container(
                  padding: EdgeInsets.symmetric(horizontal: screenWidth * 0.05),
                  child: _loading
                      ? const Center(child: CircularProgressIndicator())
                      : RefreshIndicator(
                          color: ValidationTheme.textPrimary,
                          onRefresh: () =>
                              _refreshFromMongo(showFullLoading: false),
                          child: ListView.builder(
                            physics: const AlwaysScrollableScrollPhysics(),
                            itemCount: filtered.length + 1,
                            itemBuilder: (context, index) {
                              if (index == filtered.length) {
                                return const SizedBox(height: 16);
                              }
                              final route = filtered[index];
                              final routeCode = route.code.toUpperCase();
                              final active = _activeByRoute[routeCode] ?? 0;
                              return RouteCard(
                                routeId: '$kRouteIdPrefix${route.code}',
                                estimatedTime:
                                    '$kEstimatedLabelPrefix$kEstimatedFallback',
                                routeDescription: route.description ??
                                    route.displayName,
                                status: null,
                                showFollowButton: true,
                                isFollowing:
                                    _followingRouteCodes.contains(routeCode),
                                activeBuses: active,
                                backendUserId: _backendUserId,
                                backendRouteId:
                                    _mongoRouteIdByCode[routeCode],
                                followRouteCode: routeCode,
                                onFollowChanged: (code, isFollowing) {
                                  setState(() {
                                    if (isFollowing) {
                                      _followingRouteCodes.add(code);
                                    } else {
                                      _followingRouteCodes.remove(code);
                                    }
                                  });
                                },
                              );
                            },
                          ),
                        ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
