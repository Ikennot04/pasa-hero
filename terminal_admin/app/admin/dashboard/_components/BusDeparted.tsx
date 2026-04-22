"use client";

type BusDepartedType = {
  bus_number: string;
  route_name: string;
  created_at: string;
};

type BusDepartedProps = {
  departedBuses: BusDepartedType[];
};

const formatTime = (time: string) => {
  return new Date(time).toLocaleTimeString();
};

export default function BusDeparted({ departedBuses }: BusDepartedProps) {
  return (
    <div className="max-h-96 min-h-48 overflow-auto rounded-xl border border-base-300 bg-base-100 p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Buses that have departed</h2>
        <span className="badge badge-sm badge-warning text-[0.85rem]">
          {departedBuses.length}
        </span>
      </div>

      <div className="mt-3 overflow-x-auto">
        <table className="table table-zebra w-full">
          <thead>
            <tr>
              <th>Bus</th>
              <th>Route</th>
              <th>Departed</th>
            </tr>
          </thead>
          <tbody>
            {departedBuses.length ? (
              departedBuses.map((row, i) => (
                <tr key={i}>
                  <td className="font-semibold">{row.bus_number}</td>
                  <td>{row.route_name}</td>
                  <td>{row.created_at ? formatTime(row.created_at) : "-"}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={3}
                  className="text-center text-sm text-base-content/60"
                >
                  No departed buses recorded yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
