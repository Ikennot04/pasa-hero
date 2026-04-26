"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  TerminalProps,
  TerminalLogProps,
} from "../TerminalProps";
import TerminalLogTable from "../_components/TerminalLogTable";
import {
  getGoogleMapsEmbedUrl,
  getGoogleMapsLink,
  isGoogleMapsConfigured,
} from "@/lib/firebaseClient";

// Static data for terminals (matches main terminal page)
const TERMINALS_STATIC: TerminalProps[] = [
  { id: "1", terminal_name: "PITX (Parañaque Integrated Terminal Exchange)", location_lat: 14.5547, location_lng: 120.9842, status: "active" },
  { id: "2", terminal_name: "SM North EDSA", location_lat: 14.6568, location_lng: 121.0312, status: "active" },
  { id: "3", terminal_name: "Monumento", location_lat: 14.6548, location_lng: 120.9845, status: "active" },
  { id: "4", terminal_name: "Fairview", location_lat: 14.7333, location_lng: 121.0500, status: "active" },
  { id: "5", terminal_name: "Tamiya Terminal", location_lat: 10.3157, location_lng: 123.8854, status: "active" },
  { id: "6", terminal_name: "Pacific Terminal", location_lat: 10.3128, location_lng: 123.8912, status: "inactive" },
];

// Static data for terminal logs (matches main terminal page)
const TERMINAL_LOGS_STATIC: TerminalLogProps[] = [
  { id: "log1", terminal_id: "1", bus_id: "b1", terminal_name: "PITX", bus_number: "01-AB", event_type: "arrival", status: "confirmed", event_time: "2025-03-01T07:15:00", confirmation_time: "2025-03-01T07:16:00", auto_detected: false, remarks: null },
  { id: "log2", terminal_id: "1", bus_id: "b2", terminal_name: "PITX", bus_number: "12C", event_type: "departure", status: "pending", event_time: "2025-03-01T07:45:00", confirmation_time: null, auto_detected: false, remarks: null },
  { id: "log3", terminal_id: "2", bus_id: "b3", terminal_name: "SM North EDSA", bus_number: "13B", event_type: "arrival", status: "pending", event_time: "2025-03-01T08:00:00", confirmation_time: null, auto_detected: true, remarks: "Gate sensor" },
  { id: "log4", terminal_id: "3", bus_id: "b1", terminal_name: "Monumento", bus_number: "01-AB", event_type: "departure", status: "confirmed", event_time: "2025-03-01T06:30:00", confirmation_time: "2025-03-01T06:31:00", auto_detected: false, remarks: null },
  { id: "log5", terminal_id: "4", bus_id: "b4", terminal_name: "Fairview", bus_number: "O1L", event_type: "arrival", status: "rejected", event_time: "2025-03-01T08:20:00", confirmation_time: null, auto_detected: false, remarks: "Wrong terminal scan" },
];

