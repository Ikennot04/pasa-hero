"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import axios from "axios";
import { useParams } from "next/navigation";
import {
  TerminalProps,
  TerminalLogProps,
  type TerminalStatus,
  type TerminalLogEventType,
  type TerminalLogStatus,
} from "../TerminalProps";
import { type RouteProps, type RouteStatus } from "../../route/RouteProps";
import TerminalLogTable from "../_components/TerminalLogTable";
import { useGetTerminalDetails } from "../_hooks/useGetTerminalDetails";
import { useGetRoutes } from "../../route/_hooks/useGetRoutes";
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
  displayName: string;
  email: string;
  status: string;
};

type ApiTerminalRef = {
  _id?: string;
  id?: string;
  terminal_name?: string;
};

type ApiAssignedUser = {
  _id: string;
  f_name?: string | null;
  l_name?: string | null;
  email?: string | null;
  status?: string | null;
};

type AssignedStaffProps = {
  id: string;
  displayName: string;
  email: string;
  status: string;
};

type ApiTerminal = {
  _id: string;
  terminal_name: string;
  location_lat: number;
  location_lng: number;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
  assigned_terminal_admins?: ApiAssignedUser[];
  assigned_operators?: ApiAssignedUser[];
};

type ApiRoute = {
  _id: string;
  route_name: string;
  route_code: string;
  start_terminal_id: string | ApiTerminalRef | null;
  end_terminal_id: string | ApiTerminalRef | null;
  estimated_duration?: number | null;
  status?: string;
};

type ApiTerminalLogDetail = {
  _id: string;
  terminal_id: string | (ApiTerminalRef & { terminal_name?: string }) | null;
  bus_id: string | ({ _id?: string; bus_number?: string | null } & Record<string, unknown>) | null;
  event_type: string;
  status: string;
  event_time: string;
  confirmation_time: string | null;
  auto_detected?: boolean;
  remarks?: string | null;
};

function mapApiTerminalToProps(t: ApiTerminal): TerminalProps {
  const status: TerminalStatus = t.status === "inactive" ? "inactive" : "active";
  return {
    id: String(t._id),
    terminal_name: t.terminal_name,
    location_lat: Number(t.location_lat),
    location_lng: Number(t.location_lng),
    status,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  };
}

function mapApiAssignedUsers(users: ApiAssignedUser[] | undefined): AssignedStaffProps[] {
  if (!users?.length) return [];
  return users.map((u) => ({
    id: String(u._id),
    displayName:
      [u.f_name, u.l_name].filter(Boolean).join(" ").trim() || u.email || "Unknown",
    email: u.email ?? "",
    status: u.status ?? "active",
  }));
}

function UserStatusBadge({ status }: { status: string }) {
  const cls =
    status === "active"
      ? "badge-success"
      : status === "suspended"
        ? "badge-warning"
        : "badge-ghost";
  return <span className={`badge badge-sm ${cls}`}>{status}</span>;
}

function AssignedStaffBlock({
  label,
  members,
}: {
  label: string;
  members: AssignedStaffProps[];
}) {
  return (
    <div className="min-w-0">
      <dt className="text-sm text-base-content/60">{label}</dt>
      <dd className="mt-1">
        {members.length === 0 ? (
          <span className="text-sm text-base-content/50">None assigned</span>
        ) : (
          <ul className="space-y-2">
            {members.map((m) => (
              <li
                key={m.id}
                className="flex flex-col gap-0.5 border-l-2 border-base-content/10 pl-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2"
              >
                <span className="font-medium text-sm text-base-content">{m.displayName}</span>
                {m.email ? (
                  <span className="font-mono text-xs text-base-content/70">{m.email}</span>
                ) : null}
                <UserStatusBadge status={m.status} />
              </li>
            ))}
          </ul>
        )}
      </dd>
    </div>
  );
}

function normalizeTerminalRef(ref: string | ApiTerminalRef | null | undefined) {
  if (!ref) {
    return { id: "", name: undefined as string | undefined };
  }
  if (typeof ref === "string") {
    return { id: ref, name: undefined as string | undefined };
  }
  return {
    id: String(ref._id ?? ref.id ?? ""),
    name: ref.terminal_name,
  };
}

function mapApiRouteToProps(route: ApiRoute): RouteProps {
  const startTerminal = normalizeTerminalRef(route.start_terminal_id);
  const endTerminal = normalizeTerminalRef(route.end_terminal_id);
  const status: RouteStatus =
    route.status === "inactive" || route.status === "suspended"
      ? route.status
      : "active";

  return {
    id: String(route._id),
    route_name: route.route_name,
    route_code: route.route_code,
    start_terminal_id: startTerminal.id,
    end_terminal_id: endTerminal.id,
    start_terminal_name: startTerminal.name,
    end_terminal_name: endTerminal.name,
    estimated_duration:
      typeof route.estimated_duration === "number" ? route.estimated_duration : null,
    status,
  };
}

