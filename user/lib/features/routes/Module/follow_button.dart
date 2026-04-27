import 'dart:convert';

import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;

import '../../../core/services/subscription_ids_service.dart';
import '../../../core/themes/validation_theme.dart';
import '../route_constants.dart';

/// Subscribes the user to a route via the backend (`user_id` + `route_id`).
class FollowButton extends StatefulWidget {
  final String? userId;
  final String? routeId;
  final bool isFollowing;
  final String routeLabel;
  final void Function(String routeCode, bool isFollowing)? onFollowChanged;

  const FollowButton({
    super.key,
    required this.userId,
    required this.routeId,
    this.isFollowing = false,
    required this.routeLabel,
    this.onFollowChanged,
  });

  @override
  State<FollowButton> createState() => _FollowButtonState();
}

class _FollowButtonState extends State<FollowButton> {
  bool _submitting = false;
  late bool _isFollowingLocal;

  @override
  void initState() {
    super.initState();
    _isFollowingLocal = widget.isFollowing;
  }

  @override
  void didUpdateWidget(covariant FollowButton oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (!_submitting && oldWidget.isFollowing != widget.isFollowing) {
      _isFollowingLocal = widget.isFollowing;
    }
  }

  Future<void> _toggleFollow() async {
    if (_submitting) return;

    final user = FirebaseAuth.instance.currentUser;
    if (user == null) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please sign in first.')),
      );
      return;
    }

    setState(() => _submitting = true);
    var userId = widget.userId?.trim();
    var routeId = widget.routeId?.trim();
    if (userId == null || userId.isEmpty) {
      userId = await SubscriptionIdsService.backendUserIdForFirebaseUid(
        user.uid,
        email: user.email,
      );
    }
    // Fallback to Firebase uid so follow is not blocked by lookup failures.
    userId = (userId == null || userId.isEmpty) ? user.uid : userId;
    if (routeId == null || routeId.isEmpty) {
      routeId = await SubscriptionIdsService.routeIdForCode(widget.routeLabel);
    }
    if (routeId == null || routeId.isEmpty) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Could not find this route on the server.'),
        ),
      );
      return;
    }

    try {
      final uri = Uri.parse(kRouteSubscriptionsApiUrl);
      final idToken = await user.getIdToken();
      final headers = <String, String>{
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      };
      if (idToken != null && idToken.isNotEmpty) {
        headers['Authorization'] = 'Bearer $idToken';
      }

      final payload = jsonEncode({
        'user_id': userId,
        'route_id': routeId,
      });
      final response = widget.isFollowing
          ? await http
              .delete(
                uri,
                headers: headers,
                body: payload,
              )
              .timeout(const Duration(seconds: 12))
          : await http
              .post(
                uri,
                headers: headers,
                body: payload,
              )
              .timeout(const Duration(seconds: 12));

      final message = _extractServerMessage(response.body);
      final isSuccess = response.statusCode >= 200 && response.statusCode < 300;
      final isAlreadyFollowed =
          response.statusCode == 409 || message.toLowerCase().contains('already');
      final isAlreadyUnfollowed =
          response.statusCode == 404 || message.toLowerCase().contains('not found');

      final nowFollowing = !_isFollowingLocal;
      final treatAsSuccess = nowFollowing
          ? (isSuccess || isAlreadyFollowed)
          : (isSuccess || isAlreadyUnfollowed);

      if (treatAsSuccess) {
        if (!mounted) return;
        setState(() => _isFollowingLocal = nowFollowing);
        widget.onFollowChanged?.call(widget.routeLabel, nowFollowing);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              nowFollowing
                  ? 'Now following ${widget.routeLabel}.'
                  : 'Unfollowed ${widget.routeLabel}.',
            ),
          ),
        );
      } else {
        throw Exception('[${response.statusCode}] $message');
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            widget.isFollowing
                ? 'Could not unfollow route: $e'
                : 'Could not follow route: $e',
          ),
        ),
      );
    } finally {
      if (mounted) {
        setState(() => _submitting = false);
      }
    }
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
    final canPress = !_submitting;
    final isFollowing = _isFollowingLocal;

    return OutlinedButton(
      onPressed: canPress ? _toggleFollow : null,
      style: OutlinedButton.styleFrom(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        side: BorderSide(
          color: ValidationTheme.primaryBlue,
          width: 1.5,
        ),
        backgroundColor: isFollowing
            ? ValidationTheme.primaryBlue
            : ValidationTheme.backgroundWhite,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(8),
        ),
      ),
      child: _submitting
          ? const SizedBox(
              width: 18,
              height: 18,
              child: CircularProgressIndicator(
                strokeWidth: 2,
                color: ValidationTheme.primaryBlue,
              ),
            )
          : Text(
              isFollowing ? 'Unfollow' : 'Follow',
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: isFollowing
                    ? ValidationTheme.backgroundWhite
                    : ValidationTheme.primaryBlue,
              ),
            ),
    );
  }
}
