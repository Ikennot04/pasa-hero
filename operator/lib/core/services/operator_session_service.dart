import 'dart:convert';

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// ## Operator login: Mongo primary, Firebase secondary
///
/// Authentication is validated only against the Node/Mongo API (`/api/users/auth/signin`).
/// A JWT session is stored locally. Firebase Auth uses **email/password** with the same
/// credentials: sign-in if the user already exists in Firebase, otherwise a shadow account
/// is created so Firestore rules see `request.auth` (no Anonymous provider required).
/// See `docs/operator_login_flow.md`.

const String _prefJwt = 'operator_jwt';
const String _prefUserJson = 'operator_user_json';

/// Persists Mongo/API login (JWT + user payload) and rehydrates Firestore profile for the current Firebase user.
class OperatorSessionService {
  OperatorSessionService._();
  static final OperatorSessionService instance = OperatorSessionService._();

  String? _jwt;
  Map<String, dynamic>? _userMap;

  String? get jwt => _jwt;
  Map<String, dynamic>? get userMap => _userMap;

  static String? mongoIdFromUserMap(Map<String, dynamic>? u) {
    if (u == null) return null;
    final id = u['_id'] ?? u['id'];
    if (id is String && id.isNotEmpty) return id;
    if (id is Map) {
      final oid = id[r'$oid'] ?? id['oid'];
      if (oid is String && oid.isNotEmpty) return oid;
    }
    final s = id?.toString();
    if (s == null || s.isEmpty || s == 'null') return null;
    return s;
  }

  /// `userId` from the login JWT — matches [attachAuthUser] / pending-assignment URL checks on the server.
  static String? mongoUserIdFromJwt(String? token) {
    if (token == null || token.trim().isEmpty) return null;
    try {
      final parts = token.split('.');
      if (parts.length < 2) return null;
      var normalized = parts[1].replaceAll('-', '+').replaceAll('_', '/');
      final pad = normalized.length % 4;
      if (pad == 2) {
        normalized += '==';
      } else if (pad == 3) {
        normalized += '=';
      } else if (pad == 1) {
        return null;
      }
      final json = utf8.decode(base64.decode(normalized));
      final map = jsonDecode(json) as Map<String, dynamic>;
      final uid = map['userId'];
      if (uid is String && uid.isNotEmpty) return uid;
      if (uid is Map) {
        final oid = uid[r'$oid'] ?? uid['oid'];
        if (oid is String && oid.isNotEmpty) return oid;
      }
      final s = uid?.toString();
      if (s == null || s.isEmpty || s == 'null') return null;
      return s;
    } catch (_) {
      return null;
    }
  }

  /// Prefer JWT subject id (authoritative for API auth), then sign-in payload.
  String? resolveMongoUserId() {
    final fromJwt = mongoUserIdFromJwt(_jwt);
    if (fromJwt != null && fromJwt.isNotEmpty) return fromJwt.trim();
    return mongoIdFromUserMap(_userMap)?.trim();
  }

  Future<void> loadFromPrefs() async {
    final p = await SharedPreferences.getInstance();
    _jwt = p.getString(_prefJwt);
    final raw = p.getString(_prefUserJson);
    if (raw == null || raw.isEmpty) {
      _userMap = null;
      return;
    }
    try {
      final decoded = jsonDecode(raw);
      _userMap = decoded is Map<String, dynamic>
          ? decoded
          : Map<String, dynamic>.from(decoded as Map);
    } catch (_) {
      _userMap = null;
    }
  }

  Future<void> saveSession({
    required String jwt,
    required Map<String, dynamic> userMap,
  }) async {
    _jwt = jwt;
    _userMap = userMap;
    final p = await SharedPreferences.getInstance();
    await p.setString(_prefJwt, jwt);
    await p.setString(_prefUserJson, jsonEncode(userMap));
  }

  Future<void> clear() async {
    _jwt = null;
    _userMap = null;
    final p = await SharedPreferences.getInstance();
    await p.remove(_prefJwt);
    await p.remove(_prefUserJson);
  }

  /// True when a JWT is stored and its `exp` is still in the future (UTC).
  bool get hasValidJwt {
    final t = _jwt?.trim();
    if (t == null || t.isEmpty) return false;
    return !_isJwtExpired(t);
  }