// Static data for routes (terminal ids align with TERMINALS_STATIC)
type RouteAtTerminal = {
  id: string;
  route_name: string;
  route_code: string;
  start_terminal_id: string;
  end_terminal_id: string;
  start_terminal_name?: string;
  end_terminal_name?: string;
  estimated_duration: number | null;
  status: string;
};
const ROUTES_STATIC: RouteAtTerminal[] = [
  { id: "1", route_name: "PITX — SM North EDSA", route_code: "PITX-NEDSA", start_terminal_id: "1", end_terminal_id: "2", start_terminal_name: "PITX (Parañaque Integrated Terminal Exchange)", end_terminal_name: "SM North EDSA", estimated_duration: 45, status: "active" },
  { id: "2", route_name: "SM North EDSA — Monumento", route_code: "NEDSA-MON", start_terminal_id: "2", end_terminal_id: "3", start_terminal_name: "SM North EDSA", end_terminal_name: "Monumento", estimated_duration: 35, status: "active" },
  { id: "3", route_name: "Monumento — Fairview", route_code: "MON-FV", start_terminal_id: "3", end_terminal_id: "4", start_terminal_name: "Monumento", end_terminal_name: "Fairview", estimated_duration: 55, status: "active" },
  { id: "4", route_name: "PITX — Monumento", route_code: "PITX-MON", start_terminal_id: "1", end_terminal_id: "3", start_terminal_name: "PITX (Parañaque Integrated Terminal Exchange)", end_terminal_name: "Monumento", estimated_duration: 40, status: "active" },
  { id: "5", route_name: "Fairview — SM North EDSA", route_code: "FV-NEDSA", start_terminal_id: "4", end_terminal_id: "2", start_terminal_name: "Fairview", end_terminal_name: "SM North EDSA", estimated_duration: 50, status: "active" },
  { id: "6", route_name: "Tamiya — Pacific Terminal", route_code: "TAM-PAC", start_terminal_id: "5", end_terminal_id: "6", start_terminal_name: "Tamiya Terminal", end_terminal_name: "Pacific Terminal", estimated_duration: 15, status: "active" },
  { id: "7", route_name: "PITX — Fairview (Express)", route_code: "PITX-FV-X", start_terminal_id: "1", end_terminal_id: "4", start_terminal_name: "PITX (Parañaque Integrated Terminal Exchange)", end_terminal_name: "Fairview", estimated_duration: 90, status: "suspended" },
];

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

