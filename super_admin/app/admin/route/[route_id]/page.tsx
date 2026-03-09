"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { RouteProps } from "../RouteProps";

// Static data for routes (matches main route page)
const ROUTES_STATIC: RouteProps[] = [
  {
    id: "1",
    route_name: "PITX — SM North EDSA",
    route_code: "PITX-NEDSA",
    start_terminal_id: "1",
    end_terminal_id: "2",
    start_terminal_name: "PITX (Parañaque Integrated Terminal Exchange)",
    end_terminal_name: "SM North EDSA",
    estimated_duration: 45,
    status: "active",
  },
  {
    id: "2",
    route_name: "SM North EDSA — Monumento",
    route_code: "NEDSA-MON",
    start_terminal_id: "2",
    end_terminal_id: "3",
    start_terminal_name: "SM North EDSA",
    end_terminal_name: "Monumento",
    estimated_duration: 35,
    status: "active",
  },
  {
    id: "3",
    route_name: "Monumento — Fairview",
    route_code: "MON-FV",
    start_terminal_id: "3",
    end_terminal_id: "4",
    start_terminal_name: "Monumento",
    end_terminal_name: "Fairview",
    estimated_duration: 55,
    status: "active",
  },
  {
    id: "4",
    route_name: "PITX — Monumento",
    route_code: "PITX-MON",
    start_terminal_id: "1",
    end_terminal_id: "3",
    start_terminal_name: "PITX (Parañaque Integrated Terminal Exchange)",
    end_terminal_name: "Monumento",
    estimated_duration: 40,
    status: "active",
  },
  {
    id: "5",
    route_name: "Fairview — SM North EDSA",
    route_code: "FV-NEDSA",
    start_terminal_id: "4",
    end_terminal_id: "2",
    start_terminal_name: "Fairview",
    end_terminal_name: "SM North EDSA",
    estimated_duration: 50,
    status: "active",
  },
  {
    id: "6",
    route_name: "Tamiya — Pacific Terminal",
    route_code: "TAM-PAC",
    start_terminal_id: "5",
    end_terminal_id: "6",
    start_terminal_name: "Tamiya Terminal",
    end_terminal_name: "Pacific Terminal",
    estimated_duration: 15,
    status: "active",
  },
  {
    id: "7",
    route_name: "PITX — Fairview (Express)",
    route_code: "PITX-FV-X",
    start_terminal_id: "1",
    end_terminal_id: "4",
    start_terminal_name: "PITX (Parañaque Integrated Terminal Exchange)",
    end_terminal_name: "Fairview",
    estimated_duration: 90,
    status: "suspended",
  },
];

// Number of buses currently assigned/running on each route (static for demo)
const BUS_COUNT_BY_ROUTE: Record<string, number> = {
  "1": 3,
  "2": 2,
  "3": 2,
  "4": 2,
  "5": 1,
  "6": 1,
  "7": 0,
};

function RouteStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: "badge-success",
    inactive: "badge-ghost",
    suspended: "badge-warning",
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

export default function RouteDetailsPage() {
  const params = useParams();
  const routeId = params?.route_id as string | undefined;

  const route = useMemo(
    () => (routeId ? ROUTES_STATIC.find((r) => r.id === routeId) ?? null : null),
    [routeId]
  );

  const busCount = routeId ? (BUS_COUNT_BY_ROUTE[routeId] ?? 0) : 0;

  if (!routeId) {
    return (
      <div className="space-y-4 pt-6">
        <div className="alert alert-error">
          <span>Invalid route ID.</span>
        </div>
        <Link href="/admin/route" className="btn btn-ghost">
          ← Back to routes
        </Link>
      </div>
    );
  }

  if (!route) {
    return (
      <div className="space-y-4 pt-6">
        <div className="alert alert-error">
          <span>Route not found.</span>
        </div>
        <Link href="/admin/route" className="btn btn-lg bg-[#0062CA] text-white hover:bg-[#0062CA]/80">
          ← Back to routes
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 pt-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="breadcrumbs text-base">
          <ul>
            <li>
              <Link href="/admin/route" className="text-base-content/70 hover:text-base-content">
                Routes
              </Link>
            </li>
            <li className="text-base-content font-medium">
              {route.route_name}
            </li>
          </ul>
        </div>
        <Link href="/admin/route" className="btn btn-lg bg-[#0062CA] text-white hover:bg-[#0062CA]/80">
          ← Back to routes
        </Link>
      </div>

      <div className="text-3xl font-bold">{route.route_name}</div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="card card-bordered bg-base-100 shadow-sm">
          <div className="card-body">
            <h2 className="card-title text-xl">Route details</h2>
            <dl className="space-y-2 text-base">
              <div>
                <dt className="text-base-content/60">ID</dt>
                <dd className="font-mono">{route.id}</dd>
              </div>
              <div>
                <dt className="text-base-content/60">Route code</dt>
                <dd className="font-mono">{route.route_code}</dd>
              </div>
              <div>
                <dt className="text-base-content/60">Status</dt>
                <dd>
                  <RouteStatusBadge status={route.status} />
                </dd>
              </div>
              <div>
                <dt className="text-base-content/60">Estimated duration</dt>
                <dd>
                  {route.estimated_duration != null
                    ? `${route.estimated_duration} minutes`
                    : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-base-content/60">Buses on this route</dt>
                <dd>
                  <strong>{busCount}</strong> {busCount === 1 ? "bus" : "buses"} running
                </dd>
              </div>
              {route.createdAt && (
                <div>
                  <dt className="text-base-content/60">Created</dt>
                  <dd>{formatDateTime(route.createdAt)}</dd>
                </div>
              )}
              {route.updatedAt && (
                <div>
                  <dt className="text-base-content/60">Updated</dt>
                  <dd>{formatDateTime(route.updatedAt)}</dd>
                </div>
              )}
            </dl>
          </div>
        </div>

        <div className="card card-bordered bg-base-100 shadow-sm">
          <div className="card-body">
            <h2 className="card-title text-xl">Terminals</h2>
            <dl className="space-y-3 text-base">
              <div>
                <dt className="text-base-content/60">Start terminal</dt>
                <dd>
                  <Link
                    href={`/admin/terminal/${route.start_terminal_id}`}
                    className="link link-primary font-medium"
                  >
                    {route.start_terminal_name ?? route.start_terminal_id}
                  </Link>
                  <span className="ml-2 font-mono text-sm text-base-content/60">
                    (ID: {route.start_terminal_id})
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-base-content/60">End terminal</dt>
                <dd>
                  <Link
                    href={`/admin/terminal/${route.end_terminal_id}`}
                    className="link link-primary font-medium"
                  >
                    {route.end_terminal_name ?? route.end_terminal_id}
                  </Link>
                  <span className="ml-2 font-mono text-sm text-base-content/60">
                    (ID: {route.end_terminal_id})
                  </span>
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      <div className="card card-bordered bg-base-100 shadow-sm">
        <div className="card-body">
          <h2 className="card-title text-xl">Summary</h2>
          <p className="text-base-content/80 text-lg">
            This route runs from{" "}
            <strong>{route.start_terminal_name ?? route.start_terminal_id}</strong> to{" "}
            <strong>{route.end_terminal_name ?? route.end_terminal_id}</strong>
            {route.estimated_duration != null && (
              <> with an estimated travel time of <strong>{route.estimated_duration} minutes</strong>.</>
            )}
            {route.estimated_duration == null && "."}
          </p>
        </div>
      </div>
    </div>
  );
}
