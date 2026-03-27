export type EventType = "arrival" | "departure";
export type EventStatus = "pending" | "confirmed" | "rejected";
export type ReportSource = "auto" | "manual";

export type TerminalLogEvent = {
  id: string;
  busNumber: string;
  routeName: string;
  operator: string;
  plateNumber: string;
  eventType: EventType;
  /** When the event was first logged (report time). */
  reportedAt: string;
  reportedBy: string;
  reportSource: ReportSource;
  status: EventStatus;
  confirmedAt: string | null;
  confirmedBy: string | null;
  rejectedAt: string | null;
  rejectedBy: string | null;
  /** Scheduled time for context (e.g. trip arrival window). */
  scheduledAt: string | null;
};

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusBadgeClass(status: EventStatus) {
  if (status === "confirmed") return "badge-success";
  if (status === "pending") return "badge-warning";
  return "badge-error";
}

function sourceBadgeClass(source: ReportSource) {
  return source === "auto" ? "badge-info" : "badge-secondary";
}

type ArrivalDepartureLogProps = {
  events: TerminalLogEvent[];
};

export function ArrivalDepartureLog({ events }: ArrivalDepartureLogProps) {
  return (
    <div className="rounded-xl border border-base-300 bg-base-100 p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Arrival & departure log</h2>
        <span className="badge badge-outline">Newest first</span>
      </div>
      <div className="overflow-x-auto">
        <table className="table table-zebra w-full min-w-[960px]">
          <thead>
            <tr>
              <th>Reported at</th>
              <th>Type</th>
              <th>Bus</th>
              <th>Route</th>
              <th>Operator / plate</th>
              <th>Report source</th>
              <th>Reported by</th>
              <th>Status</th>
              <th>Confirmed by</th>
              <th>Rejected by</th>
              <th>Scheduled</th>
            </tr>
          </thead>
          <tbody>
            {events.length === 0 ? (
              <tr>
                <td colSpan={11} className="text-center text-base-content/60">
                  No events match your filters.
                </td>
              </tr>
            ) : (
              events.map((ev) => (
                <tr key={ev.id}>
                  <td className="whitespace-nowrap font-medium">{formatDateTime(ev.reportedAt)}</td>
                  <td>
                    <span className="badge badge-outline capitalize">{ev.eventType}</span>
                  </td>
                  <td className="font-semibold">{ev.busNumber}</td>
                  <td>{ev.routeName}</td>
                  <td>
                    <div className="text-sm font-medium">{ev.operator}</div>
                    <div className="text-xs text-base-content/70">{ev.plateNumber}</div>
                  </td>
                  <td>
                    <span className={`badge badge-outline ${sourceBadgeClass(ev.reportSource)}`}>
                      {ev.reportSource === "auto" ? "Auto-detected" : "Manual"}
                    </span>
                  </td>
                  <td className="max-w-[200px] text-sm">
                    <div className="whitespace-normal">{ev.reportedBy}</div>
                  </td>
                  <td>
                    <span className={`badge badge-outline ${statusBadgeClass(ev.status)}`}>{ev.status}</span>
                  </td>
                  <td className="max-w-[200px] text-sm">
                    {ev.confirmedAt && ev.confirmedBy ? (
                      <>
                        <div className="whitespace-normal font-medium">{ev.confirmedBy}</div>
                        <div className="text-xs text-base-content/70">{formatDateTime(ev.confirmedAt)}</div>
                      </>
                    ) : (
                      <span className="text-base-content/50">—</span>
                    )}
                  </td>
                  <td className="max-w-[200px] text-sm">
                    {ev.rejectedAt && ev.rejectedBy ? (
                      <>
                        <div className="whitespace-normal font-medium">{ev.rejectedBy}</div>
                        <div className="text-xs text-base-content/70">{formatDateTime(ev.rejectedAt)}</div>
                      </>
                    ) : (
                      <span className="text-base-content/50">—</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap text-sm text-base-content/80">
                    {ev.scheduledAt ? formatDateTime(ev.scheduledAt) : "—"}
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
