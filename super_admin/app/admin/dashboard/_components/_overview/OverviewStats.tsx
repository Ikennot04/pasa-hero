import type { StatItem } from "./StatCard";
import { StatCard } from "./StatCard";

type OverviewStatsProps = {
  title?: string;
  stats: StatItem[];
};

export function OverviewStats({ title = "Overview", stats }: OverviewStatsProps) {
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
