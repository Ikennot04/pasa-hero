"use client";

import { TerminalProps } from "../TerminalProps";
import EditTerminal from "./EditTerminal";

function TerminalStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: "badge-success",
    inactive: "badge-ghost",
  };
  return (
    <span className={`badge ${map[status] ?? "badge-ghost"}`}>
      {status}
    </span>
  );
}

export default function TerminalTable({ terminals }: { terminals: TerminalProps[] }) {
  return (
    <div className="overflow-x-auto rounded-box border border-base-content/5 bg-base-100">
      <table className="table">
        <thead>
          <tr>
            <th className="w-10">#</th>
            <th>Terminal Name</th>
            <th>Latitude</th>
            <th>Longitude</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {terminals.map((terminal, i) => (
            <tr key={terminal.id}>
              <th>{i + 1}</th>
              <td className="font-medium">{terminal.terminal_name}</td>
              <td>{terminal.location_lat.toFixed(6)}</td>
              <td>{terminal.location_lng.toFixed(6)}</td>
              <td>
                <TerminalStatusBadge status={terminal.status} />
              </td>
              <td className="flex gap-2">
                <button type="button" className="btn">
                  View
                </button>
                <EditTerminal terminal={terminal} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
