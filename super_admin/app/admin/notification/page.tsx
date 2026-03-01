"use client";

import { useState, useMemo } from "react";
import {
  NotificationProps,
  type NotificationType,
  type NotificationPriority,
  type NotificationScope,
} from "./NotificationProps";
import NotificationTable from "./_components/NotificationTable";
import AddNotificationModal from "./_components/AddNotification";
import { SystemLogProps } from "./_components/SystemLogProps";
import SystemLogTable from "./_components/SystemLogTable";

// Static data for notifications (matches backend notification.model.js)
const NOTIFICATIONS_STATIC: NotificationProps[] = [
  {
    id: "1",
    sender_id: "admin1",
    bus_id: "b1",
    route_id: "1",
    terminal_id: "1",
    title: "Delay on PITX — SM North EDSA",
    message: "Bus 01-AB is running approximately 15 minutes behind schedule due to traffic.",
    notification_type: "delay",
    priority: "high",
    scope: "route",
    sender_name: "System Admin",
    bus_number: "01-AB",
    route_name: "PITX — SM North EDSA",
    terminal_name: "PITX",
    createdAt: "2025-03-01T07:00:00",
    updatedAt: "2025-03-01T07:00:00",
  },
  {
    id: "2",
    sender_id: "admin1",
    bus_id: "b2",
    route_id: "2",
    terminal_id: "2",
    title: "Bus at capacity",
    message: "Bus 12C has reached full capacity at SM North EDSA. Next bus in 8 min.",
    notification_type: "full",
    priority: "medium",
    scope: "bus",
    sender_name: "System Admin",
    bus_number: "12C",
    route_name: "SM North EDSA — Monumento",
    terminal_name: "SM North EDSA",
    createdAt: "2025-03-01T07:30:00",
    updatedAt: "2025-03-01T07:30:00",
  },
  {
    id: "3",
    sender_id: "admin1",
    bus_id: "b3",
    route_id: "3",
    terminal_id: "3",
    title: "Monumento stop skipped",
    message: "Bus 13B skipped Monumento stop due to road closure. Passengers advised to use next stop.",
    notification_type: "skipped_stop",
    priority: "high",
    scope: "terminal",
    sender_name: "System Admin",
    bus_number: "13B",
    route_name: "Monumento — Fairview",
    terminal_name: "Monumento",
    createdAt: "2025-03-01T08:15:00",
    updatedAt: "2025-03-01T08:15:00",
  },
  {
    id: "4",
    sender_id: "admin1",
    bus_id: null,
    route_id: null,
    terminal_id: null,
    title: "Scheduled maintenance tonight",
    message: "System maintenance is scheduled from 00:00 to 02:00. Notifications may be delayed.",
    notification_type: "info",
    priority: "low",
    scope: "system",
    sender_name: "System Admin",
    createdAt: "2025-02-28T18:00:00",
    updatedAt: "2025-02-28T18:00:00",
  },
  {
    id: "5",
    sender_id: "admin1",
    bus_id: "b1",
    route_id: "1",
    terminal_id: "1",
    title: "PITX arrival confirmed",
    message: "Bus 01-AB has arrived at PITX. Boarding now.",
    notification_type: "info",
    priority: "medium",
    scope: "bus",
    sender_name: "System Admin",
    bus_number: "01-AB",
    route_name: "PITX — SM North EDSA",
    terminal_name: "PITX",
    createdAt: "2025-03-01T06:45:00",
    updatedAt: "2025-03-01T06:45:00",
  },
  {
    id: "6",
    sender_id: "admin1",
    bus_id: "b4",
    route_id: "5",
    terminal_id: "4",
    title: "Fairview terminal delay",
    message: "Heavy traffic on Commonwealth Ave. Expect 20 min delay for Fairview — SM North EDSA.",
    notification_type: "delay",
    priority: "high",
    scope: "route",
    sender_name: "System Admin",
    bus_number: "O1L",
    route_name: "Fairview — SM North EDSA",
    terminal_name: "Fairview",
    createdAt: "2025-03-01T08:00:00",
    updatedAt: "2025-03-01T08:00:00",
  },
];

