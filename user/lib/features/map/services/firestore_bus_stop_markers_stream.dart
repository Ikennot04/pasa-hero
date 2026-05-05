import 'dart:async';

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';

import '../../../core/services/backend_route_geometry.dart';
import '../../../core/services/bus_stops_service.dart';
import '../../../core/services/route_stop_display_utils.dart';

/// Same ordering rules as [BackendRouteGeometry.orderedStopPointsFromDetail] so first/last
/// markers match route direction.
/// - No route filter: live [Marker]s from Firestore [bus_stops].
/// - With [routeCode]: **Mongo route detail** (`GET /api/routes` + `/api/routes/:id`), not Firestore.
class FirestoreBusStopMarkersStream {
  FirestoreBusStopMarkersStream._();

  /// Firestore nested maps are often [Map<Object?, Object?>], not [Map<String, dynamic>].
  static Map<String, dynamic>? asStringKeyedMap(dynamic value) {
    if (value == null) return null;
    if (value is Map<String, dynamic>) return value;
    if (value is Map) {
      return value.map((k, v) => MapEntry(k.toString(), v));
    }
    return null;
  }

  /// When [routeCode] is null/empty, listens to the [bus_stops] collection.
  /// Otherwise polls Vercel/Mongo for that route's stops and terminals (aligned with [route_code] in DB).
  static Stream<List<Marker>> watchStopMarkers({
    FirebaseFirestore? firestore,
    String? routeCode,
    required BitmapDescriptor icon,
    /// Same asset for first & last stop / Point A & B when route order exists.
    BitmapDescriptor? routeEndpointIcon,
  }) {
    final db = firestore ?? FirebaseFirestore.instance;
    final rc = routeCode?.trim();
    if (rc == null || rc.isEmpty) {
      return _watchBusStopsCollection(db, icon);
    }
    return _watchMongoRouteDetailMarkers(rc, icon, routeEndpointIcon);
  }

  /// Periodically refreshes markers from `GET /api/routes` → `GET /api/routes/:id` (Mongo).
  static Stream<List<Marker>> _watchMongoRouteDetailMarkers(
    String routeCode,
    BitmapDescriptor icon,
    BitmapDescriptor? routeEndpointIcon,
  ) {
    Future<List<Marker>> load() async {
      final detail = await BackendRouteGeometry.fetchRouteDetailByCode(routeCode);
      if (detail == null) return const [];
      return markersFromMongoRouteDetail(
        detail,
        icon,
        routeEndpointIcon: routeEndpointIcon,
      );
    }

    return Stream<List<Marker>>.multi((controller) {
      Timer? timer;
      Future<void> emit() async {
        if (controller.isClosed) return;
        try {
          final markers = await load();
          if (!controller.isClosed) controller.add(markers);
        } catch (_) {
          if (!controller.isClosed) controller.add(const []);
        }
      }

      controller.onCancel = () => timer?.cancel();

      emit();
      timer = Timer.periodic(const Duration(minutes: 2), (_) => emit());
    });
  }

  /// [route_stops] + terminals from Mongo route detail (same source as admin).
  static List<Marker> markersFromMongoRouteDetail(
    Map<String, dynamic> detail,
    BitmapDescriptor icon, {
    BitmapDescriptor? routeEndpointIcon,
  }) {
    final se = BackendRouteGeometry.startEndFromRouteDetail(detail);
    final syntheticParent = <String, dynamic>{
      if (se.start != null)
        'start_location': {
          'latitude': se.start!.latitude,
          'longitude': se.start!.longitude,
        },
      if (se.end != null)
        'end_location': {
          'latitude': se.end!.latitude,
          'longitude': se.end!.longitude,
        },
      if (se.start != null)
        'pointA': {
          'latitude': se.start!.latitude,
          'longitude': se.start!.longitude,
        },
      if (se.end != null)
        'pointB': {
          'latitude': se.end!.latitude,
          'longitude': se.end!.longitude,
        },
    };
    final raw = detail['route_stops'] ?? detail['routeStops'];
    final normalized =
        _mongoStopsWithDisplayNames(raw is List ? List<dynamic>.from(raw) : const []);
    var fromStops = markersFromStopsArray(
      normalized,
      icon,
      routeEndpointIcon: routeEndpointIcon,
      routeDocument: syntheticParent,
    );
    final endpointPin = routeEndpointIcon ?? icon;
    fromStops = _appendOrphanTerminalMarkersIfNeeded(fromStops, se, endpointPin);
    if (fromStops.isNotEmpty) return fromStops;

    return markersFromRouteCodeDocument(
      <String, dynamic>{
        ...syntheticParent,
        'busStops': <dynamic>[],
      },
      icon,
      routeEndpointIcon: routeEndpointIcon,
    );
  }

