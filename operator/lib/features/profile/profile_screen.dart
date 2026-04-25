import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import '../../../core/services/driver_status_service.dart';
import '../../../core/services/operator_location_sync_service.dart';
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

  static String _formatDateTime(DateTime d) {
    final y = d.year;
    final m = d.month.toString().padLeft(2, '0');
    final day = d.day.toString().padLeft(2, '0');
    final h = d.hour.toString().padLeft(2, '0');
    final min = d.minute.toString().padLeft(2, '0');
    return '$y-$m-$day $h:$min';
  }

  Widget _buildFreeRideCard() {
    if (_currentRouteCode == null || _currentRouteCode!.isEmpty) {
      return Card(
        elevation: 2,
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Icon(Icons.card_giftcard, color: Colors.grey.shade600),
                  const SizedBox(width: 12),
                  const Text(
                    'Free Ride',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                'Select a route to manage Free Ride',
                style: TextStyle(fontSize: 14, color: Colors.grey.shade600),
              ),
            ],
          ),
        ),
      );
    }
    final routeId = _currentRouteCode!;
    return StreamBuilder<FreeRideDetails?>(
      stream: DriverStatusService.instance.freeRideDetailsStream(routeId),
      builder: (context, snapshot) {
        final details = snapshot.data;
        final freeRideValue = details?.freeRideValue ?? 0;
        final isActive = freeRideValue == 1;
        final buttonText = isActive ? 'Stop the free ride' : 'Strat free ride';
        return Card(
          elevation: 2,
          child: Padding(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Text(
                  'Free Ride',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                    color: Colors.black87,
                  ),
                ),
                const SizedBox(height: 12),
                Material(
                  color: Colors.transparent,
                  child: InkWell(
                    onTap: () => _onFreeRideButtonTap(routeId, details),
                    borderRadius: BorderRadius.circular(8),
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        vertical: 14,
                        horizontal: 20,
                      ),
                      decoration: BoxDecoration(
                        color: isActive
                            ? Colors.red.shade400
                            : Colors.blue.shade500,
                        borderRadius: BorderRadius.circular(8),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black26,
                            blurRadius: 4,
                            offset: const Offset(0, 2),
                          ),
                        ],
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          if (isActive) ...[
                            const Icon(
                              Icons.close,
                              color: Colors.white,
                              size: 24,
                            ),
                            const SizedBox(width: 10),
                          ],
                          Text(
                            buttonText,
                            style: const TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                              color: Colors.white,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 14),
                _buildTimeDetails(details),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildTimeDetails(FreeRideDetails? details) {
    if (details == null) {
      return Text(
        'No free ride scheduled',
        style: TextStyle(fontSize: 13, color: Colors.grey.shade600),
      );
    }
    if (!details.isActive && details.endTime == null && details.startTime == null) {
      return Text(
        'No free ride scheduled',
        style: TextStyle(fontSize: 13, color: Colors.grey.shade600),
      );
    }
    final startStr = details.startTime != null
        ? _formatDateTime(details.startTime!)
        : '—';
    final endStr = details.endTime != null
        ? _formatDateTime(details.endTime!)
        : '—';
    final durationText = details.durationMinutes != null
        ? '${details.durationMinutes} minute(s)'
        : (details.startTime != null && details.endTime != null)
            ? '${details.endTime!.difference(details.startTime!).inMinutes} minute(s)'
            : '—';
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Starts: $startStr',
          style: TextStyle(fontSize: 13, color: Colors.grey.shade700),
        ),
        const SizedBox(height: 4),
        Text(
          'Ends: $endStr',
          style: TextStyle(fontSize: 13, color: Colors.grey.shade700),
        ),
        const SizedBox(height: 4),
        Text(
          'Duration: $durationText',
          style: TextStyle(fontSize: 13, color: Colors.grey.shade700),
        ),
      ],
    );
  }

  Future<void> _onFreeRideButtonTap(
    String routeId,
    FreeRideDetails? details,
  ) async {
    final isActive = details?.isActive ?? false;
    if (isActive) {
      final confirm = await showDialog<bool>(
        context: context,
        builder: (ctx) => AlertDialog(
          title: const Text('Turn off Free Ride?'),
          content: const Text(
            'Free ride will be disabled for your route. Passengers will see the change immediately.',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(ctx).pop(false),
              child: const Text('Cancel'),
            ),
            TextButton(
              onPressed: () => Navigator.of(ctx).pop(true),
              child: const Text('Turn off'),
            ),
          ],
        ),
      );
      if (confirm == true && mounted) {
        final operatorId = FirebaseAuth.instance.currentUser?.uid;
        if (operatorId == null || operatorId.isEmpty) return;
        await DriverStatusService.instance.setFreeRideStatus(
          routeId,
          isFreeRide: false,
          operatorId: operatorId,
        );
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Free ride turned off'),
              backgroundColor: Colors.orange,
            ),
          );
        }
      }
    } else {
      final now = DateTime.now();
      if (!mounted) return;
      DateTime? endTime = now.add(const Duration(hours: 1));
      final picked = await showDialog<DateTime>(
        context: context,
        builder: (ctx) => StatefulBuilder(
          builder: (ctx, setState) {
            return AlertDialog(
              title: const Text('Turn on Free Ride'),
              content: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Set when the free ride should end:',
                      style: TextStyle(fontSize: 14),
                    ),
                    const SizedBox(height: 16),
                    ListTile(
                      title: const Text('End time'),
                      subtitle: Text(
                        endTime != null
                            ? _formatDateTime(endTime!)
                            : 'Not set',
                      ),
                      trailing: const Icon(Icons.access_time),
                      onTap: () async {
                        final t = await showTimePicker(
                          context: ctx,
                          initialTime: TimeOfDay.fromDateTime(endTime ?? now),
                        );
                        if (t != null) {
                          final d = endTime ?? now;
                          setState(() {
                            endTime = DateTime(
                              d.year,
                              d.month,
                              d.day,
                              t.hour,
                              t.minute,
                            );
                            if (endTime!.isBefore(now)) {
                              final tomorrow = now.add(const Duration(days: 1));
                              endTime = DateTime(
                                tomorrow.year,
                                tomorrow.month,
                                tomorrow.day,
                                t.hour,
                                t.minute,
                              );
                            }
                          });
                        }
                      },
                    ),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 8,
                      children: [
                        ActionChip(
                          label: const Text('30 min'),
                          onPressed: () {
                            setState(() => endTime = now.add(const Duration(minutes: 30)));
                          },
                        ),
                        ActionChip(
                          label: const Text('1 hour'),
                          onPressed: () {
                            setState(() => endTime = now.add(const Duration(hours: 1)));
                          },
                        ),
                        ActionChip(
                          label: const Text('2 hours'),
                          onPressed: () {
                            setState(() => endTime = now.add(const Duration(hours: 2)));
                          },
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.of(ctx).pop(),
                  child: const Text('Cancel'),
                ),
                FilledButton(
                  onPressed: endTime != null
                      ? () => Navigator.of(ctx).pop(endTime)
                      : null,
                  child: const Text('Strat free ride'),
                ),
              ],
            );
          },
        ),
      );
      if (picked != null && mounted) {
        final operatorId = FirebaseAuth.instance.currentUser?.uid;
        if (operatorId == null || operatorId.isEmpty) return;
        await DriverStatusService.instance.setFreeRideStatus(
          routeId,
          isFreeRide: true,
          operatorId: operatorId,
          freeRideUntil: picked,
          freeRideFrom: now,
        );
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Free ride is now on'),
              backgroundColor: Colors.green,
            ),
          );
        }
      }
    }
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
