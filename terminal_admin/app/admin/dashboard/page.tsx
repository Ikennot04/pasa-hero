"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  DoughnutController,
  ArcElement,
  Legend,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
} from "chart.js";
import Link from "next/link";
import Notifications from "./components/Notifications";
import PendingConfirmation from "./components/PendingConfirmation";
import TerminalSnapshot from "./components/charts/TerminalSnapshot";
import ConfirmationBacklog from "./components/charts/ConfirmationBacklog";
import TerminalEventFlow from "./components/charts/TerminalEventFlow";
import BusPresent from "./components/BusPresent";
import BusDeparted from "./components/BusDeparted";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  DoughnutController,
  Title,
  Tooltip,
  Legend,
);

const DEFAULT_TERMINAL_ID = "terminal-pitx";
const DEFAULT_TERMINAL_NAME = "PITX";

type BusAssignmentLike = {
  id: string;
  bus_id: string;
  bus_number: string;
  route_name: string;

  // "TerminalLog"-like timestamps
  arrival_reported_at: string | null;
  arrival_confirmed_at: string | null;
  departure_reported_at: string | null;
  departure_confirmed_at: string | null;

  // ETA (scheduled to arrive)
  scheduled_arrival_at: string;
};

type TerminalNotification = {
  id: string;
  terminal_id: string;
  bus_id: string;
  bus_number: string;
  event_type: "arrival_reported" | "arrival_confirmed" | "departure_reported" | "departure_confirmed";
  status: "pending_confirmation" | "confirmed" | "rejected";
  event_time: string;
  confirmation_time: string | null;
  auto_detected: boolean;
  remarks?: string | null;
};

