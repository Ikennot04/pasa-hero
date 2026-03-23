"use client";

type DepartedRow = {
  id: string;
  busNumber: string;
  routeName: string;
  departedAt: string | null;
};

type BusDepartedProps = {
  departedRows: DepartedRow[];
  formatTime: (iso: string) => string;
};

export default function BusDeparted({ departedRows, formatTime }: BusDepartedProps) {
  return (
    <div className="rounded-xl border border-base-300 bg-base-100 p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Buses that have departed</h2>
        <span className="badge badge-sm badge-warning">{departedRows.length}</span>
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
            {departedRows.length ? (
              departedRows.map((row) => (
                <tr key={row.id}>
                  <td className="font-semibold">{row.busNumber}</td>
                  <td>{row.routeName}</td>
                  <td>{row.departedAt ? formatTime(row.departedAt) : "-"}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={3} className="text-center text-sm text-base-content/60">
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
