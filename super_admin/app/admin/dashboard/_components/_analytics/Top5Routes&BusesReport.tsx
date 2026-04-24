"use client";

import "./chart-register";
import { Bar } from "react-chartjs-2";
import type { ChartOptions } from "chart.js";
import { useEffect, useState } from "react";
import { ReportSection } from "./ReportSection";
import { useGetTopSubscribed } from "../../_hooks/useGetTopSubscribed";

export type TopSubscribedItem = {
  label: string;
  subscriptions: number;
};

type TopRouteRow = {
  route_id: string;
  route_name: string | null;
  route_code: string | null;
  subscription_count: number;
};

type TopBusRow = {
  bus_id: string;
  bus_number: string | null;
  plate_number: string | null;
  subscription_count: number;
};

function toRouteChartItem(row: TopRouteRow): TopSubscribedItem {
  const label =
    row.route_code?.trim() ||
    row.route_name?.trim() ||
    String(row.route_id);
  return { label, subscriptions: row.subscription_count };
}

function toBusChartItem(row: TopBusRow): TopSubscribedItem {
  const label =
    row.bus_number?.trim() ||
    row.plate_number?.trim() ||
    String(row.bus_id);
  return { label, subscriptions: row.subscription_count };
}

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

export function Top5BusesAndRoutesReport() {
  const { getTopSubscribed, error } = useGetTopSubscribed();
  const [routes, setRoutes] = useState<TopSubscribedItem[]>([]);
  const [buses, setBuses] = useState<TopSubscribedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTopSubscribed = async () => {
      setIsLoading(true);
      const response = await getTopSubscribed();
      if (response?.success && response.data) {
        const { top_routes = [], top_buses = [] } = response.data as {
          top_routes?: TopRouteRow[];
          top_buses?: TopBusRow[];
        };
        setRoutes(top_routes.map(toRouteChartItem));
        setBuses(top_buses.map(toBusChartItem));
      }
      setIsLoading(false);
    };

    fetchTopSubscribed();
  }, [getTopSubscribed]);

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
      {isLoading ? (
        <p className="text-sm text-base-content/70">Loading top subscriptions...</p>
      ) : error ? (
        <p className="text-sm text-error">{error}</p>
      ) : routes.length === 0 && buses.length === 0 ? (
        <p className="text-sm text-base-content/70">No subscription data found.</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-semibold mb-2">Top 5 routes</h3>
            <div className="h-64">
              {routes.length === 0 ? (
                <p className="text-sm text-base-content/70">No route subscriptions yet.</p>
              ) : (
                <Bar data={routeChartData} options={buildBarOptions("Route")} />
              )}
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold mb-2">Top 5 buses</h3>
            <div className="h-64">
              {buses.length === 0 ? (
                <p className="text-sm text-base-content/70">No bus subscriptions yet.</p>
              ) : (
                <Bar data={busChartData} options={buildBarOptions("Bus")} />
              )}
            </div>
          </div>
        </div>
      )}
    </ReportSection>
  );
}
