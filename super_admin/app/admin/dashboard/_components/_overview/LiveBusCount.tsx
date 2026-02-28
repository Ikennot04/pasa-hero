export type LiveBusCountData = {
  onRoad: number;
  idle: number;
  maintenance: number;
};

type LiveBusCountProps = {
  data: LiveBusCountData;
  title?: string;
};

export function LiveBusCount({ data, title = "Live bus count" }: LiveBusCountProps) {
  const total = data.onRoad + data.idle + data.maintenance;
  const pct = (n: number) => (total > 0 ? (n / total) * 100 : 0);

  return (
    <section>
      <h2 className="text-lg font-semibold mb-3">{title}</h2>
      <div className="rounded-xl border border-base-300 bg-base-100 p-4 shadow-sm">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="bg-green-500/20 text-green-700 dark:text-green-400 px-3 py-1 rounded-full text-sm font-medium">
            On road: {data.onRoad}
          </span>
          <span className="bg-slate-500/20 text-slate-700 dark:text-slate-400 px-3 py-1 rounded-full text-sm font-medium">
            Idle: {data.idle}
          </span>
          <span className="bg-amber-500/20 text-amber-700 dark:text-amber-400 px-3 py-1 rounded-full text-sm font-medium">
            Maintenance: {data.maintenance}
          </span>
        </div>
        <div className="mt-3 h-2 w-full rounded-full bg-base-300 overflow-hidden flex">
          <div
            className="h-full bg-green-500"
            style={{ width: `${pct(data.onRoad)}%` }}
          />
          <div
            className="h-full bg-slate-500"
            style={{ width: `${pct(data.idle)}%` }}
          />
          <div
            className="h-full bg-amber-500"
            style={{ width: `${pct(data.maintenance)}%` }}
          />
        </div>
        <p className="mt-1 text-sm text-base-content/60">Total: {total} buses</p>
      </div>
    </section>
  );
}
