"use client";

import { useMemo, useState } from "react";
import { DriverProps } from "./DriverProps";
import EditDriverModal, { EDIT_DRIVER_MODAL_ID } from "./EditDriver";
import { FaRegEye } from "react-icons/fa6";
import { useRouter } from "next/navigation";

const DEFAULT_PAGE_SIZE = 10;

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

type DriverTableProps = {
  drivers: DriverProps[];
  pageSize?: number;
  onDriverUpdated?: () => void | Promise<void>;
};

export default function DriverTable({
  drivers,
  pageSize = DEFAULT_PAGE_SIZE,
  onDriverUpdated,
}: DriverTableProps) {
  const router = useRouter();
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(drivers.length / pageSize));
  const activePage = Math.min(Math.max(1, page), totalPages);

  const pageDrivers = useMemo(() => {
    const start = (activePage - 1) * pageSize;
    return drivers.slice(start, start + pageSize);
  }, [drivers, activePage, pageSize]);

  const go = (next: number) => {
    setPage(Math.min(Math.max(1, next), totalPages));
  };

  const pageNumbers = useMemo(() => {
    const window = 2;
    const lo = Math.max(1, activePage - window);
    const hi = Math.min(totalPages, activePage + window);
    const nums: number[] = [];
    for (let p = lo; p <= hi; p++) nums.push(p);
    return nums;
  }, [activePage, totalPages]);

  return (
    <>
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
            {drivers.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="text-center text-base-content/60 py-8"
                >
                  No drivers found.
                </td>
              </tr>
            ) : (
              pageDrivers.map((driver, i) => (
                <tr key={driver.id}>
                  <th>{(activePage - 1) * pageSize + i + 1}</th>
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
                      className="btn"
                      onClick={() => router.push(`/admin/driver/${driver.id}`)}
                    >
                      <FaRegEye className="w-5 h-5" />
                      View
                    </button>
                    <EditDriverModal
                      driver={driver}
                      modalId={`${EDIT_DRIVER_MODAL_ID}-${driver.id}`}
                      onDriverUpdated={onDriverUpdated}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {drivers.length > 0 ? (
        <div className="flex flex-col items-stretch gap-3 border-t border-base-content/10 bg-base-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-base-content/70">
            {(activePage - 1) * pageSize + 1}–
            {Math.min(activePage * pageSize, drivers.length)} of {drivers.length}
          </p>
          <div className="join flex-wrap justify-center">
            <button
              type="button"
              className="btn join-item btn-sm"
              disabled={activePage <= 1}
              onClick={() => go(1)}
            >
              First
            </button>
            <button
              type="button"
              className="btn join-item btn-sm"
              disabled={activePage <= 1}
              onClick={() => go(activePage - 1)}
            >
              Prev
            </button>
            {pageNumbers.map((p) => (
              <button
                key={p}
                type="button"
                className={`btn join-item btn-sm ${p === activePage ? "btn-active" : ""}`}
                onClick={() => go(p)}
              >
                {p}
              </button>
            ))}
            <button
              type="button"
              className="btn join-item btn-sm"
              disabled={activePage >= totalPages}
              onClick={() => go(activePage + 1)}
            >
              Next
            </button>
            <button
              type="button"
              className="btn join-item btn-sm"
              disabled={activePage >= totalPages}
              onClick={() => go(totalPages)}
            >
              Last
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
