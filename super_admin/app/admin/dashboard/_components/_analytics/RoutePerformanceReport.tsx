"use client";

import "./chart-register";
import { Bar } from "react-chartjs-2";
import type { ChartOptions } from "chart.js";
import { useEffect, useState } from "react";
import { ReportSection } from "./ReportSection";
import { useGetRoutesPerformance } from "../../_hooks/useGetRoutesPerformance";

export type RoutePerformanceRecord = {
  route_id: string;
  route_name: string;
  total_delay_count: number;
  total_full_count: number;
};

const chartOptions: ChartOptions<"bar"> = {
  indexAxis: "y" as const,
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: "top" },
  },
  scales: {
    x: { stacked: false, title: { display: true, text: "Count" } },
  },
};

export function RoutePerformanceReport() {
  const { getRoutesPerformance, error } = useGetRoutesPerformance();
  const [data, setData] = useState<RoutePerformanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchRoutePerformance = async () => {
      setIsLoading(true);
      const response = await getRoutesPerformance();

      if (response?.success) {
        setData(response.data ?? []);
      }

      setIsLoading(false);
    };

    fetchRoutePerformance();
  }, [getRoutesPerformance]);

  const chartData = {
    labels: data.map((d) => d.route_name),
    datasets: [
      {
        label: "Total delay count",
        data: data.map((d) => d.total_delay_count),
        backgroundColor: "rgb(108, 173, 223, 0.7)",
        borderColor: "rgb(108, 173, 223)",
        borderWidth: 1.5,
        borderRadius: 5,
      },
      {
        label: "Total full count",
        data: data.map((d) => d.total_full_count),
        backgroundColor: "rgb(129, 222, 118, 0.7)",
        borderColor: "rgb(129, 222, 118)",
        borderWidth: 1.5,
        borderRadius: 5,
      },
    ],
  };

  return (
    <ReportSection
      title="Route performance report"
      description="Total delay count and total full count per route"
    >
      {isLoading ? (
        <p className="text-sm text-base-content/70">Loading route performance...</p>
      ) : error ? (
        <p className="text-sm text-error">{error}</p>
      ) : data.length === 0 ? (
        <p className="text-sm text-base-content/70">No route performance data found.</p>
      ) : (
        <div className="space-y-4">
          <div className="h-108">
            <Bar data={chartData} options={chartOptions} />
          </div>
          <div className="max-h-56 overflow-x-auto overflow-y-auto rounded-lg">
            <table className="table table-zebra">
              <thead className="sticky top-0 z-1 bg-base-100">
                <tr>
                  <th>Route</th>
                  <th>Total delay count</th>
                  <th>Total full count</th>
                </tr>
              </thead>
              <tbody>
                {data.map((d) => (
                  <tr key={d.route_id}>
                    <td>{d.route_name}</td>
                    <td>{d.total_delay_count}</td>
                    <td>{d.total_full_count}</td>
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
