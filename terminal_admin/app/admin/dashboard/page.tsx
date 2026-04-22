"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
import { useGetTerminalSummary } from "./_hooks/useGetTerminalSummary";
import { useGetNotifications } from "./_hooks/useGetNotifications";
import { useGetPendingConfirmation } from "./_hooks/useGetPendingConfirmation";
import { useGetOperationalList } from "./_hooks/useGetOperationalList";

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

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

export default function Dashboard() {
  const terminalName = DEFAULT_TERMINAL_NAME;

  // Imported Hooks
  const { getTerminalSummary } = useGetTerminalSummary();
  const { getNotifications } = useGetNotifications();
  const { getPendingConfirmation } = useGetPendingConfirmation();
  const { getOperationalList } = useGetOperationalList();

  const [nowIso, setNowIso] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const mounted = nowIso !== null;

  // Ref Hooks
  const fetchSummaryRef = useRef(getTerminalSummary);
  const fetchNotificationsRef = useRef(getNotifications);
  const fetchPendingRef = useRef(getPendingConfirmation);
  const fetchBusesPresentRef = useRef(getOperationalList);

  // Ref Hooks UseEffect
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
  const [notifications, setNotifications] = useState<
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
  const [pendingCount, setPendingCount] = useState(0);

  // Buses Present States
  const [busesPresent, setBusesPresent] = useState<BusPresentType[]>([]);
  const [busesDeparted, setBusesDeparted] = useState<BusDepartedType[]>([]);

  // Hooks UseEffect
  useEffect(() => {
    // Terminal Summary
    const fetchTerminalSummary = async () => {
      const data = await fetchSummaryRef.current();
      if (data?.success) {
        setTerminalSummary(data?.data);
      }
    };
    fetchTerminalSummary();

    // Operational Notification Counts
    const fetchNotifications = async () => {
      const data = await fetchNotificationsRef.current();

      if (data.success) {
        setNotifications(data.data.notifications);
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
        setPendingCount(data.data.pending_confirmations);
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

  // Auto Update NowIso Effects
  useEffect(() => {
    const tick = () => setNowIso(new Date().toISOString());
    const initTimer = setTimeout(tick, 0);
    const intervalId = setInterval(
      () => setNowIso(new Date().toISOString()),
      30000,
    );
    return () => {
      clearTimeout(initTimer);
      clearInterval(intervalId);
    };
  }, []);

  // Auto HideToast Effects
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const refreshAfterTerminalConfirm = useCallback(async () => {
    const [pendingData, summaryData, opsData] = await Promise.all([
      getPendingConfirmation(),
      getTerminalSummary(),
      getOperationalList(),
    ]);
    if (pendingData.success) {
      setPendingArrivals(pendingData.data.pending_arrivals);
      setPendingDepartures(pendingData.data.pending_departures);
      setPendingCount(pendingData.data.pending_confirmations);
    }
    if (summaryData?.success) {
      setTerminalSummary(summaryData.data);
    }
    if (opsData.success) {
      setBusesPresent(opsData.data.buses_present);
      setBusesDeparted(opsData.data.not_confirmed_departed_buses);
    }
  }, [
    getPendingConfirmation,
    getTerminalSummary,
    getOperationalList,
  ]);

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
          pendingTotal={pendingCount}
          pendingArrival={pendingArrivals}
          pendingDeparture={pendingDepartures}
          onConfirmSuccess={refreshAfterTerminalConfirm}
          onConfirmToast={(msg) => setToast(msg)}
        />

        <Notifications notifications={notifications} />
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
