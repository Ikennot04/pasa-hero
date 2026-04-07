"use client";

import { useMemo } from "react";

type TerminalNotification = {
  id: string;
  terminal_id: string;
  bus_id: string;
  bus_number: string;
  event_type:
    | "arrival_reported"
    | "arrival_confirmed"
    | "departure_reported"
    | "departure_confirmed";
  status: "pending_confirmation" | "confirmed" | "rejected";
  event_time: string;
  confirmation_time: string | null;
  auto_detected: boolean;
  remarks?: string | null;
};

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

type Props = {
  notifications: TerminalNotification[];
};

function eventTypeBadgeClass(eventType: TerminalNotification["event_type"]) {
  // Keep these as DaisyUI classes so they match the theme.
  switch (eventType) {
    case "arrival_reported":
      return "badge badge-info badge-sm font-semibold text-[0.8rem]";
    case "arrival_confirmed":
      return "badge badge-success badge-sm font-semibold text-[0.8rem]";
    case "departure_reported":
      return "badge badge-warning badge-sm font-semibold text-[0.8rem]";
    case "departure_confirmed":
      return "badge badge-primary badge-sm font-semibold text-[0.8rem]";
    default:
      return "badge badge-ghost badge-sm font-semibold text-[0.8rem]";
  }
}

export default function Notifications({ notifications }: Props) {
  const sorted = useMemo(() => {
    return [...notifications].sort(
      (a, b) =>
        new Date(b.event_time).getTime() - new Date(a.event_time).getTime(),
    );
  }, [notifications]);

  return (
    <div className="rounded-xl border border-base-300 bg-base-100 p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Recent notifications</h2>
        <span className="badge badge-sm badge-outline">
          Last {sorted.length}
        </span>
      </div>

      <div className="mt-3 space-y-3">
        {sorted.length ? (
          sorted.map((n) => (
            <div
              key={n.id}
              className="rounded-lg border border-base-200 p-3 bg-base-100 flex items-start justify-between gap-4"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold">{n.bus_number}</span>
                  <span className={eventTypeBadgeClass(n.event_type)}>
                    {n.event_type.replaceAll("_", " ")}
                  </span>
                </div>
                <p className="mt-1 text-sm text-base-content/70 truncate">
                  {n.remarks ??
                    (n.auto_detected ? "Auto-detected" : "Manual update")}
                </p>
              </div>
              <div className="text-right shrink-0">
                <div className="text-sm font-semibold">
                  {formatTime(n.event_time)}
                </div>
                <div className="text-xs text-base-content/60">
                  {formatDate(n.event_time)}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center text-sm text-base-content/60 py-10">
            No notifications for this terminal yet.
          </div>
        )}
      </div>
    </div>
  );
}