  static List<dynamic> _mongoStopsWithDisplayNames(List<dynamic> raw) {
    final out = <dynamic>[];
    for (final item in raw) {
      if (item is GeoPoint) {
        out.add(item);
        continue;
      }
      final m = asStringKeyedMap(item);
      if (m == null) {
        out.add(item);
        continue;
      }
      final copy = Map<String, dynamic>.from(m);
      if (copy['name'] == null) {
        final n = copy['stop_name'] ?? copy['stopName'];
        if (n != null) copy['name'] = n.toString();
      }
      out.add(copy);
    }
    return out;
  }

  /// If the physical start/end terminal is not within [RouteStopDisplayUtils.nearTerminal] of
  /// any [route_stops] pin, add a dedicated endpoint marker. Otherwise the “start” can
  /// disappear when the first listed stop is past the terminal.
  static List<Marker> _appendOrphanTerminalMarkersIfNeeded(
    List<Marker> markers,
    ({LatLng? start, LatLng? end}) terminals,
    BitmapDescriptor endpointPin,
  ) {
    bool anyNear(LatLng p, List<LatLng> occupied) {
      for (final q in occupied) {
        if (RouteStopDisplayUtils.nearTerminal(p, q)) return true;
      }
      return false;
    }

    final occupied = markers.map((m) => m.position).toList();
    final used = markers.map((m) => m.markerId.value).toSet();
    final out = List<Marker>.from(markers);

    void addIfOrphan(LatLng p, String title, String idSuffix) {
      if (anyNear(p, occupied)) return;
      final idVal = allocateMarkerId(title, idSuffix, used);
      used.add(idVal);
      occupied.add(p);
      out.add(
        Marker(
          markerId: MarkerId(idVal),
          position: p,
          icon: endpointPin,
          anchor: const Offset(0.5, 1.0),
          infoWindow: InfoWindow(
            title: title,
            snippet: 'Terminal',
          ),
        ),
      );
    }

    if (terminals.start != null) {
      addIfOrphan(terminals.start!, 'Route start', 'orphan_start');
    }
    if (terminals.end != null) {
      addIfOrphan(terminals.end!, 'Route end', 'orphan_end');
    }
    return out;
  }

  static Stream<List<Marker>> _watchBusStopsCollection(
    FirebaseFirestore db,
    BitmapDescriptor icon,
  ) {
    return db.collection(busStopsCollection).snapshots().map((snap) {
      final used = <String>{};
      final list = <Marker>[];
      for (final doc in snap.docs) {
        final data = asStringKeyedMap(doc.data());
        if (data == null) continue;
        final m = markerFromFirestoreDoc(doc.id, data, icon, used);
        if (m != null) list.add(m);
      }
      return list;
    });
  }