const NOTIFICATION_TYPE_OPTIONS: NotificationType[] = [
  "delay",
  "full",
  "skipped_stop",
  "info",
];
const PRIORITY_OPTIONS: NotificationPriority[] = ["high", "medium", "low"];
const SCOPE_OPTIONS: NotificationScope[] = ["bus", "route", "terminal", "system"];

// Static data for system logs (view logs from all users with action type and description)
const SYSTEM_LOGS_STATIC: SystemLogProps[] = [
  { id: "1", user_id: "u1", action: "login", description: "User signed in successfully from admin dashboard.", user_name: "Admin User", user_email: "admin@pasahero.com", createdAt: "2025-03-01T08:45:00", updatedAt: "2025-03-01T08:45:00" },
  { id: "2", user_id: "u2", action: "create_route", description: "Created new route PITX — SM North EDSA (PITX-NEDSA).", user_name: "Route Manager", user_email: "routes@pasahero.com", createdAt: "2025-03-01T08:30:00", updatedAt: "2025-03-01T08:30:00" },
  { id: "3", user_id: "u1", action: "update_terminal", description: "Updated terminal PITX status to active.", user_name: "Admin User", user_email: "admin@pasahero.com", createdAt: "2025-03-01T08:15:00", updatedAt: "2025-03-01T08:15:00" },
  { id: "4", user_id: "u3", action: "create_notification", description: "Sent manual notification: Delay on PITX — SM North EDSA.", user_name: "Operator", user_email: "ops@pasahero.com", createdAt: "2025-03-01T08:00:00", updatedAt: "2025-03-01T08:00:00" },
  { id: "5", user_id: "u2", action: "delete_route", description: "Archived route PITX — Fairview (Express).", user_name: "Route Manager", user_email: "routes@pasahero.com", createdAt: "2025-03-01T07:50:00", updatedAt: "2025-03-01T07:50:00" },
  { id: "6", user_id: "u1", action: "logout", description: "User signed out from admin dashboard.", user_name: "Admin User", user_email: "admin@pasahero.com", createdAt: "2025-02-28T18:00:00", updatedAt: "2025-02-28T18:00:00" },
  { id: "7", user_id: "u4", action: "update_bus", description: "Updated bus 01-AB assignment to route PITX-NEDSA.", user_name: "Fleet Admin", user_email: "fleet@pasahero.com", createdAt: "2025-03-01T07:30:00", updatedAt: "2025-03-01T07:30:00" },
  { id: "8", user_id: "u3", action: "view_report", description: "Exported notification volume report for March 2025.", user_name: "Operator", user_email: "ops@pasahero.com", createdAt: "2025-03-01T07:00:00", updatedAt: "2025-03-01T07:00:00" },
  { id: "9", user_id: "u1", action: "create_user", description: "Created new terminal admin for Monumento.", user_name: "Admin User", user_email: "admin@pasahero.com", createdAt: "2025-02-28T16:20:00", updatedAt: "2025-02-28T16:20:00" },
  { id: "10", user_id: "u2", action: "update_route", description: "Changed estimated duration for route MON-FV to 55 minutes.", user_name: "Route Manager", user_email: "routes@pasahero.com", createdAt: "2025-03-01T06:45:00", updatedAt: "2025-03-01T06:45:00" },
];

