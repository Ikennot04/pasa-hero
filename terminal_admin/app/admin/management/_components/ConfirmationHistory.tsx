"use client";

export type ConfirmationHistoryEntry = {
  id: string;
  busNumber: string;
  routeName: string;
  kind: "arrival" | "departure";
  action: "confirm" | "reject";
  at: string;
  by: string;
};

type ConfirmationHistoryProps = {
  entries: ConfirmationHistoryEntry[];
};

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ConfirmationHistory({ entries }: ConfirmationHistoryProps) {
  return (
    <div className="rounded-xl border border-base-300 bg-base-100 p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Confirmation history</h2>
          <p className="text-sm text-base-content/70">Who confirmed or rejected each event, and when.</p>
        </div>
        <span className="badge badge-outline">{entries.length} entries</span>
      </div>
      <div className="overflow-x-auto">
        <table className="table table-zebra w-full min-w-[720px]">
          <thead>
            <tr>
              <th>When</th>
              <th>Bus</th>
              <th>Route</th>
              <th>Event</th>
              <th>Action</th>
              <th>By</th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center text-sm text-base-content/60">
                  No confirmations or rejections recorded yet today.
                </td>
              </tr>
            ) : (
              entries.map((e) => (
                <tr key={e.id}>
                  <td className="whitespace-nowrap font-medium">{formatDateTime(e.at)}</td>
                  <td className="font-semibold">{e.busNumber}</td>
                  <td>{e.routeName}</td>
                  <td className="capitalize">{e.kind}</td>
                  <td>
                    <span
                      className={`badge badge-outline ${e.action === "confirm" ? "badge-success" : "badge-error"}`}
                    >
                      {e.action}
                    </span>
                  </td>
                  <td className="max-w-[200px] text-sm">
                    <div className="whitespace-normal">{e.by}</div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
