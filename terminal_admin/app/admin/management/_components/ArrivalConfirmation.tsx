"use client";

type PendingArrivalRow = {
  id: string;
  busNumber: string;
  routeName: string;
  arrivalReportedAt: string | null;
};

type ArrivalConfirmationProps = {
  pendingArrivals: PendingArrivalRow[];
  onConfirmArrival: (id: string) => void;
  onRejectArrival: (id: string) => void;
};

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ArrivalConfirmation({
  pendingArrivals,
  onConfirmArrival,
  onRejectArrival,
}: ArrivalConfirmationProps) {
  return (
    <div className="rounded-xl border border-base-300 bg-base-100 p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Pending arrival confirmations</h2>
        <span className="badge bg-[#408A71] text-white">{pendingArrivals.length}</span>
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
            {pendingArrivals.length ? (
              pendingArrivals.map((row) => (
                <tr key={row.id}>
                  <td className="font-semibold">{row.busNumber}</td>
                  <td>{row.routeName}</td>
                  <td>{row.arrivalReportedAt ? formatDateTime(row.arrivalReportedAt) : "-"}</td>
                  <td className="text-right">
                    <div className="flex flex-wrap justify-end gap-2">
                      <button
                        type="button"
                        className="btn btn-sm text-sm bg-[#408A71] text-white"
                        onClick={() => onConfirmArrival(row.id)}
                      >
                        Confirm
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm text-sm btn-outline btn-error"
                        onClick={() => onRejectArrival(row.id)}
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
                  No arrival events waiting for confirmation.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
