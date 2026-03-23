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
  onRejectDeparture: (id: string) => void;
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
  onRejectDeparture,
}: DepartureConfirmationProps) {
  return (
    <div className="rounded-xl border border-base-300 bg-base-100 p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Pending departure confirmations</h2>
        <span className="badge bg-[#0062CA] text-white">{pendingDepartures.length}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="table table-zebra w-full">
          <thead>
            <tr>
              <th>Bus</th>
              <th>Route</th>
              <th>Reported at</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {pendingDepartures.length ? (
              pendingDepartures.map((row) => (
                <tr key={row.id}>
                  <td className="font-semibold">{row.busNumber}</td>
                  <td>{row.routeName}</td>
                  <td>{row.departureReportedAt ? formatDateTime(row.departureReportedAt) : "-"}</td>
                  <td className="text-right">
                    <div className="flex flex-wrap justify-end gap-2">
                      <button
                        type="button"
                        className="btn btn-sm text-sm bg-[#0062CA] text-white"
                        onClick={() => onConfirmDeparture(row.id)}
                      >
                        Confirm
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm text-sm btn-outline btn-error"
                        onClick={() => onRejectDeparture(row.id)}
                      >
                        Reject
                      </button>
                    </div>
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
