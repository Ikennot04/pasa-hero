"use client";

type BusPresentType = {
  bus_number: string;
  route_name: string;
  confirmed_at: string | null;
};

type BusPresentProps = {
  presentBuses: BusPresentType[];
};

const formatTime = (time: string) => {
  return new Date(time).toLocaleTimeString();
};

export default function BusPresent({ presentBuses }: BusPresentProps) {
  return (
    <div className="max-h-96 min-h-48 overflow-auto rounded-xl border border-base-300 bg-base-100 p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Buses currently present</h2>
        <span className="badge badge-sm badge-success text-[0.85rem]">
          {presentBuses.length}
        </span>
      </div>

      <div className="mt-3 overflow-x-auto">
        <table className="table table-zebra w-full">
          <thead>
            <tr>
              <th>Bus</th>
              <th>Route</th>
              <th>Arrived</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {presentBuses.length ? (
              presentBuses.map((row, i) => {
                return (
                  <tr key={i}>
                    <td className="font-semibold">{row.bus_number}</td>
                    <td>{row.route_name}</td>
                    <td>{row.confirmed_at ? formatTime(row.confirmed_at) : "-"}</td>
                    <td>
                      <span className="badge badge-outline badge-success">
                        {row.confirmed_at ? "Present" : "Waiting"}
                      </span>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td
                  colSpan={4}
                  className="text-center text-sm text-base-content/60"
                >
                  No buses are currently at the terminal.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
