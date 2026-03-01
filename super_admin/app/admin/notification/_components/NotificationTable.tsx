"use client";

import { NotificationProps } from "../NotificationProps";

function TypeBadge({ type }: { type: string }) {
  const map: Record<string, string> = {
    delay: "badge-warning",
    full: "badge-error",
    skipped_stop: "badge-warning",
    info: "badge-info",
  };
  return (
    <span className={`badge badge-sm ${map[type] ?? "badge-ghost"}`}>
      {type.replace(/_/g, " ")}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const map: Record<string, string> = {
    high: "badge-error",
    medium: "badge-warning",
    low: "badge-ghost",
  };
  return (
    <span className={`badge badge-sm ${map[priority] ?? "badge-ghost"}`}>
      {priority}
    </span>
  );
}

function ScopeBadge({ scope }: { scope: string }) {
  const map: Record<string, string> = {
    bus: "badge-primary",
    route: "badge-secondary",
    terminal: "badge-accent",
    system: "badge-neutral",
  };
  return (
    <span className={`badge badge-sm ${map[scope] ?? "badge-ghost"}`}>
      {scope}
    </span>
  );
}

function formatDate(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export default function NotificationTable({
  notifications,
}: {
  notifications: NotificationProps[];
}) {
  return (
    <div className="overflow-x-auto rounded-box border border-base-content/5 bg-base-100 max-h-220">
      <table className="table">
        <thead>
          <tr>
            <th className="w-10">#</th>
            <th>Title</th>
            <th>Message</th>
            <th>Type</th>
            <th>Priority</th>
            <th>Scope</th>
            <th>Target</th>
            <th>Created</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {notifications.map((n, i) => (
            <tr key={n.id}>
              <th>{i + 1}</th>
              <td className="font-medium max-w-[180px] truncate" title={n.title}>
                {n.title}
              </td>
              <td className="max-w-[200px] truncate" title={n.message}>
                {n.message}
              </td>
              <td>
                <TypeBadge type={n.notification_type} />
              </td>
              <td>
                <PriorityBadge priority={n.priority} />
              </td>
              <td>
                <ScopeBadge scope={n.scope} />
              </td>
              <td className="text-sm">
                {n.bus_number && <span>Bus: {n.bus_number}</span>}
                {n.route_name && (
                  <span>{n.bus_number ? " · " : ""}Route: {n.route_name}</span>
                )}
                {n.terminal_name && (
                  <span>
                    {n.bus_number || n.route_name ? " · " : ""}Terminal:{" "}
                    {n.terminal_name}
                  </span>
                )}
                {!n.bus_number && !n.route_name && !n.terminal_name && "—"}
              </td>
              <td className="text-sm text-base-content/70">
                {formatDate(n.createdAt)}
              </td>
              <td className="flex gap-2">
                <button type="button" className="btn btn-sm">
                  View
                </button>
                <button type="button" className="btn btn-sm">
                  Edit
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
