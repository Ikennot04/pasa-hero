"use client";

import "./chart-register";
import { Bar } from "react-chartjs-2";
import type { ChartOptions } from "chart.js";
import { useEffect, useState } from "react";
import { ReportSection } from "./ReportSection";
import { useGetActiveBusPerRoute } from "../../_hooks/useGetActiveBusPerRoute";

export type ActiveBusPerRouteRecord = {
  route_id: string;
  route_code?: string;
  route_name: string;
  active_buses_count: number;
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

export function ActiveBusPerRouteReport() {
  const { getActiveBusPerRoute, error } = useGetActiveBusPerRoute();
  const [data, setData] = useState<ActiveBusPerRouteRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchActiveBusPerRoute = async () => {
      setIsLoading(true);
      const response = await getActiveBusPerRoute();
      
      if(response?.success){
        setData(response.data);
        setIsLoading(false);
      }
    };

    fetchActiveBusPerRoute();
  }, [getActiveBusPerRoute]);

  const chartData = {
    labels: data.map((d) => d.route_code),
    datasets: [
      {
        label: "Active Buses",
        data: data.map((d) => d.active_buses_count),
        backgroundColor: "rgba(108, 173, 223, 0.6)",
        borderColor: "rgba(108, 173, 223, 1)",
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
      {isLoading ? (
        <p className="text-sm text-base-content/70">Loading active buses per route...</p>
      ) : error ? (
        <p className="text-sm text-error">{error}</p>
      ) : data.length === 0 ? (
        <p className="text-sm text-base-content/70">No active bus route data found.</p>
      ) : (
      <div className="space-y-4">
        <div className="h-64">
          <Bar data={chartData} options={chartOptions} />
        </div>

        <div className="max-h-56 overflow-x-auto overflow-y-auto rounded-lg">
          <table className="table table-zebra">
            <thead className="sticky top-0 z-1 bg-base-100">
              <tr>
                <th>Route code</th>
                <th>Route name</th>
              </tr>
            </thead>
            <tbody>
              {data.map((route) => (
                <tr key={route.route_id} className="border-t">
                  <td className="px-4 py-2">{route.route_code}</td>
                  <td className="px-4 py-2">{route.route_name}</td>
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
