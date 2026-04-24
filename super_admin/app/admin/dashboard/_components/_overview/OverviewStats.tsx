 "use client";

import { useEffect, useMemo, useState } from "react";
import { FaBus, FaRoute } from "react-icons/fa";
import { FaMapLocationDot } from "react-icons/fa6";
import { TbSteeringWheelFilled } from "react-icons/tb";
import { useGetDashboardSummary } from "../../_hooks/useGetDashboardSummary";
import type { StatItem } from "./StatCard";
import { StatCard } from "./StatCard";

type OverviewStatsProps = {
  title?: string;
};

type DashboardSummary = {
  active_buses?: number;
  active_routes?: number;
  active_terminals?: number;
  active_drivers?: number;
};

export function OverviewStats({ title = "Overview" }: OverviewStatsProps) {
  const { getDashboardSummary } = useGetDashboardSummary();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);

  useEffect(() => {
    const fetchDashboardSummary = async () => {
      const response = await getDashboardSummary();
      if (response?.data) {
        setSummary(response.data as DashboardSummary);
      }
    };

    fetchDashboardSummary();
  }, [getDashboardSummary]);

  const stats: StatItem[] = useMemo(
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