  static bool _isJwtExpired(String token) {
    try {
      final parts = token.split('.');
      if (parts.length < 2) return true;
      final payload = parts[1];
      var normalized = payload.replaceAll('-', '+').replaceAll('_', '/');
      final pad = normalized.length % 4;
      if (pad == 2) {
        normalized += '==';
      } else if (pad == 3) {
        normalized += '=';
      } else if (pad == 1) {
        return true;
      }
      final json = utf8.decode(base64.decode(normalized));
      final map = jsonDecode(json) as Map<String, dynamic>;
      final exp = map['exp'];
      if (exp is! num) return false;
      final expiry = DateTime.fromMillisecondsSinceEpoch(exp.toInt() * 1000, isUtc: true);
      return DateTime.now().toUtc().isAfter(expiry.subtract(const Duration(seconds: 30)));
    } catch (_) {
      return false;
    }
  }

  /// Syncs the Mongo-backed operator into Firestore `users/{firebaseAuthUid}` (email auth uid).
  ///
  /// **Idempotency:** If a document already exists for this Firebase uid and it is already
  /// linked to the same `mongo_user_id` and email as the current session, only lightweight
  /// sync fields are written (no duplicate full profile write). Otherwise creates the doc
  /// or merges corrected fields.
  Future<void> mergeMongoProfileIntoFirestoreUsersCollection() async {
    final fb = FirebaseAuth.instance.currentUser;
    final mongo = _userMap;
    if (fb == null || mongo == null) return;

    final mongoId = mongoIdFromUserMap(mongo) ?? '';
    final incomingEmail =
        (mongo['email']?.toString() ?? fb.email ?? '').trim().toLowerCase();

    final data = <String, dynamic>{
      'email': mongo['email']?.toString() ?? fb.email ?? '',
      'mongo_user_id': mongoId,
      'role': 'operator',
      'roleid': 2,
      'role_id': 2,
      'updatedAt': FieldValue.serverTimestamp(),
    };
    if (mongo['f_name'] != null) data['f_name'] = mongo['f_name'];
    if (mongo['l_name'] != null) data['l_name'] = mongo['l_name'];
    if (mongo['routeCode'] != null) {
      data['routeCode'] = mongo['routeCode'].toString();
      data['route_code'] = mongo['routeCode'].toString();
    } else if (mongo['route_code'] != null) {
      data['route_code'] = mongo['route_code'].toString();
      data['routeCode'] = mongo['route_code'].toString();
    }

    data.removeWhere((k, v) => v == null);

    final doc = FirebaseFirestore.instance.collection('users').doc(fb.uid);
    final existing = await doc.get();
    final prev = existing.data();

    if (existing.exists && prev != null && mongoId.isNotEmpty) {
      final prevMongo = prev['mongo_user_id']?.toString() ?? '';
      final prevEmail = prev['email']?.toString().trim().toLowerCase() ?? '';
      if (prevMongo == mongoId && prevEmail == incomingEmail) {
        // Still merge route/name from Mongo — otherwise repeat logins never refresh
        // Firestore [users.routeCode] and riders keep seeing stale / empty route.
        final patch = <String, dynamic>{
          'updatedAt': FieldValue.serverTimestamp(),
          'last_mongo_login_sync_at': FieldValue.serverTimestamp(),
        };
        if (data.containsKey('routeCode')) {
          patch['routeCode'] = data['routeCode'];
          patch['route_code'] = data['route_code'];
        }
        if (data.containsKey('f_name')) patch['f_name'] = data['f_name'];
        if (data.containsKey('l_name')) patch['l_name'] = data['l_name'];
        await doc.set(patch, SetOptions(merge: true));
        return;
      }
    }

    if (!existing.exists) {
      data['createdAt'] = FieldValue.serverTimestamp();
      data['last_mongo_login_sync_at'] = FieldValue.serverTimestamp();
      await doc.set(data);
    } else {
      data['last_mongo_login_sync_at'] = FieldValue.serverTimestamp();
      await doc.set(data, SetOptions(merge: true));
    }
  }
}
