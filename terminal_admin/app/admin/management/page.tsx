"use client";

import { useMemo, useState } from "react";

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

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
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
        <div className="rounded-xl border border-base-300 bg-base-100 p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Arrival confirmations</h2>
            <span className="badge badge-warning">{pendingArrivals.length}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="table table-zebra w-full">
              <thead>
                <tr>
                  <th>Bus</th>
                  <th>Route</th>
                  <th>Reported at</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {pendingArrivals.length ? (
                  pendingArrivals.map((row) => (
                    <tr key={row.id}>
                      <td className="font-semibold">{row.busNumber}</td>
                      <td>{row.routeName}</td>
                      <td>{row.arrivalReportedAt ? formatDateTime(row.arrivalReportedAt) : "-"}</td>
                      <td>
                        <button className="btn btn-xs btn-warning" onClick={() => confirmArrival(row.id)}>
                          Confirm arrival
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="text-center text-sm text-base-content/60">
                      No arrival events waiting for confirmation.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-xl border border-base-300 bg-base-100 p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Departure confirmations</h2>
            <span className="badge badge-info">{pendingDepartures.length}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="table table-zebra w-full">
              <thead>
                <tr>
                  <th>Bus</th>
                  <th>Route</th>
                  <th>Reported at</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {pendingDepartures.length ? (
                  pendingDepartures.map((row) => (
                    <tr key={row.id}>
                      <td className="font-semibold">{row.busNumber}</td>
                      <td>{row.routeName}</td>
                      <td>{row.departureReportedAt ? formatDateTime(row.departureReportedAt) : "-"}</td>
                      <td>
                        <button className="btn btn-xs btn-info" onClick={() => confirmDeparture(row.id)}>
                          Confirm departure
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="text-center text-sm text-base-content/60">
                      No departure events waiting for confirmation.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-base-300 bg-base-100 p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Operations log</h2>
          <span className="badge badge-outline">{departed.length} departed</span>
        </div>
        <div className="overflow-x-auto">
          <table className="table table-zebra w-full">
            <thead>
              <tr>
                <th>Bus</th>
                <th>Route</th>
                <th>Driver / Conductor</th>
                <th>Scheduled arrival</th>
                <th>Arrival</th>
                <th>Departure</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const status = row.departureConfirmedAt
                  ? "Departed"
                  : row.departureReportedAt
                    ? "Departure pending"
                    : row.arrivalConfirmedAt
                      ? "At terminal"
                      : row.arrivalReportedAt
                        ? "Arrival pending"
                        : "Inbound";

                return (
                  <tr key={row.id}>
                    <td className="font-semibold">{row.busNumber}</td>
                    <td>{row.routeName}</td>
                    <td>{row.driver} / {row.conductor}</td>
                    <td>{formatDateTime(row.scheduledArrivalAt)}</td>
                    <td>{row.arrivalConfirmedAt ? formatDateTime(row.arrivalConfirmedAt) : "-"}</td>
                    <td>{row.departureConfirmedAt ? formatDateTime(row.departureConfirmedAt) : "-"}</td>
                    <td>
                      <span className="badge badge-outline">{status}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
