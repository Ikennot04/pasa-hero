"use client";

import { TerminalLogProps } from "../TerminalProps";

function LogStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "badge-warning",
    confirmed: "badge-success",
    rejected: "badge-error",
  };
  return (
    <span className={`badge ${map[status] ?? "badge-ghost"}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

function EventTypeBadge({ eventType }: { eventType: string }) {
  const map: Record<string, string> = {
    arrival: "badge-info",
    departure: "badge-success",
  };
  return (
    <span className={`badge ${map[eventType] ?? "badge-ghost"}`}>
      {eventType.replace(/_/g, " ")}
    </span>
  );
}

function formatDateTime(iso: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export default function TerminalLogTable({
  logs,
}: {
  logs: TerminalLogProps[];
}) {
  return (
    <div className="overflow-x-auto rounded-box border border-base-content/5 bg-base-100">
      <table className="table">
        <thead>
          <tr>
            <th className="w-10">#</th>
            <th>Terminal</th>
            <th>Bus</th>
            <th>Event type</th>
            <th>Status</th>
            <th>Event time</th>
            <th>Confirmation time</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log, i) => (
            <tr key={log.id}>
              <th>{i + 1}</th>
              <td className="font-medium">{log.terminal_name}</td>
              <td>{log.bus_number}</td>
              <td>
                <EventTypeBadge eventType={log.event_type} />
              </td>
              <td>
                <LogStatusBadge status={log.status} />
              </td>
              <td>{formatDateTime(log.event_time)}</td>
              <td>{formatDateTime(log.confirmation_time ?? "")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
