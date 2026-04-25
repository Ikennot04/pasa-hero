"use client";

import { useState, useMemo, useEffect } from "react";
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
import { useGetTerminals } from "./_hooks/useGetTerminals";

type ApiTerminal = {
  _id: string;
  terminal_name: string;
  location_lat: number;
  location_lng: number;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
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
  const { getTerminals, error: terminalsError } = useGetTerminals();
  const [terminals, setTerminals] = useState<TerminalProps[]>([]);
  const [terminalsLoading, setTerminalsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<TerminalStatus | "all">("all");
  const [logSearchQuery, setLogSearchQuery] = useState("");
  const [logEventFilter, setLogEventFilter] = useState<
    TerminalLogEventType | "all"
  >("all");
  const [logStatusFilter, setLogStatusFilter] = useState<
    TerminalLogStatus | "all"
  >("all");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setTerminalsLoading(true);
      const res = await getTerminals();
      if (cancelled) return;
      if (res?.success === true && Array.isArray(res.data)) {
        setTerminals((res.data as ApiTerminal[]).map(mapApiTerminalToProps));
      } else {
        setTerminals([]);
      }
      setTerminalsLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [getTerminals]);

  const filteredTerminals = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return terminals.filter((t) => {
      const matchSearch =
        !q ||
        t.terminal_name.toLowerCase().includes(q) ||
        t.location_lat.toString().includes(q) ||
        t.location_lng.toString().includes(q);
      const matchStatus =
        statusFilter === "all" || t.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [searchQuery, statusFilter, terminals]);

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
      {terminalsError ? (
        <div role="alert" className="alert alert-error text-sm">
          {terminalsError}
        </div>
      ) : null}
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
            Showing {filteredTerminals.length} of {terminals.length} terminals
          </span>
        </div>
        <AddTerminalModal />
      </div>
      {terminalsLoading ? (
        <div className="flex justify-center py-16">
          <span className="loading loading-spinner loading-lg text-primary" />
        </div>
      ) : (
        <TerminalTable terminals={filteredTerminals} />
      )}
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
