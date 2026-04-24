import { FaBus, FaRoute } from "react-icons/fa";
import { TbSteeringWheelFilled } from "react-icons/tb";
import { FaMapLocationDot } from "react-icons/fa6";
import { useMemo } from "react";

import type { StatItem } from "./StatCard";
import { StatCard } from "./StatCard";

export type DashboardSummaryStats = {
  active_buses?: number;
  active_routes?: number;
  active_terminals?: number;
  active_drivers?: number;
  live_bus_counts?: {
    on_road?: number;
    idle?: number;
    maintenance?: number;
  };
  total_bus_assignments?: {
    scheduled?: number;
    active?: number;
    completed?: number;
    cancelled?: number;
  };
};

type OverviewStatsProps = {
  title?: string;
  summary: DashboardSummaryStats | null;
};

export function OverviewStats({ title = "Overview", summary }: OverviewStatsProps) {
  const stats = useMemo<StatItem[]>(
    () => [
      {
        label: "Active Buses",
        value: summary?.active_buses ?? 0,
        icon: FaBus,
        color: "text-blue-600",
      },
      {
        label: "Routes",
        value: summary?.active_routes ?? 0,
        icon: FaRoute,
        color: "text-green-600",
      },
      {
        label: "Terminals",
        value: summary?.active_terminals ?? 0,
        icon: FaMapLocationDot,
        color: "text-amber-600",
      },
      {
        label: "Drivers",
        value: summary?.active_drivers ?? 0,
        icon: TbSteeringWheelFilled,
        color: "text-purple-600",
      },
    ],
    [summary],
  );

  return (
    <section>
      <h2 className="text-2xl font-bold mb-3">{title}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((item) => (
          <StatCard key={item.label} item={item} />
        ))}
      </div>
    </section>
  );
}
