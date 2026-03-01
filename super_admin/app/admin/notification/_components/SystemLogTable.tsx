"use client";

import { SystemLogProps } from "./SystemLogProps";

function formatDate(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export default function SystemLogTable({ logs }: { logs: SystemLogProps[] }) {
  return (
    <div className="overflow-x-auto rounded-box border border-base-content/5 bg-base-100 max-h-220">
      <table className="table">
        <thead>
          <tr>
            <th className="w-10">#</th>
            <th>User</th>
            <th>Action</th>
            <th>Description</th>
            <th>Date</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log, i) => (
            <tr key={log.id}>
              <th>{i + 1}</th>
              <td className="font-medium">
                {log.user_name ?? log.user_id}
                {log.user_email && (
                  <span className="text-sm text-base-content/60 block">
                    {log.user_email}
                  </span>
                )}
              </td>
              <td>
                <span className="badge badge-sm badge-ghost">
                  {log.action.replace(/_/g, " ")}
                </span>
              </td>
              <td className="max-w-md">
                <span
                  className="line-clamp-2"
                  title={log.description ?? undefined}
                >
                  {log.description ?? "—"}
                </span>
              </td>
              <td className="text-sm text-base-content/70 whitespace-nowrap">
                {formatDate(log.createdAt)}
              </td>
              <td>
                <button type="button" className="btn btn-sm btn-ghost">
                  View
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
