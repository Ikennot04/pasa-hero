"use client";

import "./chart-register";
import { Bar } from "react-chartjs-2";
import type { ChartOptions } from "chart.js";
import { ReportSection } from "./ReportSection";

export type ActiveBusPerRouteRecord = {
  routeId: string;
  routeName: string;
  activeBusCount: number;
};

const chartOptions: ChartOptions<"bar"> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: (ctx) => ` ${ctx.raw as number} active buses`,
      },
    },
  },
};

type Props = {
  data: ActiveBusPerRouteRecord[];
};

export function ActiveBusPerRouteReport({ data }: Props) {
  const chartData = {
    labels: data.map((d) => d.routeName),
    datasets: [
      {
        label: "Active Buses",
        data: data.map((d) => d.activeBusCount),
        backgroundColor: "rgb(28, 0, 167, 0.6)",
        borderColor: "rgb(28, 0, 167)",
        borderWidth: 1.5,
        borderRadius: 10,
      },
    ],
  };

  return (
    <ReportSection
      title="Active buses per route report"
      description="Number of active buses per route over the selected period"
    >
      <div className="h-64">
        <Bar data={chartData} options={chartOptions} />
      </div>
    </ReportSection>
  );
}
