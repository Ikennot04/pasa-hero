"use client";

import { useState } from "react";

export default function Display() {
  const [rowsPerPage, setRowsPerPage] = useState(25);

  return (
    <section className="rounded-xl border border-base-content/10 bg-base-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-base-content/10 bg-base-200/50">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-base-content/70">
          Display
        </h2>
      </div>
      <div className="p-5 space-y-4">
        <div className="form-control">
          <label className="label py-1 pr-2">
            <span className="label-text font-medium">Table rows per page</span>
          </label>
          <select
            className="select select-bordered select-sm w-full max-w-32"
            value={rowsPerPage}
            onChange={(e) => setRowsPerPage(Number(e.target.value))}
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      </div>
    </section>
  );
}
