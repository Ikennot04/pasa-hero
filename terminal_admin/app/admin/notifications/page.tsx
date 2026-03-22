"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import CreateNotificationModal from "./components/CreateNotificationModal";
import { buildInitialNotifications } from "./terminalBroadcastMock";
import {
  busRefLabel,
  MOCK_TERMINAL_SENDER_ID,
  notificationVisibleAtTerminal,
  routeRefLabel,
  scopeSummary,
  senderRefLabel,
  terminalRefLabel,
  type NotificationFields,
  type NotificationPriority,
  type NotificationScope,
} from "./terminalBroadcastCatalog";
import { DEFAULT_TERMINAL_NAME } from "./terminalNotificationsMock";

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const TYPE_LABEL: Record<NotificationFields["notification_type"], string> = {
  delay: "Delay",
  full: "Full",
  skipped_stop: "Skipped stop",
  info: "Info",
};

type PriorityFilter = "all" | NotificationPriority;
type ScopeFilter = "all" | NotificationScope;

function priorityBadge(p: NotificationPriority) {
  if (p === "high") return <span className="badge badge-error">High</span>;
  if (p === "medium") return <span className="badge badge-warning">Medium</span>;
  return <span className="badge badge-ghost badge-sm">Low</span>;
}

function scopeBadge(scope: NotificationScope) {
  return <span className="badge badge-outline badge-sm capitalize">{scope}</span>;
}

