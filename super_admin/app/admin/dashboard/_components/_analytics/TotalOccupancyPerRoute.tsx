"use client";

import "./chart-register";
import { Bar } from "react-chartjs-2";
import type { ChartOptions } from "chart.js";
import { ReportSection } from "./ReportSection";

export type TotalOccupancyPerRouteRecord = {
  routeCode: string;
  routeName: string;
  totalAccupancy: number;
};

const chartOptions: ChartOptions<"bar"> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
  },
  scales: {
    y: { beginAtZero: true, title: { display: true, text: "Occupancy" } },
  },
};

type Props = {
  data: TotalOccupancyPerRouteRecord[];
};

export function TotalOccupancyPerRouteReport({ data }: Props) {
  const chartData = {
    labels: data.map((d) => d.routeName),
    datasets: [
      {
        label: "Total Occupancy",
        data: data.map((d) => d.totalAccupancy),
        backgroundColor: "rgba(0, 140, 117, 0.6)",
        borderColor: "rgba(0, 140, 117, 1)",
        borderWidth: 1.5,
        borderRadius: 10,
      },
    ],
  };

  return (
    <ReportSection
      title="Total occupancy per route"
      description="Total occupancy per route"
    >
      <div className="h-64 mb-4">
        <Bar data={chartData} options={chartOptions} />
      </div>
      <div className="overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>Route Code</th>
              <th>Route</th>
              <th>Total Occupancy</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.routeCode}>
                <td>{d.routeCode}</td>
                <td>{d.routeName}</td>
                <td>{d.totalAccupancy}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ReportSection>
  );
}
