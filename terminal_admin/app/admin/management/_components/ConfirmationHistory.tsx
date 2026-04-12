"use client";

export type ConfirmationHistoryEntry = {
  id: string;
  busNumber: string;
  routeName: string;
  kind: "arrival" | "departure";
  at: string;
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

function eventBadge(kind: ConfirmationHistoryEntry["kind"]) {
  if (kind === "arrival") {
    return (
      <span className="badge badge-info badge-outline capitalize">Arrival</span>
    );
  }
  return (
    <span className="badge badge-secondary badge-outline capitalize">Departure</span>
  );
}

export default function ConfirmationHistory({ entries }: ConfirmationHistoryProps) {
  return (
    <div className="rounded-xl border border-base-300 bg-base-100 p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Confirmation history</h2>
          <p className="text-sm text-base-content/70">
            Today&apos;s arrival and departure confirmations, by time.
          </p>
        </div>
        <span className="badge badge-outline">{entries.length} entries</span>
      </div>
      <div className="overflow-x-auto min-h-40 max-h-112">
        <table className="table table-zebra w-full min-w-[520px]">
          <thead>
            <tr>
              <th>When</th>
              <th>Bus</th>
              <th>Route</th>
              <th>Event</th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center text-sm text-base-content/60">
                  No confirmations or rejections recorded yet today.
                </td>
              </tr>
            ) : (
              entries.map((e) => (
                <tr key={e.id}>
                  <td className="whitespace-nowrap font-medium">{formatDateTime(e.at)}</td>
                  <td className="font-semibold">{e.busNumber}</td>
                  <td>{e.routeName}</td>
                  <td>{eventBadge(e.kind)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