  /// Stops array inside a [routes] document. Pass [routeDocument] so `pointA` / `start_location`
  /// etc. on the **parent** doc are used for terminal pins (not only first/last array slot).
  static List<Marker> markersFromStopsArray(
    dynamic raw,
    BitmapDescriptor icon, {
    BitmapDescriptor? routeEndpointIcon,
    Map<String, dynamic>? routeDocument,
  }) {
    if (raw is! List) return const [];
    final ordered =
        RouteStopDisplayUtils.orderRawStopList(List<dynamic>.from(raw));
    final terminals = routeDocument != null
        ? RouteStopDisplayUtils.terminalsFromRouteDocument(routeDocument)
        : (start: null, end: null);
    final pointA = terminals.start;
    final pointB = terminals.end;
    final hasExplicitEndpoints = pointA != null || pointB != null;

    var anyDeclaredStart = false;
    var anyDeclaredEnd = false;
    for (final item in ordered) {
      final m = asStringKeyedMap(item);
      if (m != null) {
        if (RouteStopDisplayUtils.stopMapDeclaredStart(m)) {
          anyDeclaredStart = true;
        }
        if (RouteStopDisplayUtils.stopMapDeclaredEnd(m)) {
          anyDeclaredEnd = true;
        }
      }
    }

    final used = <String>{};
    final out = <Marker>[];
    final n = ordered.length;
    for (var i = 0; i < n; i++) {
      final item = ordered[i];
      LatLng? pos;
      Map<String, dynamic>? itemMap;
      String name = 'Stop ${i + 1}';

      if (item is GeoPoint) {
        pos = LatLng(item.latitude, item.longitude);
      } else {
        itemMap = asStringKeyedMap(item);
        if (itemMap == null) continue;
        name = itemMap['name'] as String? ?? name;
        pos = latLngFromStopMap(itemMap);
      }
      if (pos == null) continue;

      final declaredStart =
          itemMap != null && RouteStopDisplayUtils.stopMapDeclaredStart(itemMap);
      final declaredEnd =
          itemMap != null && RouteStopDisplayUtils.stopMapDeclaredEnd(itemMap);

      final matchesA = pointA != null &&
          routeEndpointIcon != null &&
          RouteStopDisplayUtils.nearTerminal(pointA, pos);
      final matchesB = pointB != null &&
          routeEndpointIcon != null &&
          RouteStopDisplayUtils.nearTerminal(pointB, pos);
      final useEndpoint = routeEndpointIcon != null &&
          (n == 1 ||
              matchesA ||
              matchesB ||
              declaredStart ||
              declaredEnd ||
              (!hasExplicitEndpoints &&
                  !anyDeclaredStart &&
                  !anyDeclaredEnd &&
                  (i == 0 || i == n - 1)));

      final markerIcon = useEndpoint ? routeEndpointIcon : icon;
      final idVal = allocateMarkerId(name, 'r$i', used);
      used.add(idVal);

      final baseSnippet = itemMap != null
          ? buildSnippet(
              route: itemMap['route'] as String?,
              status: itemMap['status'] as String?,
            )
          : '';

      String endpointSnippet;
      if (n == 1) {
        endpointSnippet = 'Bus stop';
      } else if (matchesA) {
        endpointSnippet = 'Route start (terminal)';
      } else if (matchesB) {
        endpointSnippet = 'Route end (terminal)';
      } else if (declaredStart) {
        endpointSnippet = 'Route start';
      } else if (declaredEnd) {
        endpointSnippet = 'Route end';
      } else if (!hasExplicitEndpoints &&
          !anyDeclaredStart &&
          !anyDeclaredEnd &&
          i == 0) {
        endpointSnippet = 'Route start';
      } else if (!hasExplicitEndpoints &&
          !anyDeclaredStart &&
          !anyDeclaredEnd &&
          i == n - 1) {
        endpointSnippet = 'Route end';
      } else {
        endpointSnippet = '';
      }
      final snippet = endpointSnippet.isEmpty
          ? baseSnippet
          : (baseSnippet.isEmpty
              ? endpointSnippet
              : '$endpointSnippet · $baseSnippet');

      String startEndSuffix = '';
      if (useEndpoint && n > 1) {
        if (matchesA) {
          startEndSuffix = 'Start';
        } else if (matchesB) {
          startEndSuffix = 'End';
        } else if (declaredStart) {
          startEndSuffix = 'Start';
        } else if (declaredEnd) {
          startEndSuffix = 'End';
        } else if (!hasExplicitEndpoints &&
            !anyDeclaredStart &&
            !anyDeclaredEnd &&
            i == 0) {
          startEndSuffix = 'Start';
        } else if (!hasExplicitEndpoints &&
            !anyDeclaredStart &&
            !anyDeclaredEnd &&
            i == n - 1) {
          startEndSuffix = 'End';
        }
      }
      final title =
          startEndSuffix.isEmpty ? name : '$name · $startEndSuffix';

      if (useEndpoint) {
        out.add(
          Marker(
            markerId: MarkerId(idVal),
            position: pos,
            icon: markerIcon,
            anchor: const Offset(0.5, 1.0),
            infoWindow: InfoWindow(title: title, snippet: snippet),
          ),
        );
      } else {
        out.add(
          Marker(
            markerId: MarkerId(idVal),
            position: pos,
            icon: markerIcon,
            infoWindow: InfoWindow(
              title: name,
              snippet: baseSnippet,
            ),
          ),
        );
      }
    }
    return out;
  }

