"use client";

import { useState } from "react";
import { DriverProps } from "../DriverProps";
import EditDriverModal from "./EditDriver";
import { DriverDetailsModal } from "./DriverDetails";

function DriverStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: "badge-success",
    inactive: "badge-ghost",
  };
  return (
    <span className={`badge ${map[status] ?? "badge-ghost"}`}>
      {status}
    </span>
  );
}

export default function DriverTable({ drivers }: { drivers: DriverProps[] }) {
  const [editingDriver, setEditingDriver] = useState<DriverProps | null>(null);
  const [viewingDriver, setViewingDriver] = useState<DriverProps | null>(null);
  return (
    <div className="overflow-x-auto rounded-box border border-base-content/5 bg-base-100 max-h-220">
      <table className="table">
        <thead>
          <tr>
            <th className="w-10">#</th>
            <th>Name</th>
            <th>License #</th>
            <th>Contact</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {drivers.map((driver, i) => (
            <tr key={driver.id}>
              <th>{i + 1}</th>
              <td className="font-medium">
                {driver.f_name} {driver.l_name}
              </td>
              <td>{driver.license_number}</td>
              <td>{driver.contact_number || "—"}</td>
              <td>
                <DriverStatusBadge status={driver.status} />
              </td>
              <td className="flex gap-2">
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => setViewingDriver(driver)}
                >
                  View
                </button>
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => setEditingDriver(driver)}
                >
                  Edit
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <EditDriverModal
        driver={editingDriver}
        onCloseModal={() => setEditingDriver(null)}
      />
      <DriverDetailsModal
        driver={viewingDriver}
        onCloseModal={() => setViewingDriver(null)}
      />
    </div>
  );
}
