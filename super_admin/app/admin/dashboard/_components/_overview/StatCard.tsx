import type { ComponentType } from "react";

export type StatItem = {
  label: string;
  value: number;
  icon: ComponentType<{ className?: string }>;
  color: string;
};

type StatCardProps = {
  item: StatItem;
};

export function StatCard({ item }: StatCardProps) {
  const Icon = item.icon;
  return (
    <div className="rounded-xl border border-base-300 bg-base-100 p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-base-content/70 text-sm">{item.label}</span>
        <Icon className={`size-6 ${item.color}`} />
      </div>
      <p className="mt-2 text-2xl font-bold">{item.value}</p>
    </div>
  );
}