function formatDateTime(iso: string | undefined) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function TerminalDetailsPage() {
  const params = useParams();
  const terminalId = params?.terminal_id as string | undefined;

  const terminal = useMemo(
    () => (terminalId ? TERMINALS_STATIC.find((t) => t.id === terminalId) ?? null : null),
    [terminalId]
  );
  const logs = useMemo(
    () => (terminalId ? TERMINAL_LOGS_STATIC.filter((log) => log.terminal_id === terminalId) : []),
    [terminalId]
  );
  const routesAtTerminal = useMemo(
    () =>
      terminalId
        ? ROUTES_STATIC.filter(
            (r) => r.start_terminal_id === terminalId || r.end_terminal_id === terminalId
          )
        : [],
    [terminalId]
  );
  const mapsLink = terminal ? getGoogleMapsLink(terminal.location_lat, terminal.location_lng) : "";
  const embedUrl = terminal ? getGoogleMapsEmbedUrl(terminal.location_lat, terminal.location_lng) : null;

  if (!terminalId) {
    return (
      <div className="space-y-4 pt-6">
        <div className="alert alert-error">
          <span>Invalid terminal ID.</span>
        </div>
        <Link href="/admin/terminal" className="btn btn-ghost">
          ← Back to terminals
        </Link>
      </div>
    );
  }

  if (!terminal) {
    return (
      <div className="space-y-4 pt-6">
        <div className="alert alert-error">
          <span>Terminal not found.</span>
        </div>
        <Link href="/admin/terminal" className="btn btn-lg bg-[#0062CA] text-white hover:bg-[#0062CA]/80">
          ← Back to terminals
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 pt-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="breadcrumbs text-sm">
          <ul>
            <li>
              <Link href="/admin/terminal" className="text-base-content/70 hover:text-base-content">
                Terminals
              </Link>
            </li>
            <li className="text-base-content font-medium">
              {terminal.terminal_name}
            </li>
          </ul>
        </div>
        <Link href="/admin/terminal" className="btn btn-lg bg-[#0062CA] text-white hover:bg-[#0062CA]/80">
          ← Back to terminals
        </Link>
      </div>

      <div className="text-2xl font-bold">{terminal.terminal_name}</div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="card card-bordered bg-base-100 shadow-sm">
          <div className="card-body">
            <h2 className="card-title text-lg">Terminal details</h2>
            <dl className="space-y-2">
              <div>
                <dt className="text-sm text-base-content/60">ID</dt>
                <dd className="font-mono text-sm">{terminal.id}</dd>
              </div>
              <div>
                <dt className="text-sm text-base-content/60">Status</dt>
                <dd>
                  <TerminalStatusBadge status={terminal.status} />
                </dd>
              </div>
              <div>
                <dt className="text-sm text-base-content/60">Latitude</dt>
                <dd>{terminal.location_lat.toFixed(6)}</dd>
              </div>
              <div>
                <dt className="text-sm text-base-content/60">Longitude</dt>
                <dd>{terminal.location_lng.toFixed(6)}</dd>
              </div>
              {terminal.createdAt && (
                <div>
                  <dt className="text-sm text-base-content/60">Created</dt>
                  <dd>{formatDateTime(terminal.createdAt)}</dd>
                </div>
              )}
              {terminal.updatedAt && (
                <div>
                  <dt className="text-sm text-base-content/60">Updated</dt>
                  <dd>{formatDateTime(terminal.updatedAt)}</dd>
                </div>
              )}
            </dl>
          </div>
        </div>

        <div className="card card-bordered bg-base-100 shadow-sm">
          <div className="card-body">
            <h2 className="card-title text-lg">Location</h2>
            <p className="text-sm text-base-content/70">
              Coordinates: {terminal.location_lat.toFixed(6)},{" "}
              {terminal.location_lng.toFixed(6)}
            </p>
            <a
              href={mapsLink}
              target="_blank"
              rel="noopener noreferrer"
              className="link link-primary text-sm"
            >
              Open in Google Maps →
            </a>
            {isGoogleMapsConfigured && embedUrl ? (
              <div className="mt-3 overflow-hidden rounded-xl border border-base-300">
                <iframe
                  title={`${terminal.terminal_name} map`}
                  src={embedUrl}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  className="h-52 w-full border-0"
                />
              </div>
            ) : (
              <p className="mt-2 text-xs text-base-content/60">
                Add <code>NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> in your env file to show map preview.
              </p>
            )}
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-xl font-bold mb-3">Routes at this terminal</h2>
        {routesAtTerminal.length > 0 ? (
          <div className="overflow-x-auto rounded-box border border-base-content/5 bg-base-100">
            <table className="table">
              <thead>
                <tr>
                  <th className="w-10">#</th>
                  <th>Route name</th>
                  <th>Route code</th>
                  <th>Role</th>
                  <th>Other terminal</th>
                  <th>Duration</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {routesAtTerminal.map((route, i) => (
                  <tr key={route.id}>
                    <th>{i + 1}</th>
                    <td className="font-medium">{route.route_name}</td>
                    <td className="font-mono text-sm">{route.route_code}</td>
                    <td>
                      <span className="badge badge-sm badge-ghost">
                        {route.start_terminal_id === terminalId ? "Start" : "End"}
                      </span>
                    </td>
                    <td>
                      {route.start_terminal_id === terminalId
                        ? (route.end_terminal_name ?? route.end_terminal_id)
                        : (route.start_terminal_name ?? route.start_terminal_id)}
                    </td>
                    <td>
                      {route.estimated_duration != null
                        ? `${route.estimated_duration} min`
                        : "—"}
                    </td>
                    <td>
                      <span className={`badge badge-sm ${route.status === "active" ? "badge-success" : route.status === "suspended" ? "badge-warning" : "badge-ghost"}`}>
                        {route.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-box border border-base-content/5 bg-base-100 p-6 text-center text-base-content/60">
            No routes use this terminal as start or end.
          </div>
        )}
      </div>

      <div>
        <h2 className="text-xl font-bold mb-3">Terminal logs</h2>
        {logs.length > 0 ? (
          <TerminalLogTable logs={logs} />
        ) : (
          <div className="rounded-box border border-base-content/5 bg-base-100 p-6 text-center text-base-content/60">
            No logs for this terminal yet.
          </div>
        )}
      </div>
    </div>
  );
}
