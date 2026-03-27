"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import CreateNotificationModal from "./_components/CreateNotificationModal";
import NotificationTable, {
  type PriorityFilter,
  type ScopeFilter,
} from "./_components/NotificationTable";
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
} from "./terminalBroadcastCatalog";
import { DEFAULT_TERMINAL_NAME } from "./terminalNotificationsMock";

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

          <NotificationTable
            sorted={sorted}
            scopedLength={scoped.length}
            search={search}
            onSearchChange={setSearch}
            priorityFilter={priorityFilter}
            onPriorityFilterChange={setPriorityFilter}
            scopeFilter={scopeFilter}
            onScopeFilterChange={setScopeFilter}
          />
        </>
      )}
    </div>
  );
}
