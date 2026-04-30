import { useMemo } from "react";
import type { ChartOptions } from "chart.js";
import { Bar } from "react-chartjs-2";

const barChartOptions: ChartOptions<"bar"> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    y: { beginAtZero: true, ticks: { precision: 0 } },
  },
};

type TerminalSnapshotProps = {
  presentCount: number;
  departedCount: number;
  mounted: boolean;
};

export default function TerminalSnapshot({
  presentCount,
  departedCount,
  mounted,
}: TerminalSnapshotProps) {
  const totalBuses = presentCount + departedCount;

  const barChartData = useMemo(
    () => ({
      labels: ["Present", "Departed"],
      datasets: [
        {
          label: "Buses",
          data: [presentCount, departedCount],
          backgroundColor: ["rgba(96, 206, 128, 0.70)", "rgba(21, 67, 96, 0.70)"],
          borderColor: ["rgba(96, 206, 128, 1)", "rgba(21, 67, 96, 1)"],
          borderWidth: 1.5,
          borderRadius: 6,
        },
      ],
    }),
    [presentCount, departedCount],
  );

  return (
    <div className="rounded-xl border border-base-300 bg-base-100 p-4 shadow-sm lg:col-span-1">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Terminal snapshot</h2>
        <span className="badge badge-sm badge-outline">{totalBuses} buses</span>
      </div>
      <div className="mt-3 h-64">
        {mounted ? (
          <Bar data={barChartData} options={barChartOptions} />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-sm text-base-content/60">
            Loading chart...
          </div>
        )}
      </div>
    </div>
  );
}