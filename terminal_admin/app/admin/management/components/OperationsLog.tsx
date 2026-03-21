"use client";

type OperationsLogRow = {
  id: string;
  busNumber: string;
  routeName: string;
  conductor: string;
  driver: string;
  scheduledArrivalAt: string;
  arrivalConfirmedAt: string | null;
  departureReportedAt: string | null;
  departureConfirmedAt: string | null;
  arrivalReportedAt: string | null;
};

type OperationsLogProps = {
  rows: OperationsLogRow[];
  departedCount: number;
};

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function OperationsLog({ rows, departedCount }: OperationsLogProps) {
  return (
    <div className="rounded-xl border border-base-300 bg-base-100 p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Operations log</h2>
        <span className="badge badge-outline">{departedCount} departed</span>
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
                  <td>
                    {row.driver} / {row.conductor}
                  </td>
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
  );
}