export default function Notification() {
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<NotificationType | "all">("all");
  const [priorityFilter, setPriorityFilter] = useState<
    NotificationPriority | "all"
  >("all");
  const [scopeFilter, setScopeFilter] = useState<NotificationScope | "all">(
    "all"
  );
  const [logSearchQuery, setLogSearchQuery] = useState("");
  const [logActionFilter, setLogActionFilter] = useState<string>("all");

  const actionTypes = useMemo(() => {
    const set = new Set(SYSTEM_LOGS_STATIC.map((l) => l.action));
    return Array.from(set).sort();
  }, []);

  const filteredNotifications = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return NOTIFICATIONS_STATIC.filter((n) => {
      const matchSearch =
        !q ||
        n.title.toLowerCase().includes(q) ||
        n.message.toLowerCase().includes(q) ||
        (n.bus_number && n.bus_number.toLowerCase().includes(q)) ||
        (n.route_name && n.route_name.toLowerCase().includes(q)) ||
        (n.terminal_name && n.terminal_name.toLowerCase().includes(q));
      const matchType =
        typeFilter === "all" || n.notification_type === typeFilter;
      const matchPriority =
        priorityFilter === "all" || n.priority === priorityFilter;
      const matchScope = scopeFilter === "all" || n.scope === scopeFilter;
      return matchSearch && matchType && matchPriority && matchScope;
    });
  }, [searchQuery, typeFilter, priorityFilter, scopeFilter]);

  const filteredLogs = useMemo(() => {
    const q = logSearchQuery.trim().toLowerCase();
    return SYSTEM_LOGS_STATIC.filter((log) => {
      const matchSearch =
        !q ||
        log.action.toLowerCase().includes(q) ||
        (log.description && log.description.toLowerCase().includes(q)) ||
        (log.user_name && log.user_name.toLowerCase().includes(q)) ||
        (log.user_email && log.user_email.toLowerCase().includes(q));
      const matchAction =
        logActionFilter === "all" || log.action === logActionFilter;
      return matchSearch && matchAction;
    });
  }, [logSearchQuery, logActionFilter]);

  return (
    <div className="space-y-4 pt-6">
      <div className="text-xl font-bold">Notification Management Table</div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="form-control w-64">
            <input
              type="text"
              placeholder="Search by title, message, bus, route..."
              className="input input-bordered w-full"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="form-control w-40">
            <select
              className="select select-bordered w-full"
              value={typeFilter}
              onChange={(e) =>
                setTypeFilter(e.target.value as NotificationType | "all")
              }
            >
              <option value="all">All types</option>
              {NOTIFICATION_TYPE_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {t.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </div>
          <div className="form-control w-36">
            <select
              className="select select-bordered w-full"
              value={priorityFilter}
              onChange={(e) =>
                setPriorityFilter(e.target.value as NotificationPriority | "all")
              }
            >
              <option value="all">All priority</option>
              {PRIORITY_OPTIONS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <div className="form-control w-36">
            <select
              className="select select-bordered w-full"
              value={scopeFilter}
              onChange={(e) =>
                setScopeFilter(e.target.value as NotificationScope | "all")
              }
            >
              <option value="all">All scope</option>
              {SCOPE_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <span className="text-sm text-base-content/70">
            Showing {filteredNotifications.length} of{" "}
            {NOTIFICATIONS_STATIC.length} notifications
          </span>
        </div>
        <AddNotificationModal />
      </div>
      <NotificationTable notifications={filteredNotifications} />

      <div className="text-xl font-bold mt-10">System Logs</div>
      <p className="text-sm text-base-content/70">
        View logs from all users with action type and description.
      </p>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="form-control w-72">
            <input
              type="text"
              placeholder="Search by user, action, or description..."
              className="input input-bordered w-full"
              value={logSearchQuery}
              onChange={(e) => setLogSearchQuery(e.target.value)}
            />
          </div>
          <div className="form-control w-44">
            <select
              className="select select-bordered w-full"
              value={logActionFilter}
              onChange={(e) => setLogActionFilter(e.target.value)}
            >
              <option value="all">All actions</option>
              {actionTypes.map((action) => (
                <option key={action} value={action}>
                  {action.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </div>
          <span className="text-sm text-base-content/70">
            Showing {filteredLogs.length} of {SYSTEM_LOGS_STATIC.length} logs
          </span>
        </div>
      </div>
      <SystemLogTable logs={filteredLogs} />
    </div>
  );
}