export default function NotificationsPage() {
  const [mounted, setMounted] = useState(false);
  const [items, setItems] = useState<NotificationFields[]>([]);
  const [toast, setToast] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("all");
  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>("all");

  useEffect(() => {
    const t = setTimeout(() => {
      setItems(buildInitialNotifications());
      setMounted(true);
    }, 0);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(id);
  }, [toast]);

  const scoped = useMemo(
    () => items.filter(notificationVisibleAtTerminal),
    [items],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return scoped.filter((n) => {
      if (priorityFilter !== "all" && n.priority !== priorityFilter) return false;
      if (scopeFilter !== "all" && n.scope !== scopeFilter) return false;
      if (!q) return true;
      return (
        n.title.toLowerCase().includes(q) ||
        n.message.toLowerCase().includes(q) ||
        senderRefLabel(n.sender_id).toLowerCase().includes(q) ||
        terminalRefLabel(n.terminal_id).toLowerCase().includes(q) ||
        routeRefLabel(n.route_id).toLowerCase().includes(q) ||
        busRefLabel(n.bus_id).toLowerCase().includes(q) ||
        scopeSummary(n).toLowerCase().includes(q)
      );
    });
  }, [scoped, search, priorityFilter, scopeFilter]);

  const sorted = useMemo(
    () =>
      [...filtered].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [filtered],
  );

  const stats = useMemo(() => {
    const fromTerminal = scoped.filter((n) => n.sender_id === MOCK_TERMINAL_SENDER_ID);
    const high = scoped.filter((n) => n.priority === "high").length;
    return {
      total: scoped.length,
      fromTerminal: fromTerminal.length,
      high,
    };
  }, [scoped]);

  const onCreated = (n: NotificationFields) => {
    setItems((prev) => [n, ...prev]);
    setToast("Notification added (client preview — connect to your notifications API when ready).");
  };

  return (
    <div className="space-y-6 pb-8 pt-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="badge badge-outline">{DEFAULT_TERMINAL_NAME}</span>
          <Link href="/admin/dashboard" className="btn btn-ghost">
            Dashboard
          </Link>
          <Link href="/admin/management" className="btn btn-ghost">
            Arrivals &amp; departures
          </Link>
          <CreateNotificationModal onCreated={onCreated} />
        </div>
      </div>

      {toast ? (
        <div className="alert alert-info">
          <span>{toast}</span>
        </div>
      ) : null}

      {!mounted ? (
        <div className="rounded-xl border border-base-300 bg-base-100 p-10 text-center text-sm text-base-content/60">
          Loading notifications…
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-base-300 bg-base-100 p-4 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-base-content/60">
                Visible for terminal
              </p>
              <p className="mt-1 text-2xl font-semibold">{stats.total}</p>
              <p className="mt-1 text-xs text-base-content/60">
                {DEFAULT_TERMINAL_NAME} and related route/bus targets
              </p>
            </div>
            <div className="rounded-xl border border-base-300 bg-base-100 p-4 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-base-content/60">
                From terminal staff
              </p>
              <p className="mt-1 text-2xl font-semibold">{stats.fromTerminal}</p>
              <p className="mt-1 text-xs text-base-content/60">{senderRefLabel(MOCK_TERMINAL_SENDER_ID)}</p>
            </div>
            <div className="rounded-xl border border-base-300 bg-base-100 p-4 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-base-content/60">
                High priority
              </p>
              <p className="mt-1 text-2xl font-semibold text-error">{stats.high}</p>
              <p className="mt-1 text-xs text-base-content/60">In current list</p>
            </div>
          </div>

          <div className="rounded-xl border border-base-300 bg-base-100 p-4 shadow-sm">
            <div className="flex flex-col gap-3 xl:flex-row xl:flex-wrap xl:items-end">
              <label className="form-control w-full max-w-xs">
                <span className="label-text text-sm font-medium">Search</span>
                <input
                  type="search"
                  placeholder="Title, message, sender, terminal, route, bus…"
                  className="input input-bordered w-full"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </label>

              <label className="form-control w-full max-w-xs">
                <span className="label-text text-sm font-medium">Priority</span>
                <select
                  className="select select-bordered w-full"
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value as PriorityFilter)}
                >
                  <option value="all">All</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </label>

              <label className="form-control w-full max-w-xs">
                <span className="label-text text-sm font-medium">Scope</span>
                <select
                  className="select select-bordered w-full"
                  value={scopeFilter}
                  onChange={(e) => setScopeFilter(e.target.value as ScopeFilter)}
                >
                  <option value="all">All</option>
                  <option value="terminal">Terminal</option>
                  <option value="route">Route</option>
                  <option value="bus">Bus</option>
                  <option value="system">System</option>
                </select>
              </label>

              <p className="text-sm text-base-content/70 xl:pb-2">
                Showing <span className="font-medium">{sorted.length}</span> of{" "}
                <span className="font-medium">{scoped.length}</span>
              </p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-base-300 bg-base-100 shadow-sm">
            <table className="table">
              <thead>
                <tr className="border-base-300">
                  <th>Created</th>
                  <th>Updated</th>
                  <th>Scope</th>
                  <th>Sender</th>
                  <th>Terminal</th>
                  <th>Route</th>
                  <th>Bus</th>
                  <th>Title</th>
                  <th>Message</th>
                  <th>Type</th>
                  <th>Priority</th>
                </tr>
              </thead>
              <tbody>
                {sorted.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="text-center text-sm text-base-content/60 py-12">
                      Nothing matches your filters.
                    </td>
                  </tr>
                ) : (
                  sorted.map((n) => (
                    <tr key={n.id} className="border-base-200 align-top">
                      <td className="whitespace-nowrap text-sm">{formatDateTime(n.createdAt)}</td>
                      <td className="whitespace-nowrap text-sm text-base-content/80">
                        {formatDateTime(n.updatedAt)}
                      </td>
                      <td>
                        {scopeBadge(n.scope)}
                        <div className="text-xs text-base-content/60 mt-1 max-w-44">
                          {scopeSummary(n)}
                        </div>
                      </td>
                      <td className="max-w-40 text-sm">{senderRefLabel(n.sender_id)}</td>
                      <td className="max-w-36 text-sm">{terminalRefLabel(n.terminal_id)}</td>
                      <td className="max-w-40 text-sm">{routeRefLabel(n.route_id)}</td>
                      <td className="max-w-28 text-sm">{busRefLabel(n.bus_id)}</td>
                      <td className="max-w-44 text-sm font-medium">{n.title}</td>
                      <td className="max-w-56 text-sm text-base-content/80">
                        <span className="line-clamp-3">{n.message}</span>
                      </td>
                      <td>
                        <span className="badge badge-ghost ">{TYPE_LABEL[n.notification_type]}</span>
                      </td>
                      <td>{priorityBadge(n.priority)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
