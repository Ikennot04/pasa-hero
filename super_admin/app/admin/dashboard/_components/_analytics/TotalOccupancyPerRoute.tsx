"use client";

import "./chart-register";
import { Bar } from "react-chartjs-2";
import type { ChartOptions } from "chart.js";
import { useEffect, useState } from "react";
import { ReportSection } from "./ReportSection";
import { useGetTotalOccupancyPerRoute } from "../../_hooks/useGetTotalOccupancyPerRoute";

export type TotalOccupancyPerRouteRecord = {
  route_id: string;
  route_name: string;
  route_code: string;
  total_occupancy_count: number;
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

export function TotalOccupancyPerRouteReport() {
  const { getTotalOccupancyPerRoute, error } = useGetTotalOccupancyPerRoute();
  const [data, setData] = useState<TotalOccupancyPerRouteRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchOccupancy = async () => {
      setIsLoading(true);
      const response = await getTotalOccupancyPerRoute();

      if (response?.success) {
        setData(response.data ?? []);
      }

      setIsLoading(false);
    };

    fetchOccupancy();
  }, [getTotalOccupancyPerRoute]);

  const chartData = {
    labels: data.map((d) => d.route_code),
    datasets: [
      {
        label: "Total Occupancy",
        data: data.map((d) => d.total_occupancy_count),
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
      description="Sum of passenger occupancy across active buses assigned to each route"
    >
      {isLoading ? (
        <p className="text-sm text-base-content/70">Loading occupancy by route...</p>
      ) : error ? (
        <p className="text-sm text-error">{error}</p>
      ) : data.length === 0 ? (
        <p className="text-sm text-base-content/70">No occupancy data found.</p>
      ) : (
        <div className="space-y-4">
          <div className="h-64">
            <Bar data={chartData} options={chartOptions} />
          </div>
          <div className="max-h-56 overflow-x-auto overflow-y-auto rounded-lg">
            <table className="table table-zebra">
              <thead className="sticky top-0 z-1 bg-base-100">
                <tr>
                  <th>Route Code</th>
                  <th>Route</th>
                  <th>Total Occupancy</th>
                </tr>
              </thead>
              <tbody>
                {data.map((d) => (
                  <tr key={String(d.route_id)}>
                    <td>{d.route_code}</td>
                    <td>{d.route_name}</td>
                    <td>{d.total_occupancy_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </ReportSection>
  );
}
