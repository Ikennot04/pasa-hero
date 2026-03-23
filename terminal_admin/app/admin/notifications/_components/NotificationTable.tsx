"use client";

import {
  busRefLabel,
  routeRefLabel,
  scopeSummary,
  senderRefLabel,
  terminalRefLabel,
  type NotificationFields,
  type NotificationPriority,
  type NotificationScope,
} from "../terminalBroadcastCatalog";

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const TYPE_LABEL: Record<NotificationFields["notification_type"], string> = {
  delay: "Delay",
  full: "Full",
  skipped_stop: "Skipped stop",
  info: "Info",
};

export type PriorityFilter = "all" | NotificationPriority;
export type ScopeFilter = "all" | NotificationScope;

function priorityBadge(p: NotificationPriority) {
  if (p === "high") return <span className="badge badge-error">High</span>;
  if (p === "medium") return <span className="badge badge-warning">Medium</span>;
  return <span className="badge badge-ghost badge-sm">Low</span>;
}

function scopeBadge(scope: NotificationScope) {
  return <span className="badge badge-outline badge-sm capitalize">{scope}</span>;
}

export type NotificationTableProps = {
  sorted: NotificationFields[];
  scopedLength: number;
  search: string;
  onSearchChange: (value: string) => void;
  priorityFilter: PriorityFilter;
  onPriorityFilterChange: (value: PriorityFilter) => void;
  scopeFilter: ScopeFilter;
  onScopeFilterChange: (value: ScopeFilter) => void;
};

export default function NotificationTable({
  sorted,
  scopedLength,
  search,
  onSearchChange,
  priorityFilter,
  onPriorityFilterChange,
  scopeFilter,
  onScopeFilterChange,
}: NotificationTableProps) {
  return (
    <>
      <div className="rounded-xl border border-base-300 bg-base-100 p-4 shadow-sm">
        <div className="flex flex-col gap-3 xl:flex-row xl:flex-wrap xl:items-end">
          <label className="form-control w-full max-w-xs">
            <span className="label-text text-sm font-medium">Search</span>
            <input
              type="search"
              placeholder="Title, message, sender, terminal, route, bus…"
              className="input input-bordered w-full"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </label>

          <label className="form-control w-full max-w-xs">
            <span className="label-text text-sm font-medium">Priority</span>
            <select
              className="select select-bordered w-full"
              value={priorityFilter}
              onChange={(e) => onPriorityFilterChange(e.target.value as PriorityFilter)}
            >
              <option value="all">All</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </label>

          <label className="form-control w-full max-w-xs">
            <span className="label-text text-sm font-medium">Scope</span>
            <select
              className="select select-bordered w-full"
              value={scopeFilter}
              onChange={(e) => onScopeFilterChange(e.target.value as ScopeFilter)}
            >
              <option value="all">All</option>
              <option value="terminal">Terminal</option>
              <option value="route">Route</option>
              <option value="bus">Bus</option>
              <option value="system">System</option>
            </select>
          </label>

          <p className="text-sm text-base-content/70 xl:pb-2">
            Showing <span className="font-medium">{sorted.length}</span> of{" "}
            <span className="font-medium">{scopedLength}</span>
          </p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-base-300 bg-base-100 shadow-sm">
        <table className="table">
          <thead>
            <tr className="border-base-300">
              <th>Created</th>
              <th>Updated</th>
              <th>Scope</th>
              <th>Sender</th>
              <th>Terminal</th>
              <th>Route</th>
              <th>Bus</th>
              <th>Title</th>
              <th>Message</th>
              <th>Type</th>
              <th>Priority</th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={11} className="text-center text-sm text-base-content/60 py-12">
                  Nothing matches your filters.
                </td>
              </tr>
            ) : (
              sorted.map((n) => (
                <tr key={n.id} className="border-base-200 align-top">
                  <td className="whitespace-nowrap text-sm">{formatDateTime(n.createdAt)}</td>
                  <td className="whitespace-nowrap text-sm text-base-content/80">
                    {formatDateTime(n.updatedAt)}
                  </td>
                  <td>
                    {scopeBadge(n.scope)}
                    <div className="text-xs text-base-content/60 mt-1 max-w-44">{scopeSummary(n)}</div>
                  </td>
                  <td className="max-w-40 text-sm">{senderRefLabel(n.sender_id)}</td>
                  <td className="max-w-36 text-sm">{terminalRefLabel(n.terminal_id)}</td>
                  <td className="max-w-40 text-sm">{routeRefLabel(n.route_id)}</td>
                  <td className="max-w-28 text-sm">{busRefLabel(n.bus_id)}</td>
                  <td className="max-w-44 text-sm font-medium">{n.title}</td>
                  <td className="max-w-56 text-sm text-base-content/80">
                    <span className="line-clamp-3">{n.message}</span>
                  </td>
                  <td>
                    <span className="badge badge-ghost ">{TYPE_LABEL[n.notification_type]}</span>
                  </td>
                  <td>{priorityBadge(n.priority)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
