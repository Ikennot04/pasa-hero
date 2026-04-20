"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

export type RouteStatus = "active" | "paused";

export type RouteRow = {
  id: string;
  routeCode: string;
  routeName: string;
  startRoute: string;
  endRoute: string;
  status: RouteStatus;
  active_buses_count: number;
  updatedAt: string;
};

type RoutesProps = {
  routes: RouteRow[];
};

function formatTimeAgo(iso: string) {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function Routes({ routes }: RoutesProps) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | RouteStatus>("all");

  const filteredRoutes = useMemo(() => {
    const lowered = query.trim().toLowerCase();
    return routes.filter((row) => {
      if (statusFilter !== "all" && row.status !== statusFilter) return false;
      if (!lowered) return true;
      const haystack =
        `${row.routeCode} ${row.routeName} ${row.startRoute} ${row.endRoute}`.toLowerCase();
      return haystack.includes(lowered);
    });
  }, [routes, query, statusFilter]);

  return (
    <div className="rounded-xl border border-base-300 bg-base-100 p-4 shadow-sm">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <label className="form-control w-full lg:max-w-md">
          <span className="label pb-1">
            <span className="label-text text-sm">Search routes</span>
          </span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Code, name, start or end route"
            className="input input-bordered w-full"
          />
        </label>

        <label className="form-control w-full lg:max-w-xs">
          <span className="label pb-1">
            <span className="label-text text-sm">Status filter</span>
          </span>
          <select
            className="select select-bordered w-full"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "all" | RouteStatus)}
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
          </select>
        </label>
      </div>

      <div className="overflow-x-auto">
        <table className="table table-zebra w-full min-w-[980px]">
          <thead>
            <tr>
              <th>Route</th>
              <th>Start route → End route</th>
              <th>Status</th>
              <th>Active buses</th>
              <th>Updated</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredRoutes.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center text-sm text-base-content/60">
                  No routes found for your search/filter.
                </td>
              </tr>
            ) : (
              filteredRoutes.map((row) => (
                <tr key={row.id}>
                  <td>
                    {row.routeName ? (
                      <>
                        <div className="font-semibold">{row.routeName}</div>
                        <div className="text-sm text-base-content/60">{row.routeCode}</div>
                      </>
                    ) : (
                      <div className="font-semibold">{row.routeCode}</div>
                    )}
                  </td>
                  <td className="whitespace-nowrap">
                    {row.startRoute} → {row.endRoute}
                  </td>
                  <td>
                    <span
                      className={`badge badge-outline capitalize ${row.status === "active" ? "badge-success" : "badge-warning"}`}
                    >
                      {row.status}
                    </span>
                  </td>
                  <td>{row.active_buses_count}</td>
                  <td className="text-sm text-base-content/70">{formatTimeAgo(row.updatedAt)}</td>
                  <td>
                    <Link
                      href={`/admin/routes/${encodeURIComponent(row.id)}`}
                      className="btn btn-sm btn-outline"
                    >
                      View details
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