  /// [route_code] document: [busStops] and optionally endpoints.
  static List<Marker> markersFromRouteCodeDocument(
    Map<String, dynamic> data,
    BitmapDescriptor icon, {
    BitmapDescriptor? routeEndpointIcon,
  }) {
    final used = <String>{};
    final out = <Marker>[];
    final terminals = RouteStopDisplayUtils.terminalsFromRouteDocument(data);
    final pointA = terminals.start;
    final pointB = terminals.end;
    final raw = data['busStops'] ?? data['bus_stop'];
    final rawList = raw is List ? List<dynamic>.from(raw) : <dynamic>[];
    final stopsList = RouteStopDisplayUtils.orderRawStopList(rawList);
    final ns = stopsList.length;
    final hasExplicitEndpoints = pointA != null || pointB != null;

    var anyDeclaredStart = false;
    var anyDeclaredEnd = false;
    for (final s in stopsList) {
      final m = asStringKeyedMap(s);
      if (m != null) {
        if (RouteStopDisplayUtils.stopMapDeclaredStart(m)) {
          anyDeclaredStart = true;
        }
        if (RouteStopDisplayUtils.stopMapDeclaredEnd(m)) {
          anyDeclaredEnd = true;
        }
      }
    }

    for (var i = 0; i < ns; i++) {
      final s = stopsList[i];
      LatLng? pos;
      String defaultTitle = 'Stop ${i + 1}';
      Map<String, dynamic>? sm;

      if (s is GeoPoint) {
        pos = LatLng(s.latitude, s.longitude);
      } else {
        sm = asStringKeyedMap(s);
        if (sm == null) continue;
        defaultTitle = sm['name'] as String? ?? defaultTitle;
        pos = latLngFromStopMap(sm);
      }
      if (pos == null) continue;

      final declaredStart =
          sm != null && RouteStopDisplayUtils.stopMapDeclaredStart(sm);
      final declaredEnd =
          sm != null && RouteStopDisplayUtils.stopMapDeclaredEnd(sm);

      final matchesA = pointA != null &&
          routeEndpointIcon != null &&
          RouteStopDisplayUtils.nearTerminal(pointA, pos);
      final matchesB = pointB != null &&
          routeEndpointIcon != null &&
          RouteStopDisplayUtils.nearTerminal(pointB, pos);
      final useEndpoint = routeEndpointIcon != null &&
          (ns == 1 ||
              matchesA ||
              matchesB ||
              declaredStart ||
              declaredEnd ||
              (!hasExplicitEndpoints &&
                  !anyDeclaredStart &&
                  !anyDeclaredEnd &&
                  (i == 0 || i == ns - 1)));

      final markerIcon = useEndpoint ? routeEndpointIcon : icon;
      final idVal =
          allocateMarkerId(sm != null ? (sm['name'] as String? ?? defaultTitle) : defaultTitle, 'bs$i', used);
      used.add(idVal);

      final baseSnippet = sm != null
          ? buildSnippet(
              route: sm['route'] as String?,
              status: sm['status'] as String?,
            )
          : '';
      String endpointSnippet;
      if (ns == 1) {
        endpointSnippet = 'Bus stop';
      } else if (matchesA) {
        endpointSnippet = 'Route start (terminal)';
      } else if (matchesB) {
        endpointSnippet = 'Route end (terminal)';
      } else if (declaredStart) {
        endpointSnippet = 'Route start';
      } else if (declaredEnd) {
        endpointSnippet = 'Route end';
      } else if (!hasExplicitEndpoints &&
          !anyDeclaredStart &&
          !anyDeclaredEnd &&
          i == 0) {
        endpointSnippet = 'Route start';
      } else if (!hasExplicitEndpoints &&
          !anyDeclaredStart &&
          !anyDeclaredEnd &&
          i == ns - 1) {
        endpointSnippet = 'Route end';
      } else {
        endpointSnippet = '';
      }
      final snippet = endpointSnippet.isEmpty
          ? baseSnippet
          : (baseSnippet.isEmpty ? endpointSnippet : '$endpointSnippet · $baseSnippet');

      final titleLabel = sm != null ? (sm['name'] as String? ?? defaultTitle) : defaultTitle;
      String startEndSuffix = '';
      if (useEndpoint && ns > 1) {
        if (matchesA) {
          startEndSuffix = 'Start';
        } else if (matchesB) {
          startEndSuffix = 'End';
        } else if (declaredStart) {
          startEndSuffix = 'Start';
        } else if (declaredEnd) {
          startEndSuffix = 'End';
        } else if (!hasExplicitEndpoints &&
            !anyDeclaredStart &&
            !anyDeclaredEnd &&
            i == 0) {
          startEndSuffix = 'Start';
        } else if (!hasExplicitEndpoints &&
            !anyDeclaredStart &&
            !anyDeclaredEnd &&
            i == ns - 1) {
          startEndSuffix = 'End';
        }
      }
      final title =
          startEndSuffix.isEmpty ? titleLabel : '$titleLabel · $startEndSuffix';

      if (useEndpoint) {
        out.add(
          Marker(
            markerId: MarkerId(idVal),
            position: pos,
            icon: markerIcon,
            anchor: const Offset(0.5, 1.0),
            infoWindow: InfoWindow(title: title, snippet: snippet),
          ),
        );
      } else {
        out.add(
          Marker(
            markerId: MarkerId(idVal),
            position: pos,
            icon: markerIcon,
            infoWindow: InfoWindow(
              title: titleLabel,
              snippet: baseSnippet,
            ),
          ),
        );
      }
    }
    if (out.isNotEmpty) return out;

    final pin = routeEndpointIcon ?? icon;
    final fb = RouteStopDisplayUtils.terminalsFromRouteDocument(data);
    final a = fb.start;
    final b = fb.end;
    if (a != null) {
      final idA = allocateMarkerId('Point A', 'pa', used);
      used.add(idA);
      out.add(
        Marker(
          markerId: MarkerId(idA),
          position: a,
          icon: pin,
          anchor: const Offset(0.5, 1.0),
          infoWindow: const InfoWindow(title: 'Point A', snippet: 'Route start'),
        ),
      );
    }
    if (b != null) {
      final idB = allocateMarkerId('Point B', 'pb', used);
      used.add(idB);
      out.add(
        Marker(
          markerId: MarkerId(idB),
          position: b,
          icon: pin,
          anchor: const Offset(0.5, 1.0),
          infoWindow: const InfoWindow(title: 'Point B', snippet: 'Route end'),
        ),
      );
    }
    return out;
  }

