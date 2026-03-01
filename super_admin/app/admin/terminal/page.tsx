"use client";

import { useState, useMemo } from "react";
import {
  TerminalProps,
  TerminalLogProps,
  type TerminalStatus,
  type TerminalLogEventType,
  type TerminalLogStatus,
} from "./TerminalProps";
import TerminalTable from "./_components/TerminalTable";
import TerminalLogTable from "./_components/TerminalLogTable";
import AddTerminalModal from "./_components/AddTerminal";

// Static data for terminals (matches backend terminal.model.js)
const TERMINALS_STATIC: TerminalProps[] = [
  {
    id: "1",
    terminal_name: "PITX (Parañaque Integrated Terminal Exchange)",
    location_lat: 14.5547,
    location_lng: 120.9842,
    status: "active",
  },
  {
    id: "2",
    terminal_name: "SM North EDSA",
    location_lat: 14.6568,
    location_lng: 121.0312,
    status: "active",
  },
  {
    id: "3",
    terminal_name: "Monumento",
    location_lat: 14.6548,
    location_lng: 120.9845,
    status: "active",
  },
  {
    id: "4",
    terminal_name: "Fairview",
    location_lat: 14.7333,
    location_lng: 121.0500,
    status: "active",
  },
  {
    id: "5",
    terminal_name: "Tamiya Terminal",
    location_lat: 10.3157,
    location_lng: 123.8854,
    status: "active",
  },
  {
    id: "6",
    terminal_name: "Pacific Terminal",
    location_lat: 10.3128,
    location_lng: 123.8912,
    status: "inactive",
  },
];

const TERMINAL_STATUS_OPTIONS: TerminalStatus[] = ["active", "inactive"];

// Static data for terminal logs (matches backend terminal_log.model.js)
const TERMINAL_LOGS_STATIC: TerminalLogProps[] = [
  {
    id: "log1",
    terminal_id: "1",
    bus_id: "b1",
    terminal_name: "PITX",
    bus_number: "01-AB",
    event_type: "arrival_confirmed",
    status: "confirmed",
    event_time: "2025-03-01T07:15:00",
    confirmation_time: "2025-03-01T07:16:00",
    auto_detected: false,
    remarks: null,
  },
  {
    id: "log2",
    terminal_id: "1",
    bus_id: "b2",
    terminal_name: "PITX",
    bus_number: "12C",
    event_type: "departure_reported",
    status: "pending_confirmation",
    event_time: "2025-03-01T07:45:00",
    confirmation_time: null,
    auto_detected: false,
    remarks: null,
  },
  {
    id: "log3",
    terminal_id: "2",
    bus_id: "b3",
    terminal_name: "SM North EDSA",
    bus_number: "13B",
    event_type: "arrival_reported",
    status: "pending_confirmation",
    event_time: "2025-03-01T08:00:00",
    confirmation_time: null,
    auto_detected: true,
    remarks: "Gate sensor",
  },
  {
    id: "log4",
    terminal_id: "3",
    bus_id: "b1",
    terminal_name: "Monumento",
    bus_number: "01-AB",
    event_type: "departure_confirmed",
    status: "confirmed",
    event_time: "2025-03-01T06:30:00",
    confirmation_time: "2025-03-01T06:31:00",
    auto_detected: false,
    remarks: null,
  },
  {
    id: "log5",
    terminal_id: "4",
    bus_id: "b4",
    terminal_name: "Fairview",
    bus_number: "O1L",
    event_type: "arrival_confirmed",
    status: "rejected",
    event_time: "2025-03-01T08:20:00",
    confirmation_time: null,
    auto_detected: false,
    remarks: "Wrong terminal scan",
  },
];

const LOG_EVENT_TYPE_OPTIONS: TerminalLogEventType[] = [
  "arrival_reported",
  "arrival_confirmed",
  "departure_reported",
  "departure_confirmed",
  "auto_detected",
];
const LOG_STATUS_OPTIONS: TerminalLogStatus[] = [
  "pending_confirmation",
  "confirmed",
  "rejected",
];

export default function Terminal() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<TerminalStatus | "all">("all");
  const [logSearchQuery, setLogSearchQuery] = useState("");
  const [logEventFilter, setLogEventFilter] = useState<
    TerminalLogEventType | "all"
  >("all");
  const [logStatusFilter, setLogStatusFilter] = useState<
    TerminalLogStatus | "all"
  >("all");

  const filteredTerminals = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return TERMINALS_STATIC.filter((t) => {
      const matchSearch =
        !q ||
        t.terminal_name.toLowerCase().includes(q) ||
        t.location_lat.toString().includes(q) ||
        t.location_lng.toString().includes(q);
      const matchStatus =
        statusFilter === "all" || t.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [searchQuery, statusFilter]);

  const filteredLogs = useMemo(() => {
    const q = logSearchQuery.trim().toLowerCase();
    return TERMINAL_LOGS_STATIC.filter((log) => {
      const matchSearch =
        !q ||
        log.terminal_name.toLowerCase().includes(q) ||
        log.bus_number.toLowerCase().includes(q) ||
        log.event_type.toLowerCase().includes(q) ||
        (log.remarks && log.remarks.toLowerCase().includes(q));
      const matchEvent =
        logEventFilter === "all" || log.event_type === logEventFilter;
      const matchStatus =
        logStatusFilter === "all" || log.status === logStatusFilter;
      return matchSearch && matchEvent && matchStatus;
    });
  }, [logSearchQuery, logEventFilter, logStatusFilter]);

  return (
    <div className="space-y-4 pt-6">
      <div className="text-xl font-bold">Terminal Management Table</div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="form-control w-64">
            <input
              type="text"
              placeholder="Search by name or coordinates..."
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
                setStatusFilter(e.target.value as TerminalStatus | "all")
              }
            >
              <option value="all">All status</option>
              {TERMINAL_STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <span className="text-sm text-base-content/70">
            Showing {filteredTerminals.length} of {TERMINALS_STATIC.length}{" "}
            terminals
          </span>
        </div>
        <AddTerminalModal />
      </div>
      <TerminalTable terminals={filteredTerminals} />
      <div className="text-xl font-bold mt-10">Terminal Logs</div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="form-control w-64">
            <input
              type="text"
              placeholder="Search terminal, bus, event..."
              className="input input-bordered w-full"
              value={logSearchQuery}
              onChange={(e) => setLogSearchQuery(e.target.value)}
            />
          </div>
          <div className="form-control w-44">
            <select
              className="select select-bordered w-full"
              value={logEventFilter}
              onChange={(e) =>
                setLogEventFilter(e.target.value as TerminalLogEventType | "all")
              }
            >
              <option value="all">All events</option>
              {LOG_EVENT_TYPE_OPTIONS.map((e) => (
                <option key={e} value={e}>
                  {e.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </div>
          <div className="form-control w-44">
            <select
              className="select select-bordered w-full"
              value={logStatusFilter}
              onChange={(e) =>
                setLogStatusFilter(e.target.value as TerminalLogStatus | "all")
              }
            >
              <option value="all">All status</option>
              {LOG_STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </div>
          <span className="text-sm text-base-content/70">
            Showing {filteredLogs.length} of {TERMINAL_LOGS_STATIC.length} logs
          </span>
        </div>
      </div>
      <TerminalLogTable logs={filteredLogs} />
    </div>
  );
}
