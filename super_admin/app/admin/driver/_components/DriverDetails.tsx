"use client";

import { useEffect } from "react";
import type { DriverProps } from "../DriverProps";
import Link from "next/link";

type DriverDetailsProps = {
  driver: DriverProps | null;
};

export const DRIVER_DETAILS_MODAL_ID = "driver-details-modal";

function StatusBadge({ status }: { status: string }) {
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

function DriverDetailsContent({ driver }: { driver: DriverProps }) {
  const fullName = `${driver.f_name} ${driver.l_name}`.trim() || "—";
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
  const profileImageUrl = driver.profile_image
    ? driver.profile_image.startsWith("http")
      ? driver.profile_image
      : `${apiUrl}/${driver.profile_image}`.replace(/([^:]\/)\/+/g, "$1")
    : null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="md:col-span-1 flex flex-col items-center md:items-start">
        <div className="avatar placeholder">
          <div className="bg-neutral text-neutral-content rounded-full w-32 h-32">
            {profileImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- dynamic API URL for driver profile
              <img
                src={profileImageUrl}
                alt={fullName}
                className="object-cover w-full h-full rounded-full"
              />
            ) : (
              <span className="text-4xl">
                {driver.f_name?.[0] ?? "?"}
                {driver.l_name?.[0] ?? ""}
              </span>
            )}
          </div>
        </div>
        <div className="mt-4 flex flex-col items-center md:items-start w-full">
          <StatusBadge status={driver.status} />
        </div>
      </div>
      <div className="md:col-span-2 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="form-control">
            <label className="label py-0">
              <span className="label-text font-medium text-base-content/70">
                First name
              </span>
            </label>
            <p className="text-base font-medium mt-0.5">
              {driver.f_name || "—"}
            </p>
          </div>
          <div className="form-control">
            <label className="label py-0">
              <span className="label-text font-medium text-base-content/70">
                Last name
              </span>
            </label>
            <p className="text-base font-medium mt-0.5">
              {driver.l_name || "—"}
            </p>
          </div>
        </div>
        <div className="form-control">
          <label className="label py-0">
            <span className="label-text font-medium text-base-content/70">
              Full name
            </span>
          </label>
          <p className="text-base font-medium mt-0.5">{fullName}</p>
        </div>
        <div className="form-control">
          <label className="label py-0">
            <span className="label-text font-medium text-base-content/70">
              License number
            </span>
          </label>
          <p className="text-base font-medium mt-0.5">
            {driver.license_number || "—"}
          </p>
        </div>
        <div className="form-control">
          <label className="label py-0">
            <span className="label-text font-medium text-base-content/70">
              Contact number
            </span>
          </label>
          <p className="text-base font-medium mt-0.5">
            {driver.contact_number || "—"}
          </p>
        </div>
        <div className="form-control">
          <label className="label py-0">
            <span className="label-text font-medium text-base-content/70">
              Driver ID
            </span>
          </label>
          <p className="text-sm text-base-content/60 font-mono mt-0.5">
            {driver.id}
          </p>
        </div>
      </div>
    </div>
  );
}

type DriverDetailsModalProps = {
  driver: DriverProps | null;
  modalId?: string;
  onCloseModal?: () => void;
};

export function DriverDetailsModal({
  driver,
  modalId = DRIVER_DETAILS_MODAL_ID,
  onCloseModal,
}: DriverDetailsModalProps) {
  useEffect(() => {
    const el = document.getElementById(modalId) as HTMLDialogElement | null;
    if (!el) return;
    if (driver) {
      el.showModal();
    } else {
      el.close();
    }
    const onClose = () => onCloseModal?.();
    el.addEventListener("close", onClose);
    return () => el.removeEventListener("close", onClose);
  }, [driver, modalId, onCloseModal]);

  return (
    <dialog id={modalId} className="modal">
      <div className="modal-box flex flex-col max-h-[90vh] max-w-2xl">
        <h3 className="font-bold text-lg text-[#0062CA]">Driver Details</h3>
        {driver ? (
          <div className="overflow-y-auto py-4">
            <DriverDetailsContent driver={driver} />
          </div>
        ) : null}
        <div className="modal-action mt-0">
          <button
            type="button"
            className="btn"
            onClick={() => {
              (document.getElementById(modalId) as HTMLDialogElement)?.close();
              onCloseModal?.();
            }}
          >
            Close
          </button>
        </div>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button type="submit">close</button>
      </form>
    </dialog>
  );
}

export default function DriverDetails({ driver }: DriverDetailsProps) {
  if (!driver) {
    return (
      <div className="rounded-box border border-base-content/10 bg-base-100 p-8 text-center">
        <p className="text-base-content/60">No driver selected.</p>
        <Link href="/admin/driver" className="btn btn-sm mt-4">
          Back to drivers
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Driver Details</h1>
        <Link href="/admin/driver" className="btn btn-ghost btn-sm">
          ← Back to drivers
        </Link>
      </div>
      <div className="rounded-box border border-base-content/5 bg-base-100 overflow-hidden">
        <div className="p-6">
          <DriverDetailsContent driver={driver} />
        </div>
      </div>
    </div>
  );
}
