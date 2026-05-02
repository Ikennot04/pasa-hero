"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import CreateNotificationModal from "./_components/CreateNotificationModal";
import NotificationTable, {
  type PriorityFilter,
} from "./_components/NotificationTable";
import { useDeleteNotifications } from "./_hooks/useDeleteNotifications";
import { useGetNotifications } from "./_hooks/useGetNotification";
import {
  normalizeNotification,
  senderRefLabel,
  terminalRefLabel,
  busRefLabel,
  routeRefLabel,
  scopeSummary,
  type NotificationApiRecord,
  type NotificationFields,
} from "./terminalBroadcastCatalog";

type TerminalNotificationsPayload = {
  notifications: NotificationApiRecord[];
  counts: {
    visible_for_terminal: number;
    from_terminal_staff: number;
    high_priority: number;
  };
};

export default function NotificationsPage() {
  const { getNotifications } = useGetNotifications();
  const { deleteNotifications } = useDeleteNotifications();
  const [items, setItems] = useState<NotificationFields[]>([]);
  const [counts, setCounts] = useState({
    visible_for_terminal: 0,
    from_terminal_staff: 0,
    high_priority: 0,
  });
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("all");

  const loadNotifications = useCallback(async () => {
    const data = await getNotifications();

    if (!data) {
      setToast("Failed to load notifications");
      setItems([]);
      setCounts({
        visible_for_terminal: 0,
        from_terminal_staff: 0,
        high_priority: 0,
      });
      setLoading(false);
      return;
    }

    if (data?.success && data.data) {
      const payload = data.data as TerminalNotificationsPayload;
      const raw = payload.notifications ?? [];
      setItems(raw.map(normalizeNotification));
      setCounts(
        payload.counts ?? {
          visible_for_terminal: 0,
          from_terminal_staff: 0,
          high_priority: 0,
        },
      );
    } else {
      const message =
        typeof data?.message === "string" ? data.message : "Failed to load notifications";
      setToast(message);
      setItems([]);
      setCounts({
        visible_for_terminal: 0,
        from_terminal_staff: 0,
        high_priority: 0,
      });
    }
    setLoading(false);
  }, [getNotifications]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      void loadNotifications();
    }, 0);
    return () => window.clearTimeout(t);
  }, [loadNotifications]);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(id);
  }, [toast]);

  const terminalBadgeLabel = useMemo(() => {
    const first = items[0]?.terminal_id;
    const name = terminalRefLabel(first ?? null);
    return name !== "—" ? name : "Terminal";
  }, [items]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((n) => {
      if (priorityFilter !== "all" && n.priority !== priorityFilter) return false;
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
  }, [items, search, priorityFilter]);

  const sorted = useMemo(
    () =>
      [...filtered].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [filtered],
  );

  const onCreated = (n: NotificationFields) => {
    setItems((prev) => [n, ...prev]);
    setToast("Notification created successfully.");
    void loadNotifications();
  };

  const onBulkDelete = useCallback(
    (ids: string[]) => {
      void (async () => {
        const response = await deleteNotifications(ids);
        if (!response) {
          setToast("Failed to delete notifications");
          return;
        }
        if (response.success === false) {
          const message =
            typeof response.message === "string"
              ? response.message
              : "Failed to delete notifications";
          setToast(message);
          return;
        }
        setToast(
          `Deleted ${ids.length} notification${ids.length !== 1 ? "s" : ""}.`,
        );
        await loadNotifications();
      })();
    },
    [deleteNotifications, loadNotifications],
  );

  return (
    <div className="space-y-6 pb-8 pt-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="badge badge-outline">{terminalBadgeLabel}</span>
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

      {loading ? (
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
              <p className="mt-1 text-2xl font-semibold">{counts.visible_for_terminal}</p>
              <p className="mt-1 text-xs text-base-content/60">
                All notifications visible for this terminal and its routes
              </p>
            </div>
            <div className="rounded-xl border border-base-300 bg-base-100 p-4 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-base-content/60">
                From terminal staff
              </p>
              <p className="mt-1 text-2xl font-semibold">{counts.from_terminal_staff}</p>
              <p className="mt-1 text-xs text-base-content/60">Sent by terminal admins and operators</p>
            </div>
            <div className="rounded-xl border border-base-300 bg-base-100 p-4 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-base-content/60">
                High priority
              </p>
              <p className="mt-1 text-2xl font-semibold text-error">{counts.high_priority}</p>
              <p className="mt-1 text-xs text-base-content/60">In the visible set</p>
            </div>
          </div>

          <NotificationTable
            sorted={sorted}
            scopedLength={items.length}
            search={search}
            onSearchChange={setSearch}
            priorityFilter={priorityFilter}
            onPriorityFilterChange={setPriorityFilter}
            onBulkDelete={onBulkDelete}
          />
        </>
      )}
    </div>
  );
}
