"use client";

import "./chart-register";
import { Line } from "react-chartjs-2";
import type { ChartOptions } from "chart.js";
import { ReportSection } from "./ReportSection";

export type NotificationVolumeRecord = {
  date: string;
  all: number;
  low: number;
  medium: number;
  high: number;
};

const chartOptions: ChartOptions<"line"> = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: "index", intersect: false },
  plugins: {
    legend: { position: "top" },
  },
  scales: {
    y: { beginAtZero: true, title: { display: true, text: "Volume" } },
  },
};

type Props = {
  data: NotificationVolumeRecord[];
};

export function NotificationVolumeReport({ data }: Props) {
  const chartData = {
    labels: data.map((d) => d.date),
    datasets: [
      {
        label: "Total",
        data: data.map((d) => d.all),
        borderColor: "rgba(38, 28, 193, 1)",
        backgroundColor: "rgba(38, 28, 193, 0.1)",
        fill: true,
        tension: 0.3,
      },
      {
        label: "Low",
        data: data.map((d) => d.low),
        borderColor: "rgba(156, 171, 132, 1)",
        tension: 0.3,
      },
      {
        label: "Medium",
        data: data.map((d) => d.medium),
        borderColor: "rgba(255, 170, 0, 1)",
        tension: 0.3,
      },
      {
        label: "High",
        data: data.map((d) => d.high),
        borderColor: "rgba(152, 4, 4, 1)",
        tension: 0.3,
      },
    ],
  };

  return (
    <ReportSection
      title="Notification volume over time"
      description="Daily notification volume by channel"
    >
      <div className="h-64">
        <Line data={chartData} options={chartOptions} />
      </div>
    </ReportSection>
  );
}
