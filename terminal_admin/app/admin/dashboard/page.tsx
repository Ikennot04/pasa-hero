"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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

// Components imports
import Notifications from "./_components/Notifications";
import PendingConfirmation from "./_components/PendingConfirmation";
import TerminalSnapshot from "./_components/charts/TerminalSnapshot";
import ConfirmationBacklog from "./_components/charts/ConfirmationBacklog";
import TerminalEventFlow from "./_components/charts/TerminalEventFlow";
import BusPresent from "./_components/BusPresent";
import BusDeparted from "./_components/BusDeparted";

// Hooks imports
import { useGetTerminalSummary } from "./_components/_hooks/useGetTerminalSummary";
import { useGetNotifications } from "./_components/_hooks/useGetNotifications";
import { useGetPendingConfirmation } from "./_components/_hooks/useGetPendingConfirmation";
import { useGetOperationalList } from "./_components/_hooks/useGetOperationalList";

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
  event_type: string;
  status: string;
  event_time: string;
  confirmation_time: string | null;
  auto_detected: boolean;
  remarks?: string | null;
};

type TerminalNotificationType = {
  _id: string;
  message: string;
  notification_type: string;
  priority: string;
  route_id: {
    route_code: string;
  } | null;
  terminal_id: {
    terminal_name: string;
  } | null;
  title: string;
  createdAt: string;
  updatedAt: string;
};

type PendingConfirmationType = {
  terminal_log_id: string;
  bus_number: string;
  route_name: string;
  event_time: string;
};

type BusPresentType = {
  bus_number: string;
  route_name: string;
  confirmed_at: string | null;
};

