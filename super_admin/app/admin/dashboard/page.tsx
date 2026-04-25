 "use client";

import { useEffect, useState } from "react";

import {
  OverviewStats,
  LiveBusCount,
  RecentAlerts,
  TotalAssignments,
} from "./_components/_overview";
import type { AlertItem, DashboardSummaryStats } from "./_components/_overview";
import { useGetDashboardSummary } from "./_hooks/useGetDashboardSummary";

// Analytics
import "./_components/_analytics/chart-register";
import {
  ActiveBusPerRouteReport,
  RoutePerformanceReport,
  TotalOccupancyPerRouteReport,
  Top5BusesAndRoutesReport,
} from "./_components/_analytics";

// Analytics & Reports ==================================================================

export default function Dashboard() {
  const { getDashboardSummary } = useGetDashboardSummary();
  const [dashboardSummary, setDashboardSummary] = useState<DashboardSummaryStats | null>(null);
  const liveBusData = {
    onRoad: dashboardSummary?.live_bus_counts?.on_road ?? 0,
    idle: dashboardSummary?.live_bus_counts?.idle ?? 0,
    maintenance: dashboardSummary?.live_bus_counts?.maintenance ?? 0,
  };
  const totalAssignmentsData = {
    scheduled: dashboardSummary?.total_bus_assignments?.scheduled ?? 0,
    active: dashboardSummary?.total_bus_assignments?.active ?? 0,
    completed: dashboardSummary?.total_bus_assignments?.completed ?? 0,
    cancelled: dashboardSummary?.total_bus_assignments?.cancelled ?? 0,
  };
  const recentAlertsData: AlertItem[] = (dashboardSummary?.latest_alerts ?? []).map(
    (alert, index) => {
      const priority: AlertItem["priority"] =
        alert.priority === "high" || alert.priority === "medium" || alert.priority === "low"
          ? alert.priority
          : "low";

      return {
        _id: alert._id ?? `alert-${index}`,
        title: alert.title ?? "Untitled alert",
        priority,
      };
    },
  );

  useEffect(() => {
    const fetchDashboardSummary = async () => {
      const response = await getDashboardSummary();
      if (response?.data) {
        setDashboardSummary(response.data);
      }
    };

    fetchDashboardSummary();
  }, [getDashboardSummary]);

  return (
    <>
      {/* Overview stats */}
      <div className="space-y-6 pb-6">
        <OverviewStats summary={dashboardSummary} />
        <LiveBusCount data={liveBusData} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RecentAlerts alerts={recentAlertsData} />
          <TotalAssignments data={totalAssignmentsData} />
        </div>
      </div>
      {/* Analytics & Reports */}
      <div className="space-y-6 pb-6 mt-6">
        <div className="analytics-page-header flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-2xl font-bold">Analytics & Reports</h1>
          <p className="text-base-content/70 text-sm max-w-xl">
            View bus utilization, route performance, driver assignments, and
            occupancy trends. Print any report to PDF.
          </p>
        </div>

        <ActiveBusPerRouteReport />
        <RoutePerformanceReport />
        <TotalOccupancyPerRouteReport />
        <Top5BusesAndRoutesReport />
      </div>
    </>
  );
}
