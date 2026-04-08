type PendingConfirmationProps = {
  pendingTotal: number;
  pendingArrival: PendingConfirmationType[];
  pendingDeparture: PendingConfirmationType[];
};

type PendingConfirmationType = {
  terminal_log_id: string;
  bus_number: string;
  route_name: string;
  event_time: string;
};

const formatTime = (time: string) => {
  return new Date(time).toLocaleTimeString();
};

export default function PendingConfirmation({
  pendingTotal,
  pendingArrival,
  pendingDeparture,
}: PendingConfirmationProps) {
  return (
    <div className="max-h-180 min-h-80 overflow-auto rounded-xl border border-base-300 bg-base-100 p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Pending confirmations</h2>
        <span className="badge badge-sm badge-warning">
          {pendingTotal} waiting
        </span>
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
                {pendingArrival.length ? (
                  pendingArrival.map((r, i) => (
                    <tr key={i}>
                      <td className="font-semibold">{r.bus_number}</td>
                      <td>{r.route_name}</td>
                      <td>{r.event_time ? formatTime(r.event_time) : "-"}</td>
                      <td className="text-right">
                        <button
                          className="btn btn-sm bg-[#0062CA] text-white"

                        >
                          Confirm
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={4}
                      className="text-center text-sm text-base-content/60"
                    >
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
                {pendingDeparture.length ? (
                  pendingDeparture.map((r, i) => (
                    <tr key={i}>
                      <td className="font-semibold">{r.bus_number}</td>
                      <td>{r.route_name}</td>
                      <td>{r.event_time ? formatTime(r.event_time) : "-"}</td>
                      <td className="text-right">
                        <button
                          className="btn btn-sm bg-[#0062CA] text-white"
                        >
                          Confirm
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={4}
                      className="text-center text-sm text-base-content/60"
                    >
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
