"use client";

type TerminalNotificationType = {
  _id: string;
  message: string;
  notification_type: string;
  priority: string;
  route_id: {
    route_code: string;
  } | null;
  terminal_id: {
    terminal_name: string;
  } | null;
  title: string;
  createdAt: string;
  updatedAt: string;
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
  notifications: TerminalNotificationType[];
};

function eventTypeBadgeClass(
  notificationType: TerminalNotificationType["notification_type"],
) {
  // Keep these as DaisyUI classes so they match the theme.
  switch (notificationType) {
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
  return (
    <div className="max-h-180 min-h-80 overflow-auto rounded-xl border border-base-300 bg-base-100 p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Recent notifications</h2>
        <span className="badge badge-sm badge-outline">
          Last {notifications.length}
        </span>
      </div>

      <div className="mt-3 space-y-3">
        {notifications.length ? (
          notifications.map((n) => (
            <div
              key={n._id}
              className="rounded-lg border border-base-200 p-3 bg-base-100 flex items-start justify-between gap-4"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold">
                    {n.route_id?.route_code ?? "00A"}
                  </span>
                  <span className={eventTypeBadgeClass(n.notification_type)}>
                    {n.notification_type.replaceAll("_", " ")}
                  </span>
                </div>
                <p className="mt-1 text-sm text-base-content/70 truncate">
                  {n.title}
                </p>
              </div>
              <div className="text-right shrink-0">
                <div className="text-sm font-semibold">
                  {formatTime(n.createdAt)}
                </div>
                <div className="text-xs text-base-content/60">
                  {formatDate(n.createdAt)}
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