function sameLocalDay(a: Date, b: Date) {
  return a.toDateString() === b.toDateString();
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function buildInitialMockData() {
  const now = new Date();
  const isoOffset = (minutes: number) => new Date(now.getTime() + minutes * 60_000).toISOString();

  // NOTE: These timestamps are relative to the current client time so the dashboard
  // stays meaningful when you reload it.
  const scheduled: BusAssignmentLike[] = [
    // Departed buses (arrival confirmed + departure confirmed)
    {
      id: "ba-1",
      bus_id: "bus-1",
      bus_number: "01-AB",
      route_name: "PITX — NEDSA",
      scheduled_arrival_at: isoOffset(-140),
      arrival_reported_at: isoOffset(-145),
      arrival_confirmed_at: isoOffset(-138),
      departure_reported_at: isoOffset(-110),
      departure_confirmed_at: isoOffset(-105),
    },
    {
      id: "ba-2",
      bus_id: "bus-2",
      bus_number: "12C",
      route_name: "PITX — SM North EDSA",
      scheduled_arrival_at: isoOffset(-75),
      arrival_reported_at: isoOffset(-76),
      arrival_confirmed_at: null, // arrival pending confirmation
      departure_reported_at: null,
      departure_confirmed_at: null,
    },
    // Present: arrival confirmed, departure pending confirmation
    {
      id: "ba-3",
      bus_id: "bus-3",
      bus_number: "13B",
      route_name: "PITX — SM North EDSA",
      scheduled_arrival_at: isoOffset(-45),
      arrival_reported_at: isoOffset(-46),
      arrival_confirmed_at: isoOffset(-41),
      departure_reported_at: isoOffset(-18),
      departure_confirmed_at: null,
    },
    // Present: fully confirmed so far (no pending confirmations)
    {
      id: "ba-4",
      bus_id: "bus-4",
      bus_number: "02-D",
      route_name: "PITX — Fairview",
      scheduled_arrival_at: isoOffset(-22),
      arrival_reported_at: isoOffset(-23),
      arrival_confirmed_at: isoOffset(-18),
      departure_reported_at: null,
      departure_confirmed_at: null,
    },
    // Approaching buses (future ETA)
    {
      id: "ba-5",
      bus_id: "bus-5",
      bus_number: "07E",
      route_name: "PITX — NEDSA",
      scheduled_arrival_at: isoOffset(12),
      arrival_reported_at: null,
      arrival_confirmed_at: null,
      departure_reported_at: null,
      departure_confirmed_at: null,
    },
    {
      id: "ba-6",
      bus_id: "bus-6",
      bus_number: "09F",
      route_name: "PITX — Monumento",
      scheduled_arrival_at: isoOffset(28),
      arrival_reported_at: null,
      arrival_confirmed_at: null,
      departure_reported_at: null,
      departure_confirmed_at: null,
    },
    {
      id: "ba-7",
      bus_id: "bus-7",
      bus_number: "11A",
      route_name: "PITX — Fairview",
      scheduled_arrival_at: isoOffset(46),
      arrival_reported_at: null,
      arrival_confirmed_at: null,
      departure_reported_at: null,
      departure_confirmed_at: null,
    },
    {
      id: "ba-8",
      bus_id: "bus-8",
      bus_number: "15G",
      route_name: "PITX — SM North EDSA",
      scheduled_arrival_at: isoOffset(67),
      arrival_reported_at: null,
      arrival_confirmed_at: null,
      departure_reported_at: null,
      departure_confirmed_at: null,
    },
  ];

  const terminalId = "terminal-pitx";
  const notifications: TerminalNotification[] = [];

  const pushLog = (n: Omit<TerminalNotification, "id">) => {
    notifications.push({
      id: `${n.bus_id}-${n.event_type}-${n.event_time}`,
      ...n,
    });
  };

  for (const b of scheduled) {
    if (b.arrival_reported_at) {
      pushLog({
        terminal_id: terminalId,
        bus_id: b.bus_id,
        bus_number: b.bus_number,
        event_type: "arrival_reported",
        status: b.arrival_confirmed_at ? "confirmed" : "pending_confirmation",
        event_time: b.arrival_reported_at,
        confirmation_time: b.arrival_confirmed_at,
        auto_detected: b.arrival_confirmed_at ? false : true,
        remarks:
          b.arrival_confirmed_at === null
            ? "Awaiting terminal admin confirmation"
            : null,
      });
    }

    if (b.arrival_confirmed_at) {
      pushLog({
        terminal_id: terminalId,
        bus_id: b.bus_id,
        bus_number: b.bus_number,
        event_type: "arrival_confirmed",
        status: "confirmed",
        event_time: b.arrival_confirmed_at,
        confirmation_time: b.arrival_confirmed_at,
        auto_detected: false,
        remarks: "Arrival confirmed",
      });
    }

    if (b.departure_reported_at) {
      pushLog({
        terminal_id: terminalId,
        bus_id: b.bus_id,
        bus_number: b.bus_number,
        event_type: "departure_reported",
        status: b.departure_confirmed_at ? "confirmed" : "pending_confirmation",
        event_time: b.departure_reported_at,
        confirmation_time: b.departure_confirmed_at,
        auto_detected: false,
        remarks: b.departure_confirmed_at ? null : "Awaiting terminal admin confirmation",
      });
    }

    if (b.departure_confirmed_at) {
      pushLog({
        terminal_id: terminalId,
        bus_id: b.bus_id,
        bus_number: b.bus_number,
        event_type: "departure_confirmed",
        status: "confirmed",
        event_time: b.departure_confirmed_at,
        confirmation_time: b.departure_confirmed_at,
        auto_detected: false,
        remarks: "Departure confirmed",
      });
    }
  }

  return {
    terminalId,
    terminalName: DEFAULT_TERMINAL_NAME,
    initialAssignments: scheduled,
    initialNotifications: notifications,
  };
}

export default function Dashboard() {
  const terminalId = DEFAULT_TERMINAL_ID;
  const terminalName = DEFAULT_TERMINAL_NAME;

  // Hydration-safe: server renders a stable placeholder; real "now" + mock data are set after mount.
  const [uiState, setUiState] = useState<{
    assignments: BusAssignmentLike[];
    notifications: TerminalNotification[];
    nowIso: string | null;
  }>({
    assignments: [],
    notifications: [],
    nowIso: null,
  });
  const [toast, setToast] = useState<string | null>(null);

  const assignments = uiState.assignments;
  const notifications = uiState.notifications;
  const nowIso = uiState.nowIso;
  const mounted = uiState.nowIso !== null;

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | undefined;
    const initTimer = setTimeout(() => {
      const data = buildInitialMockData();
      setUiState({
        assignments: data.initialAssignments,
        notifications: data.initialNotifications,
        nowIso: new Date().toISOString(),
      });

      intervalId = setInterval(
        () =>
          setUiState((prev) => ({
            ...prev,
            nowIso: new Date().toISOString(),
          })),
        1000,
      );
    }, 0);

    return () => {
      clearTimeout(initTimer);
      if (intervalId) clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const now = useMemo(() => (nowIso ? new Date(nowIso) : new Date(0)), [nowIso]);

  const scheduledToday = useMemo(
    () => assignments.filter((a) => sameLocalDay(new Date(a.scheduled_arrival_at), now)),
    [assignments, now],
  );

  const presentBuses = useMemo(() => {
    return assignments.filter((a) => {
      const arrived = a.arrival_reported_at ? new Date(a.arrival_reported_at) <= now : false;
      const notDepartedConfirmed = !a.departure_confirmed_at || new Date(a.departure_confirmed_at) > now;
      return arrived && notDepartedConfirmed;
    });
  }, [assignments, now]);

  const departedBuses = useMemo(() => {
    return assignments.filter((a) => {
      if (!a.departure_confirmed_at) return false;
      return new Date(a.departure_confirmed_at) <= now;
    });
  }, [assignments, now]);

  const pendingArrivalBuses = useMemo(() => {
    return assignments.filter((a) => {
      if (!a.arrival_reported_at) return false;
      if (a.arrival_confirmed_at) return false;
      return new Date(a.arrival_reported_at) <= now;
    });
  }, [assignments, now]);

  const pendingDepartureBuses = useMemo(() => {
    return assignments.filter((a) => {
      if (!a.departure_reported_at) return false;
      if (a.departure_confirmed_at) return false;
      return new Date(a.departure_reported_at) <= now;
    });
  }, [assignments, now]);

  const pendingTotal = pendingArrivalBuses.length + pendingDepartureBuses.length;

  const recentNotifications = useMemo(() => {
    return [...notifications]
      .sort((a, b) => new Date(b.event_time).getTime() - new Date(a.event_time).getTime())
      .filter((n) => n.terminal_id === terminalId)
      .slice(0, 8);
  }, [notifications, terminalId]);

  const confirmArrival = (busId: string) => {
    const nowTs = new Date().toISOString();
    const busNumber = assignments.find((a) => a.bus_id === busId)?.bus_number ?? "";

    setUiState((prev) => {
      const updatedAssignments = prev.assignments.map((a) => {
        if (a.bus_id !== busId) return a;
        if (!a.arrival_reported_at || a.arrival_confirmed_at) return a;
        return { ...a, arrival_confirmed_at: nowTs };
      });

      const updatedNotifications: TerminalNotification[] = prev.notifications.map((n) => {
        if (n.bus_id !== busId) return n;
        if (n.event_type !== "arrival_reported") return n;
        if (n.status !== "pending_confirmation") return n;
        return { ...n, status: "confirmed" as const, confirmation_time: nowTs };
      });

      const bus = prev.assignments.find((a) => a.bus_id === busId);
      if (bus) {
        updatedNotifications.push({
          id: `log-${busId}-arrival_confirmed-${nowTs}`,
          terminal_id: terminalId,
          bus_id: busId,
          bus_number: bus.bus_number,
          event_type: "arrival_confirmed",
          status: "confirmed" as const,
          event_time: nowTs,
          confirmation_time: nowTs,
          auto_detected: false,
          remarks: "Arrival confirmed",
        });
      }

      return {
        ...prev,
        assignments: updatedAssignments,
        notifications: updatedNotifications,
      };
    });

    setToast(`Arrival confirmed for bus ${busNumber}`);
  };

  const confirmDeparture = (busId: string) => {
    const nowTs = new Date().toISOString();
    const busNumber = assignments.find((a) => a.bus_id === busId)?.bus_number ?? "";

    setUiState((prev) => {
      const updatedAssignments = prev.assignments.map((a) => {
        if (a.bus_id !== busId) return a;
        if (!a.departure_reported_at || a.departure_confirmed_at) return a;
        return { ...a, departure_confirmed_at: nowTs };
      });

      const updatedNotifications: TerminalNotification[] = prev.notifications.map((n) => {
        if (n.bus_id !== busId) return n;
        if (n.event_type !== "departure_reported") return n;
        if (n.status !== "pending_confirmation") return n;
        return { ...n, status: "confirmed" as const, confirmation_time: nowTs };
      });

      const bus = prev.assignments.find((a) => a.bus_id === busId);
      if (bus) {
        updatedNotifications.push({
          id: `log-${busId}-departure_confirmed-${nowTs}`,
          terminal_id: terminalId,
          bus_id: busId,
          bus_number: bus.bus_number,
          event_type: "departure_confirmed",
          status: "confirmed" as const,
          event_time: nowTs,
          confirmation_time: nowTs,
          auto_detected: false,
          remarks: "Departure confirmed",
        });
      }

      return {
        ...prev,
        assignments: updatedAssignments,
        notifications: updatedNotifications,
      };
    });

    setToast(`Departure confirmed for bus ${busNumber}`);
  };

  const pendingArrivalRows = useMemo(() => {
    return pendingArrivalBuses.map((b) => ({
      busId: b.bus_id,
      busNumber: b.bus_number,
      routeName: b.route_name,
      time: b.arrival_reported_at,
    }));
  }, [pendingArrivalBuses]);

  const pendingDepartureRows = useMemo(() => {
    return pendingDepartureBuses.map((b) => ({
      busId: b.bus_id,
      busNumber: b.bus_number,
      routeName: b.route_name,
      time: b.departure_reported_at,
    }));
  }, [pendingDepartureBuses]);

  const presentRows = useMemo(() => {
    return [...presentBuses]
      .sort(
        (a, b) =>
          new Date(b.arrival_reported_at ?? 0).getTime() -
          new Date(a.arrival_reported_at ?? 0).getTime(),
      )
      .map((b) => ({
        id: b.id,
        busNumber: b.bus_number,
        routeName: b.route_name,
        arrivedAt: b.arrival_reported_at,
        departureState: b.departure_confirmed_at
          ? "departed"
          : b.departure_reported_at
            ? "awaiting confirmation"
            : "at terminal",
      }));
  }, [presentBuses]);

  const departedRows = useMemo(() => {
    return [...departedBuses]
      .sort(
        (a, b) =>
          new Date(b.departure_confirmed_at ?? 0).getTime() -
          new Date(a.departure_confirmed_at ?? 0).getTime(),
      )
      .map((b) => ({
        id: b.id,
        busNumber: b.bus_number,
        routeName: b.route_name,
        departedAt: b.departure_confirmed_at,
      }));
  }, [departedBuses]);

  return (
    <div className="space-y-6 pb-6 pt-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Terminal Dashboard</h1>
          <p className="text-sm text-base-content/70">
            {terminalName} • {nowIso ? formatDate(nowIso) : "—"} • Live view
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="badge badge-outline">{terminalName}</span>
          <Link className="btn btn-sm btn-ghost" href="/admin/management">
            Manage arrivals/departures
          </Link>
        </div>
      </div>

      {toast ? (
        <div className="alert alert-info">
          <span>{toast}</span>
        </div>
      ) : null}

      {/* Summary stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-base-300 bg-base-100 p-4 shadow-sm">
          <div className="text-sm text-base-content/70">Total buses scheduled to arrive today</div>
          <div className="mt-2 text-3xl font-bold">{scheduledToday.length}</div>
          <div className="mt-1 text-sm text-base-content/60">All scheduled ETAs</div>
        </div>

        <div className="rounded-xl border border-base-300 bg-base-100 p-4 shadow-sm">
          <div className="text-sm text-base-content/70">Buses currently present at the terminal</div>
          <div className="mt-2 text-3xl font-bold">{presentBuses.length}</div>
          <div className="mt-1 text-sm text-base-content/60">Arrived, not departed</div>
        </div>

        <div className="rounded-xl border border-base-300 bg-base-100 p-4 shadow-sm">
          <div className="text-sm text-base-content/70">Buses that have departed</div>
          <div className="mt-2 text-3xl font-bold">{departedBuses.length}</div>
          <div className="mt-1 text-sm text-base-content/60">Departure confirmed</div>
        </div>

        <div className="rounded-xl border border-base-300 bg-base-100 p-4 shadow-sm">
          <div className="text-sm text-base-content/70">Pending confirmations</div>
          <div className="mt-2 text-3xl font-bold">{pendingTotal}</div>
          <div className="mt-1 text-sm text-base-content/60">Arrivals + departures waiting</div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <TerminalSnapshot
          presentCount={presentBuses.length}
          departedCount={departedBuses.length}
          mounted={mounted}
        />

        <ConfirmationBacklog
          pendingTotal={pendingTotal}
          pendingArrivalCount={pendingArrivalBuses.length}
          pendingDepartureCount={pendingDepartureBuses.length}
          mounted={mounted}
        />

        <TerminalEventFlow
          mounted={mounted}
          notifications={notifications}
          terminalId={terminalId}
        />
      </div>

      {/* Pending confirmations + Notifications */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <PendingConfirmation
          pendingTotal={pendingTotal}
          pendingArrivalRows={pendingArrivalRows}
          pendingDepartureRows={pendingDepartureRows}
          formatTime={formatTime}
          onConfirmArrival={confirmArrival}
          onConfirmDeparture={confirmDeparture}
        />

        <Notifications notifications={recentNotifications} />
      </div>

      {/* Present + departed buses */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <BusPresent presentRows={presentRows} formatTime={formatTime} />
        <BusDeparted departedRows={departedRows} formatTime={formatTime} />
      </div>

      <div className="rounded-xl border border-base-300 bg-base-100 p-4 shadow-sm">
        <h2 className="text-lg font-semibold">Pending confirmations by type</h2>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-lg border border-base-200 p-4">
            <div className="text-sm text-base-content/70">Arrival pending</div>
            <div className="text-3xl font-bold mt-1">{pendingArrivalBuses.length}</div>
          </div>
          <div className="rounded-lg border border-base-200 p-4">
            <div className="text-sm text-base-content/70">Departure pending</div>
            <div className="text-3xl font-bold mt-1">{pendingDepartureBuses.length}</div>
          </div>
          <div className="rounded-lg border border-base-200 p-4">
            <div className="text-sm text-base-content/70">Total pending</div>
            <div className="text-3xl font-bold mt-1">{pendingTotal}</div>
          </div>
        </div>
      </div>
    </div>
  );
}