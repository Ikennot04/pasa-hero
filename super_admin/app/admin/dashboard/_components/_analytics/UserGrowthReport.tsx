"use client";

import "./chart-register";
import { Line } from "react-chartjs-2";
import type { ChartOptions } from "chart.js";
import { ReportSection } from "./ReportSection";

export type UserGrowthRecord = {
  month: string;
  totalUsers: number;
  newUsers: number;
  activeUsers: number;
};

const chartOptions: ChartOptions<"line"> = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: "index", intersect: false },
  plugins: {
    legend: { position: "top" },
  },
  scales: {
    y: { beginAtZero: true, title: { display: true, text: "Count" } },
  },
};

type Props = {
  data: UserGrowthRecord[];
};

export function UserGrowthReport({ data }: Props) {
  const chartData = {
    labels: data.map((d) => d.month),
    datasets: [
      {
        label: "Total users",
        data: data.map((d) => d.totalUsers),
        borderColor: "rgb(0, 98, 202)",
        backgroundColor: "rgba(0, 98, 202, 0.1)",
        fill: true,
        tension: 0.3,
      },
      {
        label: "New users",
        data: data.map((d) => d.newUsers),
        borderColor: "rgb(34, 197, 94)",
        tension: 0.3,
      },
      {
        label: "Active users",
        data: data.map((d) => d.activeUsers),
        borderColor: "rgb(124, 58, 237)",
        tension: 0.3,
      },
    ],
  };

  return (
    <ReportSection
      title="User growth trends"
      description="Monthly user count metrics"
    >
      <div className="h-64">
        <Line data={chartData} options={chartOptions} />
      </div>
    </ReportSection>
  );
}
