import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import '../../../core/services/operator_location_sync_service.dart';
import '../../../core/services/operator_session_service.dart';
import 'modal/free_ride.dart';
import 'screen/profile_screen_data.dart';

/// Operator profile screen shown after login.
class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  static const String routeName = '/profile';

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  String? _currentRouteCode;
  List<RouteInfo> _routeOptions = const [];
  bool _isLoading = true;
  bool _isUpdatingRoute = false;
  /// True while loading route catalog / free-ride flags before the picker opens.
  bool _routePickerLoading = false;

  @override
  void initState() {
    super.initState();
    _loadRouteCode();
  }

  Future<void> _loadRouteCode() async {
    final routeCode = await ProfileDataService.getOperatorRouteCode();
    var routeOptions = await RouteCatalogService.fetchAvailableRoutes();
    routeOptions =
        await RouteCatalogService.enrichRoutesWithMongoFreeRideFlags(routeOptions);
    if (!mounted) return;
    setState(() {
      _currentRouteCode = routeCode;
      _routeOptions = routeOptions;
      _isLoading = false;
    });
  }

  String _routeNameForCode(String? code) {
    if (code == null || code.trim().isEmpty) return 'Unknown';
    final key = code.trim().toUpperCase();
    for (final r in _routeOptions) {
      if (r.code.trim().toUpperCase() == key) return r.name;
    }
    return code;
  }

  bool _currentRouteIsFreeRideEligible() {
    final c = _currentRouteCode?.trim().toUpperCase();
    if (c == null || c.isEmpty) return false;
    for (final r in _routeOptions) {
      if (r.code.trim().toUpperCase() == c) return r.isFreeRideRoute;
    }
    return false;
  }

  Future<void> _showProfileInformation() async {
    final user = FirebaseAuth.instance.currentUser;
    final profile = await ProfileDataService.getOperatorProfile();
    
    if (!mounted) return;
    
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Profile Information'),
        content: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              _buildInfoRow('Email', user?.email ?? 'N/A'),
              const SizedBox(height: 12),
              _buildInfoRow('Role', profile?['role'] ?? 'operator'),
              const SizedBox(height: 12),
              _buildInfoRow('Route Code', _currentRouteCode ?? 'Not set'),
              if (_currentRouteCode != null) ...[
                const SizedBox(height: 12),
                _buildInfoRow(
                  'Route Name',
                  _routeNameForCode(_currentRouteCode),
                ),
              ],
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Close'),
          ),
        ],
      ),
    );
  }

  Widget _buildFreeRideCard() {
    return FreeRideCard(
      currentRouteCode: _currentRouteCode,
      isDesignatedFreeRideRoute: _currentRouteIsFreeRideEligible(),
    );
  }

  Widget _buildInfoRow(String label, String value) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(
            fontSize: 12,
            color: Colors.grey,
            fontWeight: FontWeight.w500,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          value,
          style: const TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w600,
          ),
        ),
      ],
    );
  }

  Future<void> _showRouteSelection() async {
    if (_isUpdatingRoute || _routePickerLoading) return;
    setState(() => _routePickerLoading = true);
    late RouteCatalogFetchResult catalog;
    late List<RouteInfo> options;
    try {
      catalog = await RouteCatalogService.fetchRouteCatalog();
      if (!mounted) return;
      options =
          catalog.routes.isNotEmpty ? catalog.routes : _routeOptions;
      options =
          await RouteCatalogService.enrichRoutesWithMongoFreeRideFlags(options);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Could not load routes: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
      return;
    } finally {
      if (mounted) setState(() => _routePickerLoading = false);
    }

    if (!mounted) return;

    String? selectedRouteCode = _currentRouteCode;
    final result = await showDialog<String>(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: const Text('Select Route'),
          content: SingleChildScrollView(
            child: options.isEmpty
                ? Text(catalog.emptySelectionMessage)
                : Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Padding(
                        padding: const EdgeInsets.only(bottom: 12),
                        child: Text(
                          'Free ride routes are labeled below (from the server).',
                          style: TextStyle(
                            fontSize: 13,
                            color: Colors.grey.shade700,
                          ),
                        ),
                      ),
                      ...options.map((route) {
                      final isSelected = selectedRouteCode == route.code;
                      return RadioListTile<String>(
                        title: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Expanded(
                              child: Text(
                                route.name,
                                style: const TextStyle(
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ),
                            if (route.isFreeRideRoute) ...[
                              const SizedBox(width: 8),
                              Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 8,
                                  vertical: 4,
                                ),
                                decoration: BoxDecoration(
                                  color: Colors.amber.shade100,
                                  borderRadius: BorderRadius.circular(8),
                                  border: Border.all(
                                    color: Colors.amber.shade700,
                                  ),
                                ),
                                child: Text(
                                  'FREE RIDE',
                                  style: TextStyle(
                                    fontSize: 10,
                                    fontWeight: FontWeight.w800,
                                    color: Colors.amber.shade900,
                                    letterSpacing: 0.3,
                                  ),
                                ),
                              ),
                            ],
                          ],
                        ),
                        subtitle: Padding(
                          padding: const EdgeInsets.only(top: 4),
                          child: Text('Code: ${route.code}'),
                        ),
                        isThreeLine: route.isFreeRideRoute,
                        value: route.code,
                        groupValue: selectedRouteCode,
                        onChanged: (value) {
                          setDialogState(() {
                            selectedRouteCode = value;
                          });
                        },
                        selected: isSelected,
                      );
                    }),
                    ],
                  ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('Cancel'),
            ),
            if (selectedRouteCode != null)
              TextButton(
                onPressed: () => Navigator.of(context).pop(selectedRouteCode),
                child: const Text('Save'),
              ),
          ],
        ),
      ),
    );

    if (result != null && result != _currentRouteCode) {
      setState(() => _isUpdatingRoute = true);
      final success = await ProfileDataService.updateOperatorRouteCode(result);
      if (success) {
        await OperatorLocationSyncService.instance
            .mergeRouteCodeIntoOperatorLocation(result);
      }
      if (mounted) {
        setState(() {
          _isUpdatingRoute = false;
          if (success) {
            _currentRouteCode = result;
            _routeOptions = options;
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text('Route updated to: ${_routeNameForCode(result)}'),
                backgroundColor: Colors.green,
              ),
            );
          } else {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text('Failed to update route. Please try again.'),
                backgroundColor: Colors.red,
              ),
            );
          }
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = FirebaseAuth.instance.currentUser;
    final email = user?.email ?? '';
    final routeOverlayBusy = _routePickerLoading || _isUpdatingRoute;

    return Stack(
      fit: StackFit.expand,
      children: [
        Scaffold(
          backgroundColor: Colors.white,
          appBar: AppBar(
            title: const Text('Profile'),
            backgroundColor: Colors.blue,
            foregroundColor: Colors.white,
          ),
          body: SafeArea(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : SingleChildScrollView(
                    padding: const EdgeInsets.all(24.0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                    const SizedBox(height: 24),
                    CircleAvatar(
                      radius: 48,
                      backgroundColor: Colors.blue.shade100,
                      child: Icon(Icons.person, size: 56, color: Colors.blue.shade700),
                    ),
                    const SizedBox(height: 24),
                    const Text(
                      'Operator',
                      style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 8),
                    Text(
                      email,
                      style: TextStyle(fontSize: 16, color: Colors.grey.shade700),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 48),
                    // Profile Information Button
                    Card(
                      elevation: 2,
                      child: ListTile(
                        leading: const Icon(Icons.info_outline, color: Colors.blue),
                        title: const Text('Profile Information'),
                        subtitle: const Text('View your account details'),
                        trailing: const Icon(Icons.chevron_right),
                        onTap: _showProfileInformation,
                      ),
                    ),
                    const SizedBox(height: 16),
                    Card(
                      elevation: 2,
                      child: ListTile(
                        leading: const Icon(Icons.route, color: Colors.blue),
                        title: const Text('Route'),
                        subtitle: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              _currentRouteCode != null
                                  ? '${_routeNameForCode(_currentRouteCode)} (Code: $_currentRouteCode)'
                                  : 'Not set - Tap to select',
                            ),
                            if (_currentRouteCode != null &&
                                _currentRouteIsFreeRideEligible()) ...[
                              const SizedBox(height: 8),
                              Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 8,
                                  vertical: 4,
                                ),
                                decoration: BoxDecoration(
                                  color: Colors.amber.shade100,
                                  borderRadius: BorderRadius.circular(6),
                                  border: Border.all(
                                    color: Colors.amber.shade700,
                                  ),
                                ),
                                child: Text(
                                  'Free ride route',
                                  style: TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w700,
                                    color: Colors.amber.shade900,
                                  ),
                                ),
                              ),
                            ],
                          ],
                        ),
                        isThreeLine: _currentRouteCode != null &&
                            _currentRouteIsFreeRideEligible(),
                        trailing: const Icon(Icons.chevron_right),
                        onTap: routeOverlayBusy ? null : _showRouteSelection,
                      ),
                    ),
                    const SizedBox(height: 16),
                    // Free Ride indicator card
                    _buildFreeRideCard(),
                    const SizedBox(height: 48),
                    OutlinedButton.icon(
                      onPressed: () => _signOut(context),
                      icon: const Icon(Icons.logout),
                      label: const Text('Sign out'),
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 14),
                      ),
                    ),
                      ],
                    ),
                  ),
          ),
        ),
        if (routeOverlayBusy)
          Positioned.fill(
            child: AbsorbPointer(
              child: Material(
                color: Colors.black54,
                child: Center(
                  child: Card(
                    elevation: 10,
                    margin: const EdgeInsets.symmetric(horizontal: 32),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 32,
                        vertical: 28,
                      ),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const SizedBox(
                            width: 40,
                            height: 40,
                            child: CircularProgressIndicator(strokeWidth: 3),
                          ),
                          const SizedBox(height: 18),
                          Text(
                            _routePickerLoading
                                ? 'Loading route list…'
                                : 'Saving route…',
                            textAlign: TextAlign.center,
                            style: Theme.of(context).textTheme.titleMedium
                                ?.copyWith(fontWeight: FontWeight.w600),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
      ],
    );
  }

  Future<void> _signOut(BuildContext context) async {
    final user = FirebaseAuth.instance.currentUser;
    if (user != null) {
      final db = FirebaseFirestore.instance;
      // Mark operator account offline before sign out.
      await db.collection('users').doc(user.uid).set({
        'status': 0,
        'online': 0,
        'last_seen': FieldValue.serverTimestamp(),
        'updatedAt': FieldValue.serverTimestamp(),
      }, SetOptions(merge: true));

      // Mark operator live location offline then remove it from live map.
      await db.collection(operatorLocationsCollection).doc(user.uid).set({
        'status': 0,
        'online': 0,
        'updatedAt': FieldValue.serverTimestamp(),
      }, SetOptions(merge: true));
      await db.collection(operatorLocationsCollection).doc(user.uid).delete();
    }
    OperatorLocationSyncService.instance.stop();
    await OperatorSessionService.instance.clear();
    await FirebaseAuth.instance.signOut();
    if (context.mounted) {
      Navigator.of(context).pushReplacementNamed('/login');
    }
  }
}
