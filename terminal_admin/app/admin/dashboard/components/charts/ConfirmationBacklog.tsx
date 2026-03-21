import type { ChartData, ChartOptions } from "chart.js";
import { Doughnut } from "react-chartjs-2";

type ConfirmationBacklogProps = {
  pendingTotal: number;
  pendingArrivalCount: number;
  pendingDepartureCount: number;
  mounted: boolean;
  doughnutChartData: ChartData<"doughnut">;
  doughnutOptions: ChartOptions<"doughnut">;
};

export default function ConfirmationBacklog({
  pendingTotal,
  pendingArrivalCount,
  pendingDepartureCount,
  mounted,
  doughnutChartData,
  doughnutOptions,
}: ConfirmationBacklogProps) {
  return (
    <div className="rounded-xl border border-base-300 bg-base-100 p-4 shadow-sm lg:col-span-1">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Confirmation backlog</h2>
        <span className="badge badge-sm badge-warning">{pendingTotal} pending</span>
      </div>

      <div className="mt-3 h-64">
        {mounted ? (
          <Doughnut data={doughnutChartData} options={doughnutOptions} />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-sm text-base-content/60">
            Loading chart...
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center gap-4 flex-wrap">
        <span className="badge badge-outline badge-warning">Arrivals: {pendingArrivalCount}</span>
        <span className="badge badge-outline badge-primary">Departures: {pendingDepartureCount}</span>
      </div>
    </div>
  );
}