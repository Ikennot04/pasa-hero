/// One selectable route / jeepney code (matches operator profile options).
class OperatorRouteOption {
  const OperatorRouteOption({
    required this.code,
    required this.displayName,
    this.description,
  });

  final String code;
  final String displayName;
  final String? description;
}
