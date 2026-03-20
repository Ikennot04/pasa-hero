import type { ChartData, ChartOptions } from "chart.js";
import { Bar } from "react-chartjs-2";

type TerminalSnapshotProps = {
  totalBuses: number;
  mounted: boolean;
  barChartData: ChartData<"bar">;
  barOptions: ChartOptions<"bar">;
};

export default function TerminalSnapshot({
  totalBuses,
  mounted,
  barChartData,
  barOptions,
}: TerminalSnapshotProps) {
  return (
    <div className="rounded-xl border border-base-300 bg-base-100 p-4 shadow-sm lg:col-span-1">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Terminal snapshot</h2>
        <span className="badge badge-sm badge-outline">{totalBuses} buses</span>
      </div>
      <div className="mt-3 h-64">
        {mounted ? (
          <Bar data={barChartData} options={barOptions} />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-sm text-base-content/60">
            Loading chart...
          </div>
        )}
      </div>
    </div>
  );
}