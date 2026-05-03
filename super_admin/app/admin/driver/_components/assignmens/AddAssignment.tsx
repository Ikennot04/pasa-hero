"use client";

import { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import {
  addAssignmentSchema,
  type AddAssignmentFormData,
} from "./addAssignmentSchema";
import type { DriverProps } from "../drivers/DriverProps";

// Options for dropdowns (match static data used in assignments)
const BUS_OPTIONS = [
  { id: "b1", bus_number: "BUS-101" },
  { id: "b2", bus_number: "BUS-102" },
  { id: "b3", bus_number: "BUS-103" },
  { id: "b4", bus_number: "BUS-104" },
  { id: "b5", bus_number: "BUS-105" },
];

const ROUTE_OPTIONS = [
  { id: "r1", route_name: "EDSA – Monumento to PITX" },
  { id: "r2", route_name: "Commonwealth – Fairview to SM North" },
  { id: "r3", route_name: "Quezon Ave – QC Circle to Quiapo" },
];

const OPERATOR_OPTIONS = [
  { id: "op1", name: "Carlos Reyes" },
  { id: "op2", name: "Elena Torres" },
  { id: "op3", name: "Miguel Santos" },
];

type AddAssignmentModalProps = {
  drivers: DriverProps[];
};

export default function AddAssignmentModal({ drivers }: AddAssignmentModalProps) {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AddAssignmentFormData>({
    resolver: yupResolver(addAssignmentSchema),
    defaultValues: {
      driver_id: "",
      bus_id: "",
      route_id: "",
      operator_user_id: "",
    },
  });

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open) {
      dialog.showModal();
    } else {
      dialog.close();
    }
    const onClose = () => setOpen(false);
    dialog.addEventListener("close", onClose);
    return () => dialog.removeEventListener("close", onClose);
  }, [open]);

  function openModal() {
    setOpen(true);
    reset({
      driver_id: "",
      bus_id: "",
      route_id: "",
      operator_user_id: "",
    });
  }

  function closeModal() {
    setOpen(false);
    reset();
  }

  async function onSubmit(data: AddAssignmentFormData) {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
      const token =
        typeof window !== "undefined"
          ? localStorage.getItem("super_admin_auth_token")
          : null;
      const res = await fetch(`${baseUrl}/api/bus-assignments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          bus_id: data.bus_id,
          driver_id: data.driver_id,
          route_id: data.route_id,
          operator_user_id: data.operator_user_id,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.message || "Failed to add assignment");
      }
      closeModal();
    } catch (err) {
      alert(
        err instanceof Error ? err.message : "Failed to add assignment",
      );
    }
  }

  return (
    <>
      <button type="button" className="btn bg-[#0062CA] text-white hover:bg-[#0062CA]/80" onClick={openModal}>
        Add new assignment
      </button>
      <dialog ref={dialogRef} className="modal" id="add_assignment_modal">
        <div className="modal-box">
          <h3 className="font-bold text-lg">Add new assignment</h3>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text">Driver</span>
              </label>
              <select
                className={`select select-bordered w-full ${errors.driver_id ? "select-error" : ""}`}
                {...register("driver_id")}
              >
                <option value="">Select driver</option>
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.f_name} {d.l_name}
                  </option>
                ))}
              </select>
              {errors.driver_id && (
                <p className="text-error text-sm mt-1">
                  {errors.driver_id.message}
                </p>
              )}
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text">Bus</span>
              </label>
              <select
                className={`select select-bordered w-full ${errors.bus_id ? "select-error" : ""}`}
                {...register("bus_id")}
              >
                <option value="">Select bus</option>
                {BUS_OPTIONS.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.bus_number}
                  </option>
                ))}
              </select>
              {errors.bus_id && (
                <p className="text-error text-sm mt-1">
                  {errors.bus_id.message}
                </p>
              )}
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text">Route</span>
              </label>
              <select
                className={`select select-bordered w-full ${errors.route_id ? "select-error" : ""}`}
                {...register("route_id")}
              >
                <option value="">Select route</option>
                {ROUTE_OPTIONS.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.route_name}
                  </option>
                ))}
              </select>
              {errors.route_id && (
                <p className="text-error text-sm mt-1">
                  {errors.route_id.message}
                </p>
              )}
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text">Operator name</span>
              </label>
              <select
                className={`select select-bordered w-full ${errors.operator_user_id ? "select-error" : ""}`}
                {...register("operator_user_id")}
              >
                <option value="">Select operator</option>
                {OPERATOR_OPTIONS.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
              {errors.operator_user_id && (
                <p className="text-error text-sm mt-1">
                  {errors.operator_user_id.message}
                </p>
              )}
            </div>
            <div className="modal-action">
              <button type="button" className="btn" onClick={closeModal}>
                Cancel
              </button>
              <button type="submit" className="btn bg-[#0062CA] text-white hover:bg-[#0062CA]/80" disabled={isSubmitting}>
                {isSubmitting ? "Adding…" : "Add assignment"}
              </button>
            </div>
          </form>
        </div>
        <form method="dialog" className="modal-backdrop" onSubmit={closeModal}>
          <button type="submit" aria-label="Close">
            close
          </button>
        </form>
      </dialog>
    </>
  );
}
