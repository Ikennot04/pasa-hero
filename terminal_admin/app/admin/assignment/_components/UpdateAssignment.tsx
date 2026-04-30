"use client";

import { yupResolver } from "@hookform/resolvers/yup";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { MdOutlineEdit } from "react-icons/md";
import { addAssignmentSchema } from "./addAssignmentSchema";
import type {
  AssignmentFormData,
  AssignmentRow,
  DriverOption,
} from "./assignmentTypes";

const BUS_OPTIONS = [
  { id: "b1", bus_number: "BUS-101" },
  { id: "b2", bus_number: "BUS-102" },
  { id: "b3", bus_number: "BUS-103" },
  { id: "b4", bus_number: "BUS-104" },
  { id: "b5", bus_number: "BUS-105" },
];

const ROUTE_OPTIONS = [
  { id: "r1", route_name: "EDSA - Monumento to PITX" },
  { id: "r2", route_name: "Commonwealth - Fairview to SM North" },
  { id: "r3", route_name: "Quezon Ave - QC Circle to Quiapo" },
];

const OPERATOR_OPTIONS = [
  { id: "op1", name: "Carlos Reyes" },
  { id: "op2", name: "Elena Torres" },
  { id: "op3", name: "Miguel Santos" },
];

type UpdateAssignmentModalProps = {
  assignment: AssignmentRow;
  drivers: DriverOption[];
  onUpdated?: () => void;
};

export default function UpdateAssignmentModal({
  assignment,
  drivers,
  onUpdated,
}: UpdateAssignmentModalProps) {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AssignmentFormData>({
    resolver: yupResolver(addAssignmentSchema),
    defaultValues: {
      driver_id: assignment.driver_id,
      bus_id: assignment.bus_id,
      route_id: assignment.route_id,
      operator_user_id: assignment.operator_user_id,
    },
  });

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open) {
      dialog.showModal();
      reset({
        driver_id: assignment.driver_id,
        bus_id: assignment.bus_id,
        route_id: assignment.route_id,
        operator_user_id: assignment.operator_user_id,
      });
    } else {
      dialog.close();
    }
    const onClose = () => setOpen(false);
    dialog.addEventListener("close", onClose);
    return () => dialog.removeEventListener("close", onClose);
  }, [assignment, open, reset]);

  async function onSubmit(data: AssignmentFormData) {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
      const res = await fetch(`${baseUrl}/bus-assignments/${assignment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.message || "Failed to update assignment");
      }
      setOpen(false);
      onUpdated?.();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update assignment");
    }
  }

  return (
    <>
      <button type="button" className="btn btn-sm" onClick={() => setOpen(true)}>
        <MdOutlineEdit className="w-4 h-4" />
        Update
      </button>
      <dialog ref={dialogRef} className="modal">
        <div className="modal-box">
          <h3 className="font-bold text-lg">Update assignment</h3>
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
              {errors.driver_id ? (
                <p className="text-error text-sm mt-1">{errors.driver_id.message}</p>
              ) : null}
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
              {errors.bus_id ? (
                <p className="text-error text-sm mt-1">{errors.bus_id.message}</p>
              ) : null}
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
              {errors.route_id ? (
                <p className="text-error text-sm mt-1">{errors.route_id.message}</p>
              ) : null}
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
              {errors.operator_user_id ? (
                <p className="text-error text-sm mt-1">
                  {errors.operator_user_id.message}
                </p>
              ) : null}
            </div>

            <div className="modal-action">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setOpen(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn bg-[#0062CA] text-white hover:bg-[#0062CA]/80"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Saving..." : "Save changes"}
              </button>
            </div>
          </form>
        </div>
        <form
          method="dialog"
          className="modal-backdrop"
          onSubmit={() => setOpen(false)}
        >
          <button type="submit" aria-label="Close">
            close
          </button>
        </form>
      </dialog>
    </>
  );
}
