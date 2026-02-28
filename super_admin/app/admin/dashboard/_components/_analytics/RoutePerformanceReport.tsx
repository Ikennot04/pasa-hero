"use client";

import "./chart-register";
import { Bar } from "react-chartjs-2";
import type { ChartOptions } from "chart.js";
import { ReportSection } from "./ReportSection";

export type RoutePerformanceRecord = {
  routeId: string;
  routeName: string;
  avgDelayMinutes: number;
  skippedStopsCount: number;
};

const chartOptions: ChartOptions<"bar"> = {
  indexAxis: "y" as const,
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: "top" },
  },
  scales: {
    x: { stacked: false, title: { display: true, text: "Minutes / Count" } },
  },
};

type Props = {
  data: RoutePerformanceRecord[];
};

export function RoutePerformanceReport({ data }: Props) {
  const chartData = {
    labels: data.map((d) => d.routeName),
    datasets: [
      {
        label: "Avg delay (min)",
        data: data.map((d) => d.avgDelayMinutes),
        backgroundColor: "rgba(255, 85, 38, 0.6)",
        borderColor: "rgba(255, 85, 38, 1)",
        borderWidth: 1.5,
        borderRadius: 5,
      },
      {
        label: "Skipped stops",
        data: data.map((d) => d.skippedStopsCount),
        backgroundColor: "rgba(57, 201, 170, 0.6)",
        borderColor: "rgba(57, 201, 170, 1)",
        borderWidth: 1.5,
        borderRadius: 5,
      },
    ],
  };

  return (
    <ReportSection
      title="Route performance report"
      description="Average delays and skipped stops frequency per route"
    >
      <div className="h-64 mb-4">
        <Bar data={chartData} options={chartOptions} />
      </div>
      <div className="overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>Route</th>
              <th>Avg delay (min)</th>
              <th>Skipped stops</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.routeId}>
                <td>{d.routeName}</td>
                <td>{d.avgDelayMinutes}</td>
                <td>{d.skippedStopsCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ReportSection>
  );
}
