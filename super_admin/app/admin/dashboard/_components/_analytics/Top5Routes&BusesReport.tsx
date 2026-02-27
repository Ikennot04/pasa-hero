"use client";

import "./chart-register";
import { Bar } from "react-chartjs-2";
import type { ChartOptions } from "chart.js";
import { ReportSection } from "./ReportSection";

export type TopSubscribedItem = {
  label: string;
  subscriptions: number;
};

const barColors = [
  { bg: "rgba(37, 1, 98, 0.7)", border: "rgb(37, 1, 98)" },
  { bg: "rgba(121, 69, 137, 0.7)", border: "rgb(121, 69, 137)" },
  { bg: "rgba(239, 232, 121, 0.7)", border: "rgb(239, 232, 121)" },
  { bg: "rgba(115, 207, 245, 0.7)", border: "rgb(115, 207, 245)" },
  { bg: "rgba(67, 102, 83, 0.7)", border: "rgb(67, 102, 83)" },
];

function buildBarOptions(yTitle: string): ChartOptions<"bar"> {
  return {
    indexAxis: "y",
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => `Subscriptions: ${ctx.raw}`,
        },
      },
    },
    scales: {
      x: {
        beginAtZero: true,
        title: { display: true, text: "Subscriptions" },  
        ticks: { stepSize: 1 },
      },
      y: {
        title: { display: true, text: yTitle },
      },
    },
  };
}

type Props = {
  routes: TopSubscribedItem[];
  buses: TopSubscribedItem[];
};

export function Top5BusesAndRoutesReport({ routes, buses }: Props) {
  const routeChartData = {
    labels: routes.map((d) => d.label),
    datasets: [
      {
        label: "Subscriptions",
        data: routes.map((d) => d.subscriptions),
        backgroundColor: routes.map((_, i) => barColors[i % barColors.length].bg),
        borderColor: routes.map((_, i) => barColors[i % barColors.length].border),
        borderWidth: 1.5,
        borderRadius: 5
      },
    ],
  };

  const busChartData = {
    labels: buses.map((d) => d.label),
    datasets: [
      {
        label: "Subscriptions",
        data: buses.map((d) => d.subscriptions),
        backgroundColor: buses.map((_, i) => barColors[i % barColors.length].bg),
        borderColor: buses.map((_, i) => barColors[i % barColors.length].border),
        borderWidth: 1.5,
        borderRadius: 5
      },
    ],
  };

  return (
    <ReportSection
      title="Top 5 most subscribed route and bus"
      description="Routes and buses with the highest subscription count"
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h3 className="text-sm font-semibold mb-2">Top 5 routes</h3>
          <div className="h-64">
            <Bar data={routeChartData} options={buildBarOptions("Route")} />
          </div>
        </div>
        <div>
          <h3 className="text-sm font-semibold mb-2">Top 5 buses</h3>
          <div className="h-64">
            <Bar data={busChartData} options={buildBarOptions("Bus")} />
          </div>
        </div>
      </div>
    </ReportSection>
  );
}
