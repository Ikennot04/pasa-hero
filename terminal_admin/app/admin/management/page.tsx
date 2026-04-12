"use client";

import { useCallback, useRef, useState, useEffect } from "react";
import ArrivalConfirmation from "./_components/ArrivalConfirmation";
import ConfirmationHistory from "./_components/ConfirmationHistory";
import DepartureConfirmation from "./_components/DepartureConfirmation";
import ScheduledBusesForToday, {
  type BusDayStatus,
  type ScheduledBusRow,
} from "./_components/ScheduledBusesForToday";

import { useGetTerminalManagement } from "./_hooks/useGetTerminalManagement";

type TerminalManagementApiPayload = {
  counts: {
    scheduled_buses_today: number;
    pending_arrival_confirmations: number;
    pending_departure_confirmations: number;
    currently_present_at_terminal: number;
  };
  scheduled_buses_today: {
    bus_number: string | null;
    route_name: string | null;
    driver: string | null;
    conductor: string | null;
    scheduled_arrival_at: string;
    status: string;
  }[];
  pending_arrival_confirmations: {
    terminal_log_id: string;
    bus_number: string | null;
    route_name: string | null;
    created_at: string;
  }[];
  pending_departure_confirmations: {
    terminal_log_id: string;
    bus_number: string | null;
    route_name: string | null;
    created_at: string;
  }[];
};

type PendingArrivalUi = {
  id: string;
  busNumber: string;
  routeName: string;
  arrivalReportedAt: string | null;
};

type PendingDepartureUi = {
  id: string;
  busNumber: string;
  routeName: string;
  departureReportedAt: string | null;
};

function normalizeBusDayStatus(raw: string): BusDayStatus {
  if (raw === "departed" || raw === "present" || raw === "arriving" || raw === "scheduled") {
    return raw;
  }
  return "scheduled";
}

function mapPayloadToState(payload: TerminalManagementApiPayload) {
  const scheduledRows: ScheduledBusRow[] = payload.scheduled_buses_today.map(
    (row, index) => ({
      id: `sched-${index}-${row.scheduled_arrival_at}`,
      busNumber: row.bus_number ?? "",
      routeName: row.route_name ?? "",
      conductor: row.conductor ?? "",
      driver: row.driver ?? "",
      scheduledArrivalAt: new Date(row.scheduled_arrival_at).toISOString(),
      status: normalizeBusDayStatus(row.status),
    }),
  );

  const pendingArrivals: PendingArrivalUi[] = payload.pending_arrival_confirmations.map(
    (row) => ({
      id: String(row.terminal_log_id),
      busNumber: row.bus_number ?? "",
      routeName: row.route_name ?? "",
      arrivalReportedAt: row.created_at
        ? new Date(row.created_at).toISOString()
        : null,
    }),
  );

  const pendingDepartures: PendingDepartureUi[] =
    payload.pending_departure_confirmations.map((row) => ({
      id: String(row.terminal_log_id),
      busNumber: row.bus_number ?? "",
      routeName: row.route_name ?? "",
      departureReportedAt: row.created_at
        ? new Date(row.created_at).toISOString()
        : null,
    }));

  return { scheduledRows, pendingArrivals, pendingDepartures };
}

export default function Management() {
  const { getTerminalManagement } = useGetTerminalManagement();
  const getTerminalManagementRef = useRef(getTerminalManagement);
  useEffect(() => {
    getTerminalManagementRef.current = getTerminalManagement;
  }, [getTerminalManagement]);

  const [terminalManagementSummary, setTerminalManagementSummary] = useState({
    scheduled_buses_today: 0,
    pending_arrival_confirmations: 0,
    pending_departure_confirmations: 0,
    currently_present_at_terminal: 0,
  });

  const [scheduledRows, setScheduledRows] = useState<ScheduledBusRow[]>([]);
  const [pendingArrivalRows, setPendingArrivalRows] = useState<PendingArrivalUi[]>([]);
  const [pendingDepartureRows, setPendingDepartureRows] = useState<PendingDepartureUi[]>(
    [],
  );

  const [statusFilter, setStatusFilter] = useState<BusDayStatus | "all">("all");

  const loadTerminalManagement = useCallback(async () => {
    const response = await getTerminalManagementRef.current();
    if (!response || typeof response !== "object" || !("success" in response)) {
      return;
    }
    if (!response.success || !response.data) {
      return;
    }
    const data = response.data as TerminalManagementApiPayload;
    setTerminalManagementSummary(data.counts);
    const mapped = mapPayloadToState(data);
    setScheduledRows(mapped.scheduledRows);
    setPendingArrivalRows(mapped.pendingArrivals);
    setPendingDepartureRows(mapped.pendingDepartures);
  }, []);

  useEffect(() => {
    void loadTerminalManagement();
  }, [loadTerminalManagement]);

  const confirmArrival = () => {};
  const rejectArrival = () => {};
  const confirmDeparture = () => {};
  const rejectDeparture = () => {};

  return (
    <div className="space-y-6 pb-6 pt-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Bus Arrival & Departure Management
          </h1>
          <p className="text-sm text-base-content/70">
            Core operational view for terminal admins: today&apos;s schedule,
            pending confirmations, and history.
          </p>
        </div>
        <span className="badge badge-outline">Terminal Operations</span>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-base-300 bg-base-100 p-4 shadow-sm">
          <div className="text-sm text-base-content/70">
            Scheduled buses for today
          </div>
          <div className="mt-2 text-3xl font-bold">
            {terminalManagementSummary.scheduled_buses_today}
          </div>
        </div>
        <div className="rounded-xl border border-base-300 bg-base-100 p-4 shadow-sm">
          <div className="text-sm text-base-content/70">
            Pending arrival confirmations
          </div>
          <div className="mt-2 text-3xl font-bold text-warning">
            {terminalManagementSummary.pending_arrival_confirmations}
          </div>
        </div>
        <div className="rounded-xl border border-base-300 bg-base-100 p-4 shadow-sm">
          <div className="text-sm text-base-content/70">
            Pending departure confirmations
          </div>
          <div className="mt-2 text-3xl font-bold text-info">
            {terminalManagementSummary.pending_departure_confirmations}
          </div>
        </div>
        <div className="rounded-xl border border-base-300 bg-base-100 p-4 shadow-sm">
          <div className="text-sm text-base-content/70">
            Currently present at terminal
          </div>
          <div className="mt-2 text-3xl font-bold text-success">
            {terminalManagementSummary.currently_present_at_terminal}
          </div>
        </div>
      </div>

      <ScheduledBusesForToday
        rows={scheduledRows}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <ArrivalConfirmation
          pendingArrivals={pendingArrivalRows}
          onConfirmArrival={confirmArrival}
          onRejectArrival={rejectArrival}
        />

        <DepartureConfirmation
          pendingDepartures={pendingDepartureRows}
          onConfirmDeparture={confirmDeparture}
          onRejectDeparture={rejectDeparture}
        />
      </div>

      <ConfirmationHistory entries={[]} />
    </div>
  );
}
