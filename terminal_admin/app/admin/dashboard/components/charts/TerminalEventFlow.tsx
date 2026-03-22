"use client";

import type { ChartData, ChartOptions } from "chart.js";
import { Bar } from "react-chartjs-2";

const terminalEventsBarOptions: ChartOptions<"bar"> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    y: { beginAtZero: true, ticks: { precision: 0 } },
  },
};

type TerminalEventFlowProps = {
  mounted: boolean;
  terminalEventsChartData: ChartData<"bar">;
};

export default function TerminalEventFlow({
  mounted,
  terminalEventsChartData,
}: TerminalEventFlowProps) {
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