function mapDetailApiLogToProps(
  log: ApiTerminalLogDetail,
  fallbackTerminalId: string,
): TerminalLogProps {
  const eventTypeMap: Record<string, TerminalLogEventType> = {
    arrival: "arrival",
    departure: "departure",
  };
  const statusMap: Record<string, TerminalLogStatus> = {
    pending: "pending",
    confirmed: "confirmed",
    rejected: "rejected",
  };

  const terminalIdStr =
    log.terminal_id && typeof log.terminal_id === "object"
      ? String(log.terminal_id._id ?? log.terminal_id.id ?? fallbackTerminalId)
      : String(log.terminal_id ?? fallbackTerminalId);

  const busIdStr =
    log.bus_id && typeof log.bus_id === "object"
      ? String(log.bus_id._id ?? "")
      : String(log.bus_id ?? "");

  const terminalName =
    log.terminal_id && typeof log.terminal_id === "object" && log.terminal_id.terminal_name
      ? log.terminal_id.terminal_name
      : "Unknown terminal";

  const busNumber =
    log.bus_id && typeof log.bus_id === "object" && "bus_number" in log.bus_id
      ? String(log.bus_id.bus_number ?? "Unknown bus")
      : "Unknown bus";

  return {
    id: String(log._id),
    terminal_id: terminalIdStr,
    bus_id: busIdStr,
    terminal_name: terminalName,
    bus_number: busNumber,
    event_type: eventTypeMap[log.event_type] ?? "arrival",
    status: statusMap[log.status] ?? "pending",
    event_time: log.event_time,
    confirmation_time: log.confirmation_time,
    auto_detected: Boolean(log.auto_detected),
    remarks: log.remarks ?? null,
  };
}

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

const LOGS_PER_PAGE = 10;

