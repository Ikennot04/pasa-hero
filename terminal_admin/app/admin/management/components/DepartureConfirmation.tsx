"use client";

type PendingDepartureRow = {
  id: string;
  busNumber: string;
  routeName: string;
  departureReportedAt: string | null;
};

type DepartureConfirmationProps = {
  pendingDepartures: PendingDepartureRow[];
  onConfirmDeparture: (id: string) => void;
};

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function DepartureConfirmation({
  pendingDepartures,
  onConfirmDeparture,
}: DepartureConfirmationProps) {
  return (
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
                    <button className="btn btn-sm btn-info text-sm" onClick={() => onConfirmDeparture(row.id)}>
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
  );
}
