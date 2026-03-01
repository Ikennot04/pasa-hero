export type NotificationType = "delay" | "full" | "skipped_stop" | "info";
export type NotificationPriority = "high" | "medium" | "low";
export type NotificationScope = "bus" | "route" | "terminal" | "system";

export type NotificationProps = {
  id: string;
  sender_id: string;
  bus_id: string | null;
  route_id: string | null;
  terminal_id: string | null;
  title: string;
  message: string;
  notification_type: NotificationType;
  priority: NotificationPriority;
  scope: NotificationScope;
  /** Display names (e.g. from populated ref or static data) */
  sender_name?: string;
  bus_number?: string;
  route_name?: string;
  terminal_name?: string;
  createdAt?: string;
  updatedAt?: string;
};
