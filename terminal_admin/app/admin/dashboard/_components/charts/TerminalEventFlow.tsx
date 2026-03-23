"use client";

import { useMemo } from "react";
import type { ChartOptions } from "chart.js";
import { Bar } from "react-chartjs-2";

const terminalEventsBarOptions: ChartOptions<"bar"> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    y: { beginAtZero: true, ticks: { precision: 0 } },
  },
};

type TerminalEventLike = {
  terminal_id: string;
  event_type:
    | "arrival_reported"
    | "arrival_confirmed"
    | "departure_reported"
    | "departure_confirmed";
};

type TerminalEventFlowProps = {
  mounted: boolean;
  notifications: TerminalEventLike[];
  terminalId: string;
};

export default function TerminalEventFlow({
  mounted,
  notifications,
  terminalId,
}: TerminalEventFlowProps) {
  const terminalEventsChartData = useMemo(() => {
    const terminalNotifications = notifications.filter((n) => n.terminal_id === terminalId);
    const eventCounts = {
      arrival_reported: 0,
      arrival_confirmed: 0,
      departure_reported: 0,
      departure_confirmed: 0,
    };

    for (const n of terminalNotifications) {
      eventCounts[n.event_type] += 1;
    }

    return {
      labels: [
        "Arrival reported",
        "Arrival confirmed",
        "Departure reported",
        "Departure confirmed",
      ],
      datasets: [
        {
          label: "Events",
          data: [
            eventCounts.arrival_reported,
            eventCounts.arrival_confirmed,
            eventCounts.departure_reported,
            eventCounts.departure_confirmed,
          ],
          backgroundColor: [
            "rgb(130, 128, 255, 0.50)",
            "rgb(128, 0, 0, 0.50)",
            "rgb(0, 119, 128, 0.50)",
            "rgb(57, 128, 0, 0.50)",
          ],
          borderColor: [
            "rgb(130, 128, 255)",
            "rgb(128, 0, 0)",
            "rgb(0, 119, 128)",
            "rgb(57, 128, 0)",
          ],
          borderWidth: 1.5,
          borderRadius: 6,
        },
      ],
    };
  }, [notifications, terminalId]);

  return (
    <div className="rounded-xl border border-base-300 bg-base-100 p-4 shadow-sm lg:col-span-1">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Terminal event flow</h2>
        <span className="badge badge-sm badge-outline">Arrival vs departure events</span>
      </div>
      <div className="mt-3 h-64">
        {mounted ? (
          <Bar data={terminalEventsChartData} options={terminalEventsBarOptions} />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-sm text-base-content/60">
            Loading chart...
          </div>
        )}
      </div>
    </div>
  );
}
