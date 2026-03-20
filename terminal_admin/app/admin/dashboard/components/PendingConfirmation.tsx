type PendingRow = {
  busId: string;
  busNumber: string;
  routeName: string;
  time: string | null;
};

type PendingConfirmationProps = {
  pendingTotal: number;
  pendingArrivalRows: PendingRow[];
  pendingDepartureRows: PendingRow[];
  formatTime: (iso: string) => string;
  onConfirmArrival: (busId: string) => void;
  onConfirmDeparture: (busId: string) => void;
};

export default function PendingConfirmation({
  pendingTotal,
  pendingArrivalRows,
  pendingDepartureRows,
  formatTime,
  onConfirmArrival,
  onConfirmDeparture,
}: PendingConfirmationProps) {
  return (
    <div className="rounded-xl border border-base-300 bg-base-100 p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Pending confirmations</h2>
        <span className="badge badge-sm badge-warning">{pendingTotal} waiting</span>
      </div>

      <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-lg border border-base-200 p-3 bg-base-100">
          <h3 className="font-semibold">Arrivals waiting</h3>
          <div className="mt-2 overflow-x-auto">
            <table className="table table-zebra w-full">
              <thead>
                <tr>
                  <th>Bus</th>
                  <th>Route</th>
                  <th>Time</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {pendingArrivalRows.length ? (
                  pendingArrivalRows.map((r) => (
                    <tr key={r.busId}>
                      <td className="font-semibold">{r.busNumber}</td>
                      <td>{r.routeName}</td>
                      <td>{r.time ? formatTime(r.time) : "-"}</td>
                      <td className="text-right">
                        <button className="btn btn-xs btn-primary" onClick={() => onConfirmArrival(r.busId)}>
                          Confirm
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="text-center text-sm text-base-content/60">
                      No pending arrivals
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-lg border border-base-200 p-3 bg-base-100">
          <h3 className="font-semibold">Departures waiting</h3>
          <div className="mt-2 overflow-x-auto">
            <table className="table table-zebra w-full">
              <thead>
                <tr>
                  <th>Bus</th>
                  <th>Route</th>
                  <th>Time</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {pendingDepartureRows.length ? (
                  pendingDepartureRows.map((r) => (
                    <tr key={r.busId}>
                      <td className="font-semibold">{r.busNumber}</td>
                      <td>{r.routeName}</td>
                      <td>{r.time ? formatTime(r.time) : "-"}</td>
                      <td className="text-right">
                        <button
                          className="btn btn-xs btn-primary"
                          onClick={() => onConfirmDeparture(r.busId)}
                        >
                          Confirm
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="text-center text-sm text-base-content/60">
                      No pending departures
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}