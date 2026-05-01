import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import '../../../core/services/operator_location_sync_service.dart';
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

  @override
  void initState() {
    super.initState();
    _loadRouteCode();
  }

  Future<void> _loadRouteCode() async {
    final routeCode = await ProfileDataService.getOperatorRouteCode();
    final routeOptions = await RouteCatalogService.fetchAvailableRoutes();
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
    return FreeRideCard(currentRouteCode: _currentRouteCode);
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
    if (_isUpdatingRoute) return;
    final latestOptions = await RouteCatalogService.fetchAvailableRoutes();
    if (!mounted) return;
    String? selectedRouteCode = _currentRouteCode;
    final options = latestOptions.isNotEmpty ? latestOptions : _routeOptions;

    if (!mounted) return;

    final result = await showDialog<String>(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: const Text('Select Route'),
          content: SingleChildScrollView(
            child: options.isEmpty
                ? const Text(
                    'No routes found in Firestore yet. Add routes in `route_code` or `routes` first.',
                  )
                : Column(
                    mainAxisSize: MainAxisSize.min,
                    children: options.map((route) {
                      final isSelected = selectedRouteCode == route.code;
                      return RadioListTile<String>(
                        title: Text(route.name),
                        subtitle: Text('Code: ${route.code}'),
                        value: route.code,
                        groupValue: selectedRouteCode,
                        onChanged: (value) {
                          setDialogState(() {
                            selectedRouteCode = value;
                          });
                        },
                        selected: isSelected,
                      );
                    }).toList(),
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

    return Scaffold(
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
                    // Route Selection Card
                    Card(
                      elevation: 2,
                      child: ListTile(
                        leading: const Icon(Icons.route, color: Colors.blue),
                        title: const Text('Route'),
                        subtitle: Text(
                          _currentRouteCode != null
                              ? '${_routeNameForCode(_currentRouteCode)} (Code: $_currentRouteCode)'
                              : 'Not set - Tap to select',
                        ),
                        trailing: _isUpdatingRoute
                            ? const SizedBox(
                                width: 20,
                                height: 20,
                                child: CircularProgressIndicator(strokeWidth: 2),
                              )
                            : const Icon(Icons.chevron_right),
                        onTap: _isUpdatingRoute ? null : _showRouteSelection,
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
    await FirebaseAuth.instance.signOut();
    if (context.mounted) {
      Navigator.of(context).pushReplacementNamed('/login');
    }
  }
}