export default function TerminalDetailsPage() {
  const params = useParams();
  const terminalId = params?.terminal_id as string | undefined;

  const { getTerminalDetails, error: detailsError } = useGetTerminalDetails();
  const { getRoutes, error: routesError } = useGetRoutes();

  const [terminal, setTerminal] = useState<TerminalProps | null>(null);
  const [assignedTerminalAdmins, setAssignedTerminalAdmins] = useState<AssignedStaffProps[]>(
    [],
  );
  const [assignedOperators, setAssignedOperators] = useState<AssignedStaffProps[]>([]);
  const [routesAtTerminal, setRoutesAtTerminal] = useState<RouteProps[]>([]);
  const [logs, setLogs] = useState<TerminalLogProps[]>([]);
  const [loading, setLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(true);
  const [logCurrentPage, setLogCurrentPage] = useState(1);

  useEffect(() => {
    if (!terminalId) return;

    let cancelled = false;

    (async () => {
      setLoading(true);
      setLogsLoading(true);
      setLogCurrentPage(1);
      setTerminal(null);
      setAssignedTerminalAdmins([]);
      setAssignedOperators([]);
      setRoutesAtTerminal([]);
      setLogs([]);

      const detailRes = await getTerminalDetails(terminalId);
      if (cancelled) return;

      if (detailRes?.success === true && detailRes.data) {
        const data = detailRes.data as ApiTerminal;
        setTerminal(mapApiTerminalToProps(data));
        setAssignedTerminalAdmins(mapApiAssignedUsers(data.assigned_terminal_admins));
        setAssignedOperators(mapApiAssignedUsers(data.assigned_operators));
      } else {
        setTerminal(null);
        setAssignedTerminalAdmins([]);
        setAssignedOperators([]);
      }
      setLoading(false);

      const [routesRes, logsRes] = await Promise.all([
        getRoutes(),
        (async () => {
          try {
            const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
            const { data } = await axios.get(
              `${baseUrl}/api/terminal-logs/terminal/${terminalId}`,
            );
            return data;
          } catch {
            return null;
          }
        })(),
      ]);

      if (cancelled) return;

      if (routesRes?.success === true && Array.isArray(routesRes.data)) {
        const allRoutes = (routesRes.data as ApiRoute[]).map(mapApiRouteToProps);
        setRoutesAtTerminal(
          allRoutes.filter(
            (r) => r.start_terminal_id === terminalId || r.end_terminal_id === terminalId,
          ),
        );
      }

      if (logsRes?.success === true && Array.isArray(logsRes.data)) {
        setLogs(
          (logsRes.data as ApiTerminalLogDetail[]).map((log) =>
            mapDetailApiLogToProps(log, terminalId),
          ),
        );
      }
      setLogsLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [terminalId, getTerminalDetails, getRoutes]);

  const logTotalPages = useMemo(
    () => Math.max(1, Math.ceil(logs.length / LOGS_PER_PAGE)),
    [logs.length],
  );
  const mapsLink = terminal ? getGoogleMapsLink(terminal.location_lat, terminal.location_lng) : "";
  const embedUrl = terminal ? getGoogleMapsEmbedUrl(terminal.location_lat, terminal.location_lng) : null;

  const currentLogPage = Math.min(logCurrentPage, logTotalPages);

  const paginatedLogs = useMemo(() => {
    const start = (currentLogPage - 1) * LOGS_PER_PAGE;
    return logs.slice(start, start + LOGS_PER_PAGE);
  }, [logs, currentLogPage]);

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

  if (loading) {
    return (
      <div className="space-y-4 pt-6">
        <span className="loading loading-spinner loading-lg" />
      </div>
    );
  }

  if (!terminal) {
    return (
      <div className="space-y-4 pt-6">
        {detailsError ? (
          <div role="alert" className="alert alert-error text-sm">
            {detailsError}
          </div>
        ) : (
          <div className="alert alert-error">
            <span>Terminal not found.</span>
          </div>
        )}
        <Link href="/admin/terminal" className="btn btn-lg bg-[#0062CA] text-white hover:bg-[#0062CA]/80">
          ← Back to terminals
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 pt-6">
      {routesError ? (
        <div role="alert" className="alert alert-warning text-sm">
          Routes could not be loaded: {routesError}
        </div>
      ) : null}

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

      <div className="card card-bordered bg-base-100 shadow-sm">
        <div className="card-body gap-5">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-base-content/10 pb-4">
            <div className="min-w-0 space-y-1">
              <h2 className="card-title text-lg">Terminal details</h2>
              <p className="text-lg font-semibold leading-snug text-base-content">
                {terminal.terminal_name}
              </p>
            </div>
            <div className="shrink-0 flex flex-col items-end gap-1">
              <span className="text-xs font-medium uppercase tracking-wide text-base-content/50">
                Status
              </span>
              <TerminalStatusBadge status={terminal.status} />
            </div>
          </div>

          <dl className="grid gap-4 sm:grid-cols-2">
            <div className="min-w-0 sm:col-span-2">
              <dt className="text-sm text-base-content/60">Terminal ID</dt>
              <dd className="mt-1 font-mono text-sm break-all text-base-content">
                {terminal.id}
              </dd>
            </div>
            <div className="min-w-0 sm:col-span-2">
              <dt className="text-sm text-base-content/60">Coordinates</dt>
              <dd className="mt-1 font-mono text-sm text-base-content">
                {terminal.location_lat.toFixed(6)}, {terminal.location_lng.toFixed(6)}
              </dd>
            </div>
            <AssignedStaffBlock
              label="Terminal admins"
              members={assignedTerminalAdmins}
            />
            <AssignedStaffBlock label="Operators" members={assignedOperators} />
          </dl>

          {(terminal.createdAt || terminal.updatedAt) && (
            <dl className="grid gap-3 border-t border-base-content/10 pt-4 sm:grid-cols-2">
              {terminal.createdAt && (
                <div>
                  <dt className="text-sm text-base-content/60">Created</dt>
                  <dd className="mt-1 text-sm text-base-content">
                    {formatDateTime(terminal.createdAt)}
                  </dd>
                </div>
              )}
              {terminal.updatedAt && (
                <div>
                  <dt className="text-sm text-base-content/60">Updated</dt>
                  <dd className="mt-1 text-sm text-base-content">
                    {formatDateTime(terminal.updatedAt)}
                  </dd>
                </div>
              )}
            </dl>
          )}
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
        <div className="mb-3 flex flex-wrap items-end justify-between gap-4">
          <h2 className="text-xl font-bold">Terminal logs</h2>
          {!logsLoading && logs.length > 0 ? (
            <span className="text-sm text-base-content/70">
              {logs.length} log{logs.length === 1 ? "" : "s"} total
            </span>
          ) : null}
        </div>
        {logsLoading ? (
          <span className="loading loading-spinner loading-md" />
        ) : logs.length > 0 ? (
          <>
            <div className="mb-3">
              <TerminalLogTable logs={paginatedLogs} />
            </div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-base-content/70">
                Page {currentLogPage} of {logTotalPages}
              </span>
              <div className="join">
                <button
                  type="button"
                  className="btn btn-sm join-item"
                  onClick={() => setLogCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentLogPage === 1}
                >
                  Prev
                </button>
                <button
                  type="button"
                  className="btn btn-sm join-item"
                  onClick={() =>
                    setLogCurrentPage((prev) => Math.min(logTotalPages, prev + 1))
                  }
                  disabled={currentLogPage === logTotalPages}
                >
                  Next
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="rounded-box border border-base-content/5 bg-base-100 p-6 text-center text-base-content/60">
            No logs for this terminal yet.
          </div>
        )}
      </div>
    </div>
  );
}
