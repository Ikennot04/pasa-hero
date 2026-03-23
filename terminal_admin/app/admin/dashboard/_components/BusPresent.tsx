"use client";

type PresentRow = {
  id: string;
  busNumber: string;
  routeName: string;
  arrivedAt: string | null;
  departureState: string;
};

type BusPresentProps = {
  presentRows: PresentRow[];
  formatTime: (iso: string) => string;
};

export default function BusPresent({ presentRows, formatTime }: BusPresentProps) {
  return (
    <div className="rounded-xl border border-base-300 bg-base-100 p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Buses currently present</h2>
        <span className="badge badge-sm badge-success">{presentRows.length}</span>
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
            {presentRows.length ? (
              presentRows.map((row) => (
                <tr key={row.id}>
                  <td className="font-semibold">{row.busNumber}</td>
                  <td>{row.routeName}</td>
                  <td>{row.arrivedAt ? formatTime(row.arrivedAt) : "-"}</td>
                  <td>
                    <span className="badge badge-outline badge-success">{row.departureState}</span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="text-center text-sm text-base-content/60">
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