  static Marker? markerFromFirestoreDoc(
    String docId,
    Map<String, dynamic> data,
    BitmapDescriptor icon,
    Set<String> used,
  ) {
    final name = data['name'] as String? ?? 'Stop';
    final pos = latLngFromStopMap(data);
    if (pos == null) return null;
    final idVal = allocateMarkerId(name, docId, used);
    used.add(idVal);
    final status = data['status'] as String? ?? '';
    final route = data['route'] as String? ?? '';
    return Marker(
      markerId: MarkerId(idVal),
      position: pos,
      icon: icon,
      infoWindow: InfoWindow(
        title: name,
        snippet: buildSnippet(route: route.isEmpty ? null : route, status: status.isEmpty ? null : status),
      ),
    );
  }

  static String allocateMarkerId(String name, String uniqueSuffix, Set<String> used) {
    var base = name.replaceAll(RegExp(r'[^a-zA-Z0-9_]'), '_');
    if (base.isEmpty) base = 'Stop';
    if (base.length > 40) base = base.substring(0, 40);
    var id = '${base}_$uniqueSuffix';
    if (!used.contains(id)) return id;
    var n = 1;
    while (used.contains('${id}_$n')) {
      n++;
    }
    return '${id}_$n';
  }

  static String buildSnippet({String? route, String? status}) {
    final parts = <String>[];
    if (route != null && route.isNotEmpty) parts.add(route);
    if (status != null && status.isNotEmpty) parts.add(status);
    return parts.join(' · ');
  }

  static LatLng? latLngFromStopMap(Map<String, dynamic> m) {
    for (final key in ['location', 'position', 'geo', 'coordinates']) {
      final v = m[key];
      if (v is GeoPoint) return LatLng(v.latitude, v.longitude);
    }
    final lat = toDouble(m['lat']) ?? toDouble(m['latitude']);
    final lng = toDouble(m['lng']) ?? toDouble(m['longitude']);
    if (lat != null && lng != null) return LatLng(lat, lng);
    return null;
  }

  static double? toDouble(dynamic v) {
    if (v == null) return null;
    if (v is double) return v;
    if (v is int) return v.toDouble();
    if (v is num) return v.toDouble();
    return double.tryParse(v.toString());
  }
}
