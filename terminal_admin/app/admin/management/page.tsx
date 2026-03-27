"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import ArrivalConfirmation from "./_components/ArrivalConfirmation";
import ConfirmationHistory, { type ConfirmationHistoryEntry } from "./_components/ConfirmationHistory";
import DepartureConfirmation from "./_components/DepartureConfirmation";
import ScheduledBusesForToday, { type BusDayStatus, type ScheduledBusRow } from "./_components/ScheduledBusesForToday";

const CURRENT_ADMIN = "A. Reyes (Terminal Admin)";

type ManagementBusRow = {
  id: string;
  busNumber: string;
  routeName: string;
  conductor: string;
  driver: string;
  scheduledArrivalAt: string;
  arrivalReportedAt: string | null;
  arrivalConfirmedAt: string | null;
  arrivalConfirmedBy: string | null;
  departureReportedAt: string | null;
  departureConfirmedAt: string | null;
  departureConfirmedBy: string | null;
};

function sameLocalDay(a: Date, b: Date) {
  return a.toDateString() === b.toDateString();
}

function busDayStatus(row: ManagementBusRow): BusDayStatus {
  if (row.departureConfirmedAt) return "departed";
  if (row.arrivalConfirmedAt) return "present";
  if (row.arrivalReportedAt) return "arriving";
  return "scheduled";
}

function buildRows(): ManagementBusRow[] {
  const now = new Date();
  const isoOffset = (minutes: number) => new Date(now.getTime() + minutes * 60_000).toISOString();

  return [
    {
      id: "mb-1",
      busNumber: "01-AB",
      routeName: "PITX - NEDSA",
      conductor: "E. Santos",
      driver: "R. Dela Cruz",
      scheduledArrivalAt: isoOffset(-90),
      arrivalReportedAt: isoOffset(-92),
      arrivalConfirmedAt: isoOffset(-89),
      arrivalConfirmedBy: CURRENT_ADMIN,
      departureReportedAt: isoOffset(-60),
      departureConfirmedAt: isoOffset(-57),
      departureConfirmedBy: "M. Diaz (Dispatcher)",
    },
    {
      id: "mb-2",
      busNumber: "12C",
      routeName: "PITX - SM North EDSA",
      conductor: "J. Ramos",
      driver: "L. Guerrero",
      scheduledArrivalAt: isoOffset(-36),
      arrivalReportedAt: isoOffset(-34),
      arrivalConfirmedAt: null,
      arrivalConfirmedBy: null,
      departureReportedAt: null,
      departureConfirmedAt: null,
      departureConfirmedBy: null,
    },
    {
      id: "mb-3",
      busNumber: "13B",
      routeName: "PITX - Fairview",
      conductor: "M. Diaz",
      driver: "C. Aquino",
      scheduledArrivalAt: isoOffset(-28),
      arrivalReportedAt: isoOffset(-26),
      arrivalConfirmedAt: isoOffset(-23),
      arrivalConfirmedBy: "J. Ramos (Platform Marshal)",
      departureReportedAt: isoOffset(-6),
      departureConfirmedAt: null,
      departureConfirmedBy: null,
    },
    {
      id: "mb-4",
      busNumber: "07E",
      routeName: "PITX - Monumento",
      conductor: "P. Velasco",
      driver: "A. Torres",
      scheduledArrivalAt: isoOffset(18),
      arrivalReportedAt: null,
      arrivalConfirmedAt: null,
      arrivalConfirmedBy: null,
      departureReportedAt: null,
      departureConfirmedAt: null,
      departureConfirmedBy: null,
    },
  ];
}

function rowsForToday(rows: ManagementBusRow[]) {
  const today = new Date();
  return rows.filter((r) => sameLocalDay(new Date(r.scheduledArrivalAt), today));
}

function seedHistoryFromRows(rows: ManagementBusRow[]): ConfirmationHistoryEntry[] {
  const out: ConfirmationHistoryEntry[] = [];
  let n = 0;
  for (const r of rows) {
    if (r.arrivalConfirmedAt && r.arrivalConfirmedBy) {
      n += 1;
      out.push({
        id: `seed-${n}`,
        busNumber: r.busNumber,
        routeName: r.routeName,
        kind: "arrival",
        action: "confirm",
        at: r.arrivalConfirmedAt,
        by: r.arrivalConfirmedBy,
      });
    }
    if (r.departureConfirmedAt && r.departureConfirmedBy) {
      n += 1;
      out.push({
        id: `seed-${n}`,
        busNumber: r.busNumber,
        routeName: r.routeName,
        kind: "departure",
        action: "confirm",
        at: r.departureConfirmedAt,
        by: r.departureConfirmedBy,
      });
    }
  }
  return out.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
}

