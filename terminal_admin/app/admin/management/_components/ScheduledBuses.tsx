"use client";

export type BusDayStatus = "scheduled" | "arriving" | "present" | "departed";

export type ScheduledBusRow = {
  id: string;
  busNumber: string;
  routeName: string;
  conductor: string;
  driver: string;
  scheduledArrivalAt: string;
  status: BusDayStatus;
};

type ScheduledBusesProps = {
  rows: ScheduledBusRow[];
  statusFilter: BusDayStatus | "all";
  onStatusFilterChange: (v: BusDayStatus | "all") => void;
};

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusBadge(status: BusDayStatus) {
  if (status === "departed") return "badge-neutral";
  if (status === "present") return "badge-success";
  if (status === "arriving") return "badge-warning";
  return "badge-ghost";
}

export default function ScheduledBuses({
  rows,
  statusFilter,
  onStatusFilterChange,
}: ScheduledBusesProps) {
  const filtered =
    statusFilter === "all"
      ? rows
      : rows.filter((r) => r.status === statusFilter);

  return (
    <div className="rounded-xl border border-base-300 bg-base-100 p-4 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">
            Scheduled buses
          </h2>
          <p className="text-sm text-base-content/70">
            All trips scheduled for this terminal. Filter by
            operational status.
          </p>
        </div>
        <span className="badge badge-outline">
          {filtered.length} of {rows.length} shown
        </span>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {(
          [
            ["all", "All"],
            ["scheduled", "Scheduled"],
            ["arriving", "Arriving"],
            ["present", "Present"],
            ["departed", "Departed"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            className={`btn btn-sm text-sm ${statusFilter === value ? "bg-[#0062CA] text-white" : "btn-outline"}`}
            onClick={() => onStatusFilterChange(value)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="overflow-x-auto min-h-40 max-h-112">
        <table className="table table-zebra w-full min-w-[720px]">
          <thead>
            <tr>
              <th>Bus</th>
              <th>Route</th>
              <th>Driver / Conductor</th>
              <th>Scheduled arrival</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="text-center text-sm text-base-content/60"
                >
                  No buses match this status.
                </td>
              </tr>
            ) : (
              filtered.map((row) => (
                <tr key={row.id}>
                  <td className="font-semibold">{row.busNumber}</td>
                  <td>{row.routeName}</td>
                  <td>
                    {row.driver} / {row.conductor}
                  </td>
                  <td className="whitespace-nowrap">
                    {formatDateTime(row.scheduledArrivalAt)}
                  </td>
                  <td>
                    <span
                      className={`badge badge-outline capitalize ${statusBadge(row.status)}`}
                    >
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
