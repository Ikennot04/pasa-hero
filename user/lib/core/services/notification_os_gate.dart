import 'package:flutter/widgets.dart';

/// Used to avoid duplicate tray alerts while the user is already on the Notifications tab.
class NotificationOsGate {
  NotificationOsGate._();

  static AppLifecycleState lifecycle = AppLifecycleState.resumed;

  /// Bottom nav index: 2 = Notifications (see [MainNavigationScreen]).
  static int bottomNavIndex = 0;

  static bool get suppressInboxTrayWhileViewingInbox =>
      lifecycle == AppLifecycleState.resumed && bottomNavIndex == 2;
}
