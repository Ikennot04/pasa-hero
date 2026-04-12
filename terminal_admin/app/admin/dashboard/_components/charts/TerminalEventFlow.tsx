"use client";

import { memo, useMemo } from "react";
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

type NotificationCounts = {
  arrival_confirmed: number;
  arrival_reported: number;
  departure_confirmed: number;
  departure_reported: number;
};

type TerminalEventFlowProps = {
  mounted: boolean;
  notificationCounts: NotificationCounts;
};

const EVENT_LABELS = [
  "Arrival reported",
  "Arrival confirmed",
  "Departure reported",
  "Departure confirmed",
];

const EVENT_BACKGROUND_COLORS = [
  "rgb(130, 128, 255, 0.50)",
  "rgb(128, 0, 0, 0.50)",
  "rgb(0, 119, 128, 0.50)",
  "rgb(57, 128, 0, 0.50)",
];

const EVENT_BORDER_COLORS = [
  "rgb(130, 128, 255)",
  "rgb(128, 0, 0)",
  "rgb(0, 119, 128)",
  "rgb(57, 128, 0)",
];

function areNotificationCountsEqual(
  prevCounts: NotificationCounts,
  nextCounts: NotificationCounts,
) {
  return (
    prevCounts.arrival_reported === nextCounts.arrival_reported &&
    prevCounts.arrival_confirmed === nextCounts.arrival_confirmed &&
    prevCounts.departure_reported === nextCounts.departure_reported &&
    prevCounts.departure_confirmed === nextCounts.departure_confirmed
  );
}

function TerminalEventFlow({ notificationCounts, mounted }: TerminalEventFlowProps) {
  const chartData = useMemo(
    () => ({
      labels: EVENT_LABELS,
      datasets: [
        {
          label: "Events",
          data: [
            notificationCounts.arrival_reported,
            notificationCounts.arrival_confirmed,
            notificationCounts.departure_reported,
            notificationCounts.departure_confirmed,
          ],
          backgroundColor: EVENT_BACKGROUND_COLORS,
          borderColor: EVENT_BORDER_COLORS,
          borderWidth: 1.5,
          borderRadius: 6,
        },
      ],
    }),
    [notificationCounts],
  );

  return (
    <div className="rounded-xl border border-base-300 bg-base-100 p-4 shadow-sm lg:col-span-1">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Terminal event flow</h2>
        <span className="badge badge-sm badge-outline text-[0.85rem]">
          Arrival vs departure events
        </span>
      </div>
      <div className="mt-3 h-64">
        {mounted ? (
          <Bar data={chartData} options={terminalEventsBarOptions} />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-sm text-base-content/60">
            Loading chart...
          </div>
        )}
      </div>
    </div>
  );
}

function arePropsEqual(prevProps: TerminalEventFlowProps, nextProps: TerminalEventFlowProps) {
  return (
    prevProps.mounted === nextProps.mounted &&
    areNotificationCountsEqual(
      prevProps.notificationCounts,
      nextProps.notificationCounts,
    )
  );
}

export default memo(TerminalEventFlow, arePropsEqual);
