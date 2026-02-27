import { FaBus, FaRoute } from "react-icons/fa";
import { TbSteeringWheelFilled } from "react-icons/tb";
import { FaMapLocationDot } from "react-icons/fa6";

import {
  OverviewStats,
  LiveBusCount,
  RecentAlerts,
  TodayAssignments,
} from "./_components/_overview";
import type { StatItem } from "./_components/_overview";

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

// Overview stats ==================================================================
const STATS: StatItem[] = [
  { label: "Active Buses", value: 24, icon: FaBus, color: "text-blue-600" },
  { label: "Routes", value: 12, icon: FaRoute, color: "text-green-600" },
  {
    label: "Terminals",
    value: 8,
    icon: FaMapLocationDot,
    color: "text-amber-600",
  },
  {
    label: "Drivers",
    value: 32,
    icon: TbSteeringWheelFilled,
    color: "text-purple-600",
  },
];

const LIVE_BUS = { onRoad: 19, idle: 4, maintenance: 4 };

const ALERTS = [
  {
    id: 1,
    message: "Bus #12 delayed on Route 7 – traffic",
    priority: "high" as const,
  },
  {
    id: 2,
    message: "Terminal North: gate sensor offline",
    priority: "medium" as const,
  },
  {
    id: 3,
    message: "Driver shift #5 started 15 min late",
    priority: "low" as const,
  },
];

const TODAY_ASSIGNMENTS = {
  scheduled: 28,
  active: 18,
  completed: 8,
  cancelled: 2,
};

// Analytics & Reports ==================================================================
const ACTIVE_BUSES_PER_ROUTE = [
  { routeId: "R1", routeName: "Route A", activeBusCount: 4 },
  { routeId: "R2", routeName: "Route B", activeBusCount: 3 },
  { routeId: "R3", routeName: "Route C", activeBusCount: 5 },
  { routeId: "R4", routeName: "Route D", activeBusCount: 2 },
  { routeId: "R5", routeName: "Route E", activeBusCount: 3 },
  { routeId: "R6", routeName: "Route F", activeBusCount: 7 },
];

const ROUTE_PERFORMANCE = [
  {
    routeId: "R1",
    routeName: "Route A",
    avgDelayMinutes: 4,
    skippedStopsCount: 2,
  },
  {
    routeId: "R2",
    routeName: "Route B",
    avgDelayMinutes: 7,
    skippedStopsCount: 5,
  },
  {
    routeId: "R3",
    routeName: "Route C",
    avgDelayMinutes: 2,
    skippedStopsCount: 0,
  },
  {
    routeId: "R4",
    routeName: "Route D",
    avgDelayMinutes: 12,
    skippedStopsCount: 8,
  },
];

const TOTAL_OCCUPANCY_PER_ROUTE = [
  { routeCode: "R1", routeName:"Sample route name 1", totalAccupancy: 62 },
  { routeCode: "R2", routeName:"Sample route name 2", totalAccupancy: 58 },
  { routeCode: "R3", routeName:"Sample route name 3", totalAccupancy: 71 },
  { routeCode: "R4", routeName:"Sample route name 4", totalAccupancy: 69 },
  { routeCode: "R5", routeName:"Sample route name 5", totalAccupancy: 69 },
  { routeCode: "R6", routeName:"Sample route name 6", totalAccupancy: 69 },
];

const TOP_SUBSCRIBED_ROUTES = [
  { label: "Route A", subscriptions: 520 },
  { label: "Route C", subscriptions: 445 },
  { label: "Route F", subscriptions: 398 },
  { label: "Route B", subscriptions: 372 },
  { label: "Route D", subscriptions: 291 },
];

const TOP_SUBSCRIBED_BUSES = [
  { label: "Bus 12", subscriptions: 342 },
  { label: "Bus 08", subscriptions: 298 },
  { label: "Bus 15", subscriptions: 276 },
  { label: "Bus 05", subscriptions: 251 },
  { label: "Bus 22", subscriptions: 228 },
];

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
  return (
    <>
      {/* Overview stats */}
      <div className="space-y-6 pb-6">
        <OverviewStats stats={STATS} />
        <LiveBusCount data={LIVE_BUS} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RecentAlerts alerts={ALERTS} />
          <TodayAssignments data={TODAY_ASSIGNMENTS} />
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

        <ActiveBusPerRouteReport data={ACTIVE_BUSES_PER_ROUTE} />
        <RoutePerformanceReport data={ROUTE_PERFORMANCE} />
        <TotalOccupancyPerRouteReport data={TOTAL_OCCUPANCY_PER_ROUTE} />
        <Top5BusesAndRoutesReport routes={TOP_SUBSCRIBED_ROUTES} buses={TOP_SUBSCRIBED_BUSES} />
        <NotificationVolumeReport data={NOTIFICATION_VOLUME} />
        <UserGrowthReport data={USER_GROWTH} />
      </div>
    </>
  );
}
