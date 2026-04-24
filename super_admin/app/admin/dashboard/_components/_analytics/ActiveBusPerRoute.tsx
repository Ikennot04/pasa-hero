"use client";

import "./chart-register";
import { Bar } from "react-chartjs-2";
import type { ChartOptions } from "chart.js";
import { ReportSection } from "./ReportSection";

export type ActiveBusPerRouteRecord = {
  routeId: string;
  routeCode?: string;
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
      <div className="space-y-4">
        <div className="h-64">
          <Bar data={chartData} options={chartOptions} />
        </div>

        <div className="overflow-x-auto rounded-lg">
          <table className="table">
            <thead>
              <tr>
                <th>Route code</th>
                <th>Route name</th>
              </tr>
            </thead>
            <tbody>
              {data.map((route) => (
                <tr key={route.routeId} className="border-t">
                  <td className="px-4 py-2">{route.routeCode ?? route.routeId}</td>
                  <td className="px-4 py-2">{route.routeName}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </ReportSection>
  );
}
