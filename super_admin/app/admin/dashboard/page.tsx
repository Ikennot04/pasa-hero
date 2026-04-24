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
  NotificationVolumeReport,
  UserGrowthReport,
} from "./_components/_analytics";

// Analytics & Reports ==================================================================

const NOTIFICATION_VOLUME = [
  { date: "Feb 15", all: 420, low: 280, medium: 90, high: 50 },
  { date: "Feb 16", all: 510, low: 340, medium: 110, high: 60 },
  { date: "Feb 17", all: 380, low: 250, medium: 80, high: 50 },
  { date: "Feb 18", all: 590, low: 400, medium: 130, high: 60 },
  { date: "Feb 19", all: 470, low: 310, medium: 100, high: 60 },
  { date: "Feb 20", all: 530, low: 350, medium: 120, high: 60 },
  { date: "Feb 21", all: 610, low: 410, medium: 140, high: 60 },
];

const USER_GROWTH = [
  { month: "Sep", totalUsers: 1200, newUsers: 180, activeUsers: 890 },
  { month: "Oct", totalUsers: 1450, newUsers: 220, activeUsers: 1050 },
  { month: "Nov", totalUsers: 1720, newUsers: 250, activeUsers: 1220 },
  { month: "Dec", totalUsers: 2100, newUsers: 320, activeUsers: 1580 },
  { month: "Jan", totalUsers: 2480, newUsers: 280, activeUsers: 1890 },
  { month: "Feb", totalUsers: 2850, newUsers: 350, activeUsers: 2210 },
];

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
            View bus utilization, route performance, driver assignments,
            occupancy trends, notifications, and user growth. Print any report
            to PDF.
          </p>
        </div>

        <ActiveBusPerRouteReport />
        <RoutePerformanceReport />
        <TotalOccupancyPerRouteReport />
        <Top5BusesAndRoutesReport />
        <NotificationVolumeReport data={NOTIFICATION_VOLUME} />
        <UserGrowthReport data={USER_GROWTH} />
      </div>
    </>
  );
}
