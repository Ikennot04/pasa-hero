"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
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
import { useGetNotifications } from "./_hooks/useGetNotifications";
import { useGetSystemLogs } from "./_hooks/useGetSystemLogs";
import { useDeleteNotifications } from "./_hooks/useDeleteNotifications";

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
const NOTIFICATIONS_PER_PAGE = 10;
const SYSTEM_LOGS_PER_PAGE = 10;

export default function Notification() {
  const [notifications, setNotifications] =
    useState<NotificationProps[]>(NOTIFICATIONS_STATIC);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<NotificationType | "all">("all");
  const [priorityFilter, setPriorityFilter] = useState<
    NotificationPriority | "all"
  >("all");
  const [scopeFilter, setScopeFilter] = useState<NotificationScope | "all">(
    "all"
  );
  const [requestedPage, setRequestedPage] = useState(1);
  const [requestedLogPage, setRequestedLogPage] = useState(1);
  const [logSearchQuery, setLogSearchQuery] = useState("");
  const [logActionFilter, setLogActionFilter] = useState<string>("all");
  const { getNotifications, error: notificationsError, isLoading } =
    useGetNotifications();
  const { deleteNotifications } = useDeleteNotifications();
  const {
    getSystemLogs,
    bulkDeleteSystemLogs,
    error: systemLogsError,
    isLoading: systemLogsLoading,
  } = useGetSystemLogs();

  const [logs, setLogs] = useState<SystemLogProps[]>([]);

  const refetchNotifications = useCallback(async () => {
    const data = await getNotifications();
    setNotifications(data);
  }, [getNotifications]);

  useEffect(() => {
    let isMounted = true;

    const fetchNotifications = async () => {
      const data = await getNotifications();
      if (!isMounted) return;
      setNotifications(data);
    };

    fetchNotifications();

    return () => {
      isMounted = false;
    };
  }, [getNotifications]);

  useEffect(() => {
    let isMounted = true;

    const fetchLogs = async () => {
      const data = await getSystemLogs();
      if (!isMounted) return;
      setLogs(data);
    };

    fetchLogs();

    return () => {
      isMounted = false;
    };
  }, [getSystemLogs]);

  const onBulkDelete = useCallback(
    (ids: string[]) => {
      void (async () => {
        const response = await deleteNotifications(ids);
        if (!response) return;
        const data = await getNotifications();
        setNotifications(data);
      })();
    },
    [deleteNotifications, getNotifications],
  );

  const onBulkDeleteLogs = useCallback(
    (ids: string[]) => {
      void (async () => {
        const ok = await bulkDeleteSystemLogs(ids);
        if (!ok) return;
        const data = await getSystemLogs();
        setLogs(data);
      })();
    },
    [bulkDeleteSystemLogs, getSystemLogs],
  );

  const actionTypes = useMemo(() => {
    const set = new Set(logs.map((l) => l.action));
    return Array.from(set).sort();
  }, [logs]);

  const filteredNotifications = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return notifications.filter((n) => {
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
  }, [notifications, searchQuery, typeFilter, priorityFilter, scopeFilter]);

  const filteredLogs = useMemo(() => {
    const q = logSearchQuery.trim().toLowerCase();
    return logs.filter((log) => {
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
  }, [logs, logSearchQuery, logActionFilter]);

  const totalLogPages = Math.max(
    1,
    Math.ceil(filteredLogs.length / SYSTEM_LOGS_PER_PAGE),
  );
  const currentLogPage = Math.min(requestedLogPage, totalLogPages);

  const paginatedLogs = useMemo(() => {
    const start = (currentLogPage - 1) * SYSTEM_LOGS_PER_PAGE;
    const end = start + SYSTEM_LOGS_PER_PAGE;
    return filteredLogs.slice(start, end);
  }, [filteredLogs, currentLogPage]);

  const logPaginationStart =
    filteredLogs.length === 0
      ? 0
      : (currentLogPage - 1) * SYSTEM_LOGS_PER_PAGE + 1;
  const logPaginationEnd = Math.min(
    currentLogPage * SYSTEM_LOGS_PER_PAGE,
    filteredLogs.length,
  );

  const totalNotificationPages = Math.max(
    1,
    Math.ceil(filteredNotifications.length / NOTIFICATIONS_PER_PAGE),
  );
  const currentPage = Math.min(requestedPage, totalNotificationPages);

  const paginatedNotifications = useMemo(() => {
    const start = (currentPage - 1) * NOTIFICATIONS_PER_PAGE;
    const end = start + NOTIFICATIONS_PER_PAGE;
    return filteredNotifications.slice(start, end);
  }, [filteredNotifications, currentPage]);

  const paginationStart =
    filteredNotifications.length === 0
      ? 0
      : (currentPage - 1) * NOTIFICATIONS_PER_PAGE + 1;
  const paginationEnd = Math.min(
    currentPage * NOTIFICATIONS_PER_PAGE,
    filteredNotifications.length,
  );

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
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setRequestedPage(1);
              }}
            />
          </div>
          <div className="form-control w-40">
            <select
              className="select select-bordered w-full"
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value as NotificationType | "all");
                setRequestedPage(1);
              }}
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
              onChange={(e) => {
                setPriorityFilter(e.target.value as NotificationPriority | "all");
                setRequestedPage(1);
              }}
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
              onChange={(e) => {
                setScopeFilter(e.target.value as NotificationScope | "all");
                setRequestedPage(1);
              }}
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
            Showing {paginationStart}-{paginationEnd} of{" "}
            {filteredNotifications.length} filtered ({notifications.length} total)
          </span>
        </div>
        <AddNotificationModal onCreated={refetchNotifications} />
      </div>
      <NotificationTable
        notifications={paginatedNotifications}
        onBulkDelete={onBulkDelete}
      />
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <span className="text-sm text-base-content/70">
          Page {currentPage} of {totalNotificationPages}
        </span>
        <div className="join">
          <button
            type="button"
            className="btn join-item btn-sm"
            onClick={() => setRequestedPage((prev) => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
          >
            Previous
          </button>
          <button
            type="button"
            className="btn join-item btn-sm"
            onClick={() =>
              setRequestedPage((prev) =>
                Math.min(totalNotificationPages, prev + 1),
              )
            }
            disabled={currentPage === totalNotificationPages}
          >
            Next
          </button>
        </div>
      </div>
      {isLoading && (
        <div className="text-sm text-base-content/70">
          Loading notifications...
        </div>
      )}
      {!isLoading && notificationsError && (
        <div className="text-sm text-error">{notificationsError}</div>
      )}

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
              onChange={(e) => {
                setLogSearchQuery(e.target.value);
                setRequestedLogPage(1);
              }}
            />
          </div>
          <div className="form-control w-44">
            <select
              className="select select-bordered w-full"
              value={logActionFilter}
              onChange={(e) => {
                setLogActionFilter(e.target.value);
                setRequestedLogPage(1);
              }}
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
            Showing {logPaginationStart}-{logPaginationEnd} of{" "}
            {filteredLogs.length} filtered ({logs.length} total)
          </span>
        </div>
      </div>
      {systemLogsLoading && (
        <div className="text-sm text-base-content/70">Loading system logs...</div>
      )}
      {!systemLogsLoading && systemLogsError && (
        <div className="text-sm text-error">{systemLogsError}</div>
      )}
      <SystemLogTable logs={paginatedLogs} onBulkDelete={onBulkDeleteLogs} />
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <span className="text-sm text-base-content/70">
          Page {currentLogPage} of {totalLogPages}
        </span>
        <div className="join">
          <button
            type="button"
            className="btn join-item btn-sm"
            onClick={() =>
              setRequestedLogPage((prev) => Math.max(1, prev - 1))
            }
            disabled={currentLogPage === 1}
          >
            Previous
          </button>
          <button
            type="button"
            className="btn join-item btn-sm"
            onClick={() =>
              setRequestedLogPage((prev) =>
                Math.min(totalLogPages, prev + 1),
              )
            }
            disabled={currentLogPage === totalLogPages}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
