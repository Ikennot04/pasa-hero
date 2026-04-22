import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import '../../../core/themes/validation_theme.dart';
import '../../../core/models/operator_route_option.dart';
import '../../../core/services/operator_route_options_service.dart';
import '../../../core/services/nearby_operators_service.dart';
import '../Module/route_card.dart';

class RouteScreen extends StatefulWidget {
  const RouteScreen({super.key});

  @override
  State<RouteScreen> createState() => _RouteScreenState();
}

class _RouteScreenState extends State<RouteScreen> {
  final OperatorRouteOptionsService _routeOptionsService =
      OperatorRouteOptionsService();
  final NearbyOperatorsService _nearbyOperatorsService =
      NearbyOperatorsService();
  final TextEditingController _searchController = TextEditingController();

  static const String _subscriptionsApiUrl =
      'https://pasa-hero-server.vercel.app/api/user-subscriptions/';
  static const String _routesApiUrl =
      'https://pasa-hero-server.vercel.app/api/routes';
  static const String _usersByFirebaseUidBaseUrl =
      'https://pasa-hero-server.vercel.app/api/users/firebase';

  List<OperatorRouteOption> _routes = [];
  Map<String, int> _activeByRoute = {};
  Set<String> _followingRouteCodes = {};
  bool _loading = true;
  bool _submittingFollow = false;
  String _search = '';

  @override
  void initState() {
    super.initState();
    _loadRoutes();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadRoutes() async {
    setState(() => _loading = true);
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
      if (!mounted) return;
      setState(() {
        _routes = routes;
        _activeByRoute = counts;
        _loading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() => _loading = false);
    }
  }

  Future<void> _followRoute(OperatorRouteOption route) async {
    if (_submittingFollow) return;
    final user = FirebaseAuth.instance.currentUser;
    if (user == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please sign in first.')),
      );
      return;
    }

    setState(() => _submittingFollow = true);
    try {
      final uri = Uri.parse(_subscriptionsApiUrl);
      final normalizedRouteCode = route.code.trim().toUpperCase();
      final backendUserId = await _fetchBackendUserId(user.uid);
      final routeId = await _fetchRouteIdByCode(normalizedRouteCode);
      if (backendUserId == null || backendUserId.isEmpty) {
        throw Exception('Could not resolve backend user_id for this account.');
      }
      if (routeId == null || routeId.isEmpty) {
        throw Exception('Could not resolve route_id for $normalizedRouteCode.');
      }

      final idToken = await user.getIdToken();
      final headers = <String, String>{
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      };
      if (idToken != null && idToken.isNotEmpty) {
        headers['Authorization'] = 'Bearer $idToken';
      }

      final response = await http
          .post(
            uri,
            headers: headers,
            body: jsonEncode({
              'user_id': backendUserId,
              'route_id': routeId,
            }),
          )
          .timeout(const Duration(seconds: 12));

      final message = _extractServerMessage(response.body);
      final isSuccess = response.statusCode >= 200 && response.statusCode < 300;
      final isAlreadyFollowed =
          response.statusCode == 409 || message.toLowerCase().contains('already');

      if (isSuccess || isAlreadyFollowed) {
        if (!mounted) return;
        setState(() {
          _followingRouteCodes.add(normalizedRouteCode);
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Now following $normalizedRouteCode.')),
        );
      } else {
        throw Exception('[${response.statusCode}] $message');
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Could not follow route: $e')),
      );
    } finally {
      if (mounted) {
        setState(() => _submittingFollow = false);
      }
    }
  }

  Future<String?> _fetchBackendUserId(String firebaseUid) async {
    final uri = Uri.parse('$_usersByFirebaseUidBaseUrl/$firebaseUid');
    final response = await http.get(uri).timeout(const Duration(seconds: 12));
    if (response.statusCode < 200 || response.statusCode >= 300) {
      return null;
    }
    try {
      final decoded = jsonDecode(response.body);
      if (decoded is Map<String, dynamic>) {
        final rootId = decoded['_id']?.toString().trim();
        if (rootId != null && rootId.isNotEmpty) return rootId;

        final data = decoded['data'];
        if (data is Map<String, dynamic>) {
          final dataId = data['_id']?.toString().trim();
          if (dataId != null && dataId.isNotEmpty) return dataId;
          final user = data['user'];
          if (user is Map<String, dynamic>) {
            final userId = user['_id']?.toString().trim();
            if (userId != null && userId.isNotEmpty) return userId;
          }
        }
      }
    } catch (_) {}
    return null;
  }

  Future<String?> _fetchRouteIdByCode(String routeCode) async {
    final response =
        await http.get(Uri.parse(_routesApiUrl)).timeout(const Duration(seconds: 12));
    if (response.statusCode < 200 || response.statusCode >= 300) {
      return null;
    }
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
        if (code == routeCode) {
          final id = item['_id']?.toString().trim();
          if (id != null && id.isNotEmpty) return id;
        }
      }
    } catch (_) {}
    return null;
  }

  String _extractServerMessage(String responseBody) {
    try {
      final decoded = jsonDecode(responseBody);
      if (decoded is Map<String, dynamic>) {
        for (final key in ['message', 'error', 'detail']) {
          final v = decoded[key]?.toString().trim();
          if (v != null && v.isNotEmpty) {
            return v;
          }
        }
      }
    } catch (_) {}
    final body = responseBody.trim();
    return body.isEmpty ? 'Request failed' : body;
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
                      'Active Routes',
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
                                hintText: 'Search route',
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
                      : ListView.builder(
                          itemCount: filtered.length + 1,
                          itemBuilder: (context, index) {
                            if (index == filtered.length) {
                              return const SizedBox(height: 16);
                            }
                            final route = filtered[index];
                            final routeCode = route.code.toUpperCase();
                            final active = _activeByRoute[routeCode] ?? 0;
                            return RouteCard(
                              routeId: 'Route ${route.code}',
                              estimatedTime: 'Estimated: 20 min',
                              routeDescription: route.description ??
                                  route.displayName,
                              status: null,
                              showFollowButton: true,
                              isFollowing:
                                  _followingRouteCodes.contains(routeCode),
                              activeBuses: active,
                              onFollowPressed: _submittingFollow
                                  ? null
                                  : () => _followRoute(route),
                            );
                          },
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