type BusDepartedType = {
  bus_number: string;
  route_name: string;
  created_at: string;
};

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
  const isoOffset = (minutes: number) =>
    new Date(now.getTime() + minutes * 60_000).toISOString();

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
        remarks: b.departure_confirmed_at
          ? null
          : "Awaiting terminal admin confirmation",
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
  const terminalName = DEFAULT_TERMINAL_NAME;

  // Imported Hooks
  const { getTerminalSummary } = useGetTerminalSummary();
  const { getNotifications } = useGetNotifications();
  const { getPendingConfirmation } = useGetPendingConfirmation();
  const { getOperationalList } = useGetOperationalList();

  // Hydration-safe: server renders a stable placeholder; real "now" + mock data are set after mount.
  const [uiState, setUiState] = useState<{
    assignments: BusAssignmentLike[];
    notifications: TerminalNotification[];
  }>({
    assignments: [],
    notifications: [],
  });
  const [nowIso, setNowIso] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const assignments = uiState.assignments;
  const mounted = nowIso !== null;

  // Ref Hooks
  const fetchSummaryRef = useRef(getTerminalSummary);
  const fetchNotificationsRef = useRef(getNotifications);
  const fetchPendingRef = useRef(getPendingConfirmation);
  const fetchBusesPresentRef = useRef(getOperationalList);

  // UseEffect Hooks
  useEffect(() => {
    fetchSummaryRef.current = getTerminalSummary;
    fetchNotificationsRef.current = getNotifications;
    fetchPendingRef.current = getPendingConfirmation;
    fetchBusesPresentRef.current = getOperationalList;
  }, [
    getTerminalSummary,
    getNotifications,
    getPendingConfirmation,
    getOperationalList,
  ]);

  // Terminal Summary States
  const [terminalSummary, setTerminalSummary] = useState({
    total_scheduled_arrivals_today: 0,
    buses_present: 0,
    buses_departed_today: 0,
    pending_confirmations: 0,
    pending_arrivals: 0,
    pending_departures: 0,
  });

  // Notifications States
  const [fetchedNotifications, setFetchedNotifications] = useState<
    TerminalNotificationType[]
  >([]);
  const [notificationCounts, setNotificationCounts] = useState({
    arrival_confirmed: 0,
    arrival_reported: 0,
    departure_confirmed: 0,
    departure_reported: 0,
  });

  // Pending Confirmations States
  const [pendingArrivals, setPendingArrivals] = useState<
    PendingConfirmationType[]
  >([]);
  const [pendingDepartures, setPendingDepartures] = useState<
    PendingConfirmationType[]
  >([]);
  const [fetchedPendingCount, setFetchedPendingCount] = useState(0);

  // Buses Present States
  const [busesPresent, setBusesPresent] = useState<BusPresentType[]>([]);
  const [busesDeparted, setBusesDeparted] = useState<BusDepartedType[]>([]);

  // Hooks UseEffect
  useEffect(() => {
    // Terminal Summary
    const fetchTerminalSummary = async () => {
      const data = await fetchSummaryRef.current();
      setTerminalSummary(data.data);
    };
    fetchTerminalSummary();

    // Operational Notification Counts
    const fetchNotifications = async () => {
      const data = await fetchNotificationsRef.current();

      if (data.success) {
        setFetchedNotifications(data.data.notifications);
        setNotificationCounts(data.data.counts);
      } else {
        setToast(data.message);
        setTimeout(() => setToast(null), 3500);
      }
    };
    fetchNotifications();

    // Pending Confirmations
    const fetchPendingConfirmations = async () => {
      const data = await fetchPendingRef.current();
      if (data.success) {
        setPendingArrivals(data.data.pending_arrivals);
        setPendingDepartures(data.data.pending_departures);
        setFetchedPendingCount(data.data.pending_confirmations);
      } else {
        setToast(data.message);
        setTimeout(() => setToast(null), 3500);
      }
    };
    fetchPendingConfirmations();

    // Buses Present
    const fetchBusesPresent = async () => {
      const data = await fetchBusesPresentRef.current();
      if (data.success) {
        setBusesPresent(data.data.buses_present);
        setBusesDeparted(data.data.not_confirmed_departed_buses);
      } else {
        setToast(data.message);
        setTimeout(() => setToast(null), 3500);
      }
    };
    fetchBusesPresent();
  }, []);

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | undefined;
    const initTimer = setTimeout(() => {
      const data = buildInitialMockData();
      setUiState({
        assignments: data.initialAssignments,
        notifications: data.initialNotifications,
      });
      setNowIso(new Date().toISOString());

      intervalId = setInterval(
        () => setNowIso(new Date().toISOString()),
        30000,
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

  const now = useMemo(
    () => (nowIso ? new Date(nowIso) : new Date(0)),
    [nowIso],
  );

  const presentBuses = useMemo(() => {
    return assignments.filter((a) => {
      const arrived = a.arrival_reported_at
        ? new Date(a.arrival_reported_at) <= now
        : false;
      const notDepartedConfirmed =
        !a.departure_confirmed_at || new Date(a.departure_confirmed_at) > now;
      return arrived && notDepartedConfirmed;
    });
  }, [assignments, now]);

  const departedBuses = useMemo(() => {
    return assignments.filter((a) => {
      if (!a.departure_confirmed_at) return false;
      return new Date(a.departure_confirmed_at) <= now;
    });
  }, [assignments, now]);

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
          <h1 className="text-2xl font-bold tracking-tight">
            Terminal Dashboard
          </h1>
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
        <div className="alert bg-blue-900 text-base text-white">
          <span>{toast}</span>
        </div>
      ) : null}

      {/* Summary stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-base-300 bg-base-100 p-4 shadow-sm">
          <div className="text-sm text-base-content/70">
            Total buses scheduled to arrive today
          </div>
          <div className="mt-2 text-3xl font-bold">
            {terminalSummary?.total_scheduled_arrivals_today}
          </div>
          <div className="mt-1 text-sm text-base-content/60">
            All scheduled ETAs
          </div>
        </div>

        <div className="rounded-xl border border-base-300 bg-base-100 p-4 shadow-sm">
          <div className="text-sm text-base-content/70">
            Buses currently present at the terminal
          </div>
          <div className="mt-2 text-3xl font-bold">
            {terminalSummary?.buses_present}
          </div>
          <div className="mt-1 text-sm text-base-content/60">
            Arrived, not departed
          </div>
        </div>

        <div className="rounded-xl border border-base-300 bg-base-100 p-4 shadow-sm">
          <div className="text-sm text-base-content/70">
            Buses that have departed
          </div>
          <div className="mt-2 text-3xl font-bold">
            {terminalSummary?.buses_departed_today}
          </div>
          <div className="mt-1 text-sm text-base-content/60">
            Departure confirmed
          </div>
        </div>

        <div className="rounded-xl border border-base-300 bg-base-100 p-4 shadow-sm">
          <div className="text-sm text-base-content/70">
            Pending confirmations
          </div>
          <div className="mt-2 text-3xl font-bold">
            {terminalSummary?.pending_confirmations}
          </div>
          <div className="mt-1 text-sm text-base-content/60">
            Arrivals + departures waiting
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <TerminalSnapshot
          presentCount={terminalSummary?.buses_present}
          departedCount={terminalSummary?.buses_departed_today}
          mounted={mounted}
        />

        <ConfirmationBacklog
          pendingTotal={terminalSummary?.pending_confirmations}
          pendingArrivalCount={terminalSummary?.pending_arrivals}
          pendingDepartureCount={terminalSummary?.pending_departures}
          mounted={mounted}
        />

        <TerminalEventFlow
          notificationCounts={notificationCounts}
          mounted={mounted}
        />
      </div>

      {/* Pending confirmations + Notifications */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <PendingConfirmation
          pendingTotal={fetchedPendingCount}
          pendingArrival={pendingArrivals}
          pendingDeparture={pendingDepartures}
        />

        <Notifications notifications={fetchedNotifications} />
      </div>

      {/* Present + departed buses */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <BusPresent presentBuses={busesPresent} />
        <BusDeparted departedBuses={busesDeparted} />
      </div>

      <div className="rounded-xl border border-base-300 bg-base-100 p-4 shadow-sm">
        <h2 className="text-lg font-semibold">Pending confirmations by type</h2>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-lg border border-base-200 p-4">
            <div className="text-sm text-base-content/70">Arrival pending</div>
            <div className="text-3xl font-bold mt-1">
              {terminalSummary?.pending_arrivals}
            </div>
          </div>
          <div className="rounded-lg border border-base-200 p-4">
            <div className="text-sm text-base-content/70">
              Departure pending
            </div>
            <div className="text-3xl font-bold mt-1">
              {terminalSummary?.pending_departures}
            </div>
          </div>
          <div className="rounded-lg border border-base-200 p-4">
            <div className="text-sm text-base-content/70">Total pending</div>
            <div className="text-3xl font-bold mt-1">
              {terminalSummary?.pending_confirmations}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
