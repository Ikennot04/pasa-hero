"use client";

import { useState, useMemo } from "react";
import { DriverProps } from "./DriverProps";
import DriverTable from "./_components/DriverTable";
import AddDriverModal from "./_components/AddDriver";

// Static data for drivers (matches backend driver.model.js fields)
const DRIVERS_STATIC: DriverProps[] = [
  {
    id: "1",
    f_name: "Juan",
    l_name: "Dela Cruz",
    license_number: "DL-2024-001234",
    contact_number: "+63 912 345 6789",
    profile_image: "default.png",
    status: "active",
  },
  {
    id: "2",
    f_name: "Maria",
    l_name: "Santos",
    license_number: "DL-2024-005678",
    contact_number: "+63 917 654 3210",
    profile_image: "default.png",
    status: "active",
  },
  {
    id: "3",
    f_name: "Pedro",
    l_name: "Reyes",
    license_number: "DL-2023-009012",
    contact_number: "+63 918 111 2233",
    profile_image: "default.png",
    status: "active",
  },
  {
    id: "4",
    f_name: "Ana",
    l_name: "Garcia",
    license_number: "DL-2024-003456",
    contact_number: "+63 919 444 5566",
    profile_image: "default.png",
    status: "inactive",
  },
  {
    id: "5",
    f_name: "Roberto",
    l_name: "Mendoza",
    license_number: "DL-2023-007890",
    contact_number: "",
    profile_image: "default.png",
    status: "active",
  },
];

export default function Driver() {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredDrivers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return DRIVERS_STATIC;
    return DRIVERS_STATIC.filter(
      (d) =>
        d.f_name.toLowerCase().includes(q) ||
        d.l_name.toLowerCase().includes(q) ||
        d.license_number.toLowerCase().includes(q) ||
        (d.contact_number && d.contact_number.toLowerCase().includes(q)),
    );
  }, [searchQuery]);

  return (
    <div className="space-y-4 pt-6">
      <div className="text-xl font-bold">Drivers Management Table</div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="form-control w-64">
            <input
              type="text"
              placeholder="Search by name, license, contact..."
              className="input input-bordered w-full"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex items-end pb-2">
            <span className="text-sm text-base-content/70">
              Showing {filteredDrivers.length} of {DRIVERS_STATIC.length}{" "}
              drivers
            </span>
          </div>
        </div>
        <AddDriverModal />
      </div>
      <DriverTable drivers={filteredDrivers} />
      <div className="text-xl font-bold mt-10">Assignment Management Table</div>
    </div>
  );
}
