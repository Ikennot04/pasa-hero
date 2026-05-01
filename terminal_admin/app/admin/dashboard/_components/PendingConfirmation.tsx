"use client";

import { useState } from "react";
import { useConfirmTerminalLog } from "../_hooks/useConfirmTerminalLog";

type PendingConfirmationType = {
  terminal_log_id: string;
  bus_number: string;
  route_name: string;
  event_time: string;
};

type PendingConfirmationProps = {
  pendingTotal: number;
  pendingArrival: PendingConfirmationType[];
  pendingDeparture: PendingConfirmationType[];
  onConfirmSuccess?: () => void | Promise<void>;
  onConfirmToast?: (message: string) => void;
};

const formatTime = (time: string) => {
  return new Date(time).toLocaleTimeString();
};

export default function PendingConfirmation({
  pendingTotal,
  pendingArrival,
  pendingDeparture,
  onConfirmSuccess,
  onConfirmToast,
}: PendingConfirmationProps) {
  const { confirmTerminalLog } = useConfirmTerminalLog();
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);

  const handleConfirm = async (terminalLogId: string) => {
    setConfirmingId(terminalLogId);
    setLastError(null);
    try {
      const res = await confirmTerminalLog(terminalLogId);
      if (
        res &&
        typeof res === "object" &&
        "success" in res &&
        res.success === true
      ) {
        await onConfirmSuccess?.();
        const successMsg =
          "message" in res &&
          typeof (res as { message?: unknown }).message === "string"
            ? (res as { message: string }).message
            : "Event confirmed";
        onConfirmToast?.(successMsg);
      } else {
        const msg =
          res &&
          typeof res === "object" &&
          "message" in res &&
          typeof (res as { message?: unknown }).message === "string"
            ? (res as { message: string }).message
            : "Could not confirm";
        setLastError(msg);
      }
    } finally {
      setConfirmingId(null);
    }
  };

  return (
    <div className="max-h-180 min-h-80 overflow-auto rounded-xl border border-base-300 bg-base-100 p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Pending confirmations</h2>
        <span className="badge badge-sm badge-warning text-[0.85rem]">
          {pendingTotal} waiting
        </span>
      </div>

      {lastError ? (
        <div className="alert alert-error mt-3 py-2 text-sm" role="alert">
          {lastError}
        </div>
      ) : null}

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-info/30 bg-info/5 p-3">
          <div className="mb-2 flex items-center justify-between gap-2 rounded-md border border-info/30 bg-info/10 px-3 py-2">
            <h3 className="font-semibold text-info">Arrivals waiting</h3>
            <span className="badge badge-sm badge-info">
              {pendingArrival.length} pending
            </span>
          </div>
          <div className="mt-2 overflow-x-auto">
            <table className="table table-zebra w-full">
              <thead>
                <tr>
                  <th>Bus</th>
                  <th>Route</th>
                  <th>Time</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {pendingArrival.length ? (
                  pendingArrival.map((r) => (
                    <tr key={r.terminal_log_id}>
                      <td className="font-semibold">{r.bus_number}</td>
                      <td>{r.route_name}</td>
                      <td>{r.event_time ? formatTime(r.event_time) : "-"}</td>
                      <td className="text-right">
                        <button
                          type="button"
                          className={`btn btn-sm bg-[#0062CA] text-white ${confirmingId === r.terminal_log_id ? "loading" : ""}`}
                          disabled={confirmingId !== null}
                          onClick={() => handleConfirm(r.terminal_log_id)}
                        >
                          Confirm
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={4}
                      className="text-center text-sm text-base-content/60"
                    >
                      No pending arrivals
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-lg border border-warning/30 bg-warning/5 p-3">
          <div className="mb-2 flex items-center justify-between gap-2 rounded-md border border-warning/30 bg-warning/10 px-3 py-2">
            <h3 className="font-semibold text-warning">Departures waiting</h3>
            <span className="badge badge-sm badge-warning">
              {pendingDeparture.length} pending
            </span>
          </div>
          <div className="mt-2 overflow-x-auto">
            <table className="table table-zebra w-full">
              <thead>
                <tr>
                  <th>Bus</th>
                  <th>Route</th>
                  <th>Time</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {pendingDeparture.length ? (
                  pendingDeparture.map((r) => (
                    <tr key={r.terminal_log_id}>
                      <td className="font-semibold">{r.bus_number}</td>
                      <td>{r.route_name}</td>
                      <td>{r.event_time ? formatTime(r.event_time) : "-"}</td>
                      <td className="text-right">
                        <button
                          type="button"
                          className={`btn btn-sm bg-[#0062CA] text-white ${confirmingId === r.terminal_log_id ? "loading" : ""}`}
                          disabled={confirmingId !== null}
                          onClick={() => handleConfirm(r.terminal_log_id)}
                        >
                          Confirm
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={4}
                      className="text-center text-sm text-base-content/60"
                    >
                      No pending departures
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
