"use client";

import { useMemo, useState } from "react";

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
  pageSize?: number;
};

export function ArrivalDepartureLog({
  events,
  pageSize = 10,
}: ArrivalDepartureLogProps) {
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(events.length / pageSize));
  const activePage = Math.min(Math.max(1, page), totalPages);

  const pageEvents = useMemo(() => {
    const start = (activePage - 1) * pageSize;
    return events.slice(start, start + pageSize);
  }, [events, activePage, pageSize]);

  const pageNumbers = useMemo(() => {
    const pages: number[] = [];
    const lo = Math.max(1, activePage - 2);
    const hi = Math.min(totalPages, activePage + 2);
    for (let i = lo; i <= hi; i += 1) pages.push(i);
    return pages;
  }, [activePage, totalPages]);

  const go = (next: number) => {
    setPage(Math.max(1, Math.min(totalPages, next)));
  };

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
              <th>Bus</th>
              <th>Route</th>
              <th>Operator / plate</th>
              <th>Reported by</th>
              <th>Type</th>
              <th>Status</th>
              <th>Report source</th>
              <th>Confirmed by</th>
              <th>Reported at</th>
            </tr>
          </thead>
          <tbody>
            {events.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center text-base-content/60">
                  No events match your filters.
                </td>
              </tr>
            ) : (
              pageEvents.map((ev) => (
                <tr key={ev.id}>
                  <td className="font-semibold">{ev.busNumber}</td>
                  <td>{ev.routeName}</td>
                  <td>
                    <div className="text-sm font-medium">{ev.operator}</div>
                    <div className="text-xs text-base-content/70">{ev.plateNumber}</div>
                  </td>
                  <td className="max-w-[200px] text-sm">
                    <div className="whitespace-normal">{ev.reportedBy}</div>
                  </td>
                  <td>
                    <span className="badge badge-outline capitalize">{ev.eventType}</span>
                  </td>
                  <td>
                    <span className={`badge badge-outline ${statusBadgeClass(ev.status)}`}>{ev.status}</span>
                  </td>
                  <td>
                    <span className={`badge badge-outline ${sourceBadgeClass(ev.reportSource)}`}>
                      {ev.reportSource === "auto" ? "Auto-detected" : "Manual"}
                    </span>
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
                  <td className="whitespace-nowrap font-medium">{formatDateTime(ev.reportedAt)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {events.length > 0 ? (
        <div className="mt-3 flex flex-col items-stretch gap-3 border-t border-base-content/10 pt-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-base-content/70">
            {(activePage - 1) * pageSize + 1}-{Math.min(activePage * pageSize, events.length)} of{" "}
            {events.length}
          </p>
          <div className="join flex-wrap justify-center">
            <button
              type="button"
              className="btn join-item btn-sm"
              disabled={activePage <= 1}
              onClick={() => go(1)}
            >
              First
            </button>
            <button
              type="button"
              className="btn join-item btn-sm"
              disabled={activePage <= 1}
              onClick={() => go(activePage - 1)}
            >
              Prev
            </button>
            {pageNumbers.map((p) => (
              <button
                key={p}
                type="button"
                className={`btn join-item btn-sm ${p === activePage ? "btn-active" : ""}`}
                onClick={() => go(p)}
              >
                {p}
              </button>
            ))}
            <button
              type="button"
              className="btn join-item btn-sm"
              disabled={activePage >= totalPages}
              onClick={() => go(activePage + 1)}
            >
              Next
            </button>
            <button
              type="button"
              className="btn join-item btn-sm"
              disabled={activePage >= totalPages}
              onClick={() => go(totalPages)}
            >
              Last
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