export default function Management() {
  const [rows, setRows] = useState<ManagementBusRow[]>(() => buildRows());
  const [toast, setToast] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<BusDayStatus | "all">("all");
  const [confirmationHistory, setConfirmationHistory] = useState<ConfirmationHistoryEntry[]>(() =>
    seedHistoryFromRows(buildRows()),
  );
  const historySeq = useRef(0);

  const pushHistory = useCallback((entry: Omit<ConfirmationHistoryEntry, "id">) => {
    historySeq.current += 1;
    const id = `h-${historySeq.current}`;
    setConfirmationHistory((prev) => [{ id, ...entry }, ...prev]);
  }, []);

  const todayRows = useMemo(() => rowsForToday(rows), [rows]);

  const scheduledForUi: ScheduledBusRow[] = useMemo(
    () =>
      todayRows.map((r) => ({
        id: r.id,
        busNumber: r.busNumber,
        routeName: r.routeName,
        conductor: r.conductor,
        driver: r.driver,
        scheduledArrivalAt: r.scheduledArrivalAt,
        status: busDayStatus(r),
      })),
    [todayRows],
  );

  const pendingArrivals = useMemo(
    () => rows.filter((row) => row.arrivalReportedAt && !row.arrivalConfirmedAt),
    [rows],
  );

  const pendingDepartures = useMemo(
    () =>
      rows.filter(
        (row) => row.arrivalConfirmedAt && row.departureReportedAt && !row.departureConfirmedAt,
      ),
    [rows],
  );

  const presentAtTerminal = useMemo(
    () =>
      rows.filter(
        (row) => row.arrivalConfirmedAt && (!row.departureConfirmedAt || row.departureConfirmedAt === null),
      ),
    [rows],
  );

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 4500);
  };

  const confirmArrival = (id: string) => {
    const nowTs = new Date().toISOString();
    const bus = rows.find((row) => row.id === id);
    setRows((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;
        if (!row.arrivalReportedAt || row.arrivalConfirmedAt) return row;
        return { ...row, arrivalConfirmedAt: nowTs, arrivalConfirmedBy: CURRENT_ADMIN };
      }),
    );
    if (bus) {
      pushHistory({
        busNumber: bus.busNumber,
        routeName: bus.routeName,
        kind: "arrival",
        action: "confirm",
        at: nowTs,
        by: CURRENT_ADMIN,
      });
    }
    showToast(`Arrival confirmed for bus ${bus?.busNumber ?? ""}.`);
  };

  const rejectArrival = (id: string) => {
    const nowTs = new Date().toISOString();
    const bus = rows.find((row) => row.id === id);
    setRows((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;
        if (!row.arrivalReportedAt || row.arrivalConfirmedAt) return row;
        return {
          ...row,
          arrivalReportedAt: null,
          arrivalConfirmedAt: null,
          arrivalConfirmedBy: null,
        };
      }),
    );
    if (bus) {
      pushHistory({
        busNumber: bus.busNumber,
        routeName: bus.routeName,
        kind: "arrival",
        action: "reject",
        at: nowTs,
        by: CURRENT_ADMIN,
      });
    }
    showToast(`Arrival report rejected for bus ${bus?.busNumber ?? ""}.`);
  };

  const confirmDeparture = (id: string) => {
    const nowTs = new Date().toISOString();
    const bus = rows.find((row) => row.id === id);
    setRows((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;
        if (!row.departureReportedAt || row.departureConfirmedAt) return row;
        return { ...row, departureConfirmedAt: nowTs, departureConfirmedBy: CURRENT_ADMIN };
      }),
    );
    if (bus) {
      pushHistory({
        busNumber: bus.busNumber,
        routeName: bus.routeName,
        kind: "departure",
        action: "confirm",
        at: nowTs,
        by: CURRENT_ADMIN,
      });
    }
    showToast(`Departure confirmed for bus ${bus?.busNumber ?? ""}.`);
  };

  const rejectDeparture = (id: string) => {
    const nowTs = new Date().toISOString();
    const bus = rows.find((row) => row.id === id);
    setRows((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;
        if (!row.departureReportedAt || row.departureConfirmedAt) return row;
        return {
          ...row,
          departureReportedAt: null,
          departureConfirmedBy: null,
        };
      }),
    );
    if (bus) {
      pushHistory({
        busNumber: bus.busNumber,
        routeName: bus.routeName,
        kind: "departure",
        action: "reject",
        at: nowTs,
        by: CURRENT_ADMIN,
      });
    }
    showToast(`Departure report rejected for bus ${bus?.busNumber ?? ""}.`);
  };

  const historySorted = useMemo(
    () => [...confirmationHistory].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()),
    [confirmationHistory],
  );

  return (
    <div className="space-y-6 pb-6 pt-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Bus Arrival & Departure Management</h1>
          <p className="text-sm text-base-content/70">
            Core operational view for terminal admins: today&apos;s schedule, pending confirmations, and history.
          </p>
        </div>
        <span className="badge badge-outline">Terminal Operations</span>
      </div>

      {toast ? (
        <div className="alert alert-info">
          <span>{toast}</span>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-base-300 bg-base-100 p-4 shadow-sm">
          <div className="text-sm text-base-content/70">Total active assignments</div>
          <div className="mt-2 text-3xl font-bold">{rows.length}</div>
        </div>
        <div className="rounded-xl border border-base-300 bg-base-100 p-4 shadow-sm">
          <div className="text-sm text-base-content/70">Pending arrival confirmations</div>
          <div className="mt-2 text-3xl font-bold text-warning">{pendingArrivals.length}</div>
        </div>
        <div className="rounded-xl border border-base-300 bg-base-100 p-4 shadow-sm">
          <div className="text-sm text-base-content/70">Pending departure confirmations</div>
          <div className="mt-2 text-3xl font-bold text-info">{pendingDepartures.length}</div>
        </div>
        <div className="rounded-xl border border-base-300 bg-base-100 p-4 shadow-sm">
          <div className="text-sm text-base-content/70">Currently present at terminal</div>
          <div className="mt-2 text-3xl font-bold text-success">{presentAtTerminal.length}</div>
        </div>
      </div>

      <ScheduledBusesForToday
        rows={scheduledForUi}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <ArrivalConfirmation
          pendingArrivals={pendingArrivals}
          onConfirmArrival={confirmArrival}
          onRejectArrival={rejectArrival}
        />

        <DepartureConfirmation
          pendingDepartures={pendingDepartures}
          onConfirmDeparture={confirmDeparture}
          onRejectDeparture={rejectDeparture}
        />
      </div>

      <ConfirmationHistory entries={historySorted} />
    </div>
  );
}
