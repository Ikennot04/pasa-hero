"use client";

import { useMemo, useState } from "react";
import ArrivalConfirmation from "./components/ArrivalConfirmation";
import DepartureConfirmation from "./components/DepartureConfirmation";
import OperationsLog from "./components/OperationsLog";

type ManagementBusRow = {
  id: string;
  busNumber: string;
  routeName: string;
  conductor: string;
  driver: string;
  scheduledArrivalAt: string;
  arrivalReportedAt: string | null;
  arrivalConfirmedAt: string | null;
  departureReportedAt: string | null;
  departureConfirmedAt: string | null;
};

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
      departureReportedAt: isoOffset(-60),
      departureConfirmedAt: isoOffset(-57),
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
      departureReportedAt: null,
      departureConfirmedAt: null,
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
      departureReportedAt: isoOffset(-6),
      departureConfirmedAt: null,
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
      departureReportedAt: null,
      departureConfirmedAt: null,
    },
  ];
}

export default function Management() {
  const [rows, setRows] = useState<ManagementBusRow[]>(() => buildRows());
  const [toast, setToast] = useState<string | null>(null);

  const pendingArrivals = useMemo(
    () => rows.filter((row) => row.arrivalReportedAt && !row.arrivalConfirmedAt),
    [rows],
  );
  const pendingDepartures = useMemo(
    () => rows.filter((row) => row.departureReportedAt && !row.departureConfirmedAt),
    [rows],
  );
  const presentAtTerminal = useMemo(
    () =>
      rows.filter(
        (row) => row.arrivalConfirmedAt && (!row.departureConfirmedAt || row.departureConfirmedAt === null),
      ),
    [rows],
  );
  const departed = useMemo(() => rows.filter((row) => row.departureConfirmedAt), [rows]);

  const confirmArrival = (id: string) => {
    const nowTs = new Date().toISOString();
    const bus = rows.find((row) => row.id === id);
    setRows((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;
        if (!row.arrivalReportedAt || row.arrivalConfirmedAt) return row;
        return { ...row, arrivalConfirmedAt: nowTs };
      }),
    );
    setToast(`Arrival confirmed for bus ${bus?.busNumber ?? ""}.`);
  };

  const confirmDeparture = (id: string) => {
    const nowTs = new Date().toISOString();
    const bus = rows.find((row) => row.id === id);
    setRows((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;
        if (!row.departureReportedAt || row.departureConfirmedAt) return row;
        return { ...row, departureConfirmedAt: nowTs };
      }),
    );
    setToast(`Departure confirmed for bus ${bus?.busNumber ?? ""}.`);
  };

  return (
    <div className="space-y-6 pb-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Bus Arrival & Departure Management</h1>
          <p className="text-sm text-base-content/70">
            Core operational view for terminal admins to log and confirm bus events.
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

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <ArrivalConfirmation pendingArrivals={pendingArrivals} onConfirmArrival={confirmArrival} />

        <DepartureConfirmation
          pendingDepartures={pendingDepartures}
          onConfirmDeparture={confirmDeparture}
        />
      </div>

      <OperationsLog rows={rows} departedCount={departed.length} />
    </div>
  );
}
