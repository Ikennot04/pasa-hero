"use client";

import { useState, useMemo } from "react";
import { RouteProps, type RouteStatus } from "./RouteProps";
import RouteTable from "./_components/RouteTable";
import AddRouteModal from "./_components/AddRoute";

// Static data for routes (matches backend route.model.js; terminal ids align with terminal static data)
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

const ROUTE_STATUS_OPTIONS: RouteStatus[] = ["active", "inactive", "suspended"];

export default function Route() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<RouteStatus | "all">("all");

  const filteredRoutes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return ROUTES_STATIC.filter((r) => {
      const matchSearch =
        !q ||
        r.route_name.toLowerCase().includes(q) ||
        r.route_code.toLowerCase().includes(q) ||
        (r.start_terminal_name?.toLowerCase().includes(q)) ||
        (r.end_terminal_name?.toLowerCase().includes(q));
      const matchStatus = statusFilter === "all" || r.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [searchQuery, statusFilter]);

  return (
    <div className="space-y-4 pt-6">
      <div className="text-xl font-bold">Route Management Table</div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="form-control w-64">
            <input
              type="text"
              placeholder="Search by name, code, or terminal..."
              className="input input-bordered w-full"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="form-control w-40">
            <select
              className="select select-bordered w-full"
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as RouteStatus | "all")
              }
            >
              <option value="all">All status</option>
              {ROUTE_STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <span className="text-sm text-base-content/70">
            Showing {filteredRoutes.length} of {ROUTES_STATIC.length} routes
          </span>
        </div>
        <AddRouteModal />
      </div>
      <RouteTable routes={filteredRoutes} />
    </div>
  );
}
