/// One selectable route / jeepney code (matches operator profile options).
class OperatorRouteOption {
  const OperatorRouteOption({
    required this.code,
    required this.displayName,
    this.description,
    this.isFreeRideRoute = false,
    /// MongoDB `Route._id` when this row came from `/api/routes` (needed for follow/subscribe).
    this.mongoRouteId,
  });

  final String code;
  final String displayName;
  final String? description;
  /// From Mongo/API [is_free_ride] — route is a designated free-ride line (map icon).
  final bool isFreeRideRoute;
  final String? mongoRouteId;
}
