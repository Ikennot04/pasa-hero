import { useMemo } from "react";
import type { ChartOptions } from "chart.js";
import { Doughnut } from "react-chartjs-2";

const doughnutChartOptions: ChartOptions<"doughnut"> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { position: "bottom" } },
  cutout: "62%",
};

type ConfirmationBacklogProps = {
  pendingTotal: number;
  pendingArrivalCount: number;
  pendingDepartureCount: number;
  mounted: boolean;
};

export default function ConfirmationBacklog({
  pendingTotal,
  pendingArrivalCount,
  pendingDepartureCount,
  mounted,
}: ConfirmationBacklogProps) {
  const doughnutChartData = useMemo(
    () => ({
      labels: ["Arrival confirmations", "Departure confirmations"],
      datasets: [
        {
          data: [pendingArrivalCount, pendingDepartureCount],
          backgroundColor: [
            "rgba(96, 206, 128, 0.70)",
            "rgba(21, 67, 96, 0.70)",
          ],
          borderColor: ["rgba(96, 206, 128, 1)", "rgba(21, 67, 96, 1)"],
          borderWidth: 1.5,
        },
      ],
    }),
    [pendingArrivalCount, pendingDepartureCount],
  );

  return (
    <div className="rounded-xl border border-base-300 bg-base-100 p-4 shadow-sm lg:col-span-1">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Confirmation backlog</h2>
        <span className="text-[0.85rem] font-semibold">
          {pendingTotal} pending
        </span>
      </div>

      <div className="mt-3 h-64">
        {mounted ? (
          <Doughnut data={doughnutChartData} options={doughnutChartOptions} />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-sm text-base-content/60">
            Loading chart...
          </div>
        )}
      </div>
    </div>
  );
}
