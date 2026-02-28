"use client";

import { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { addBusSchema, type AddBusFormData } from "./addBusSchema";

export default function AddBusModal() {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AddBusFormData>({
    resolver: yupResolver(addBusSchema),
    defaultValues: {
      bus_code: "",
      plate_number: "",
      maximum_capacity: undefined,
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
    reset();
  }

  function closeModal() {
    setOpen(false);
    reset();
  }

  async function onSubmit(data: AddBusFormData) {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
      const res = await fetch(`${baseUrl}/bus`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bus_number: data.bus_code,
          plate_number: data.plate_number,
          capacity: data.maximum_capacity,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.message || "Failed to add bus");
      }
      closeModal();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to add bus");
    }
  }

  return (
    <>
      <button type="button" className="btn" onClick={openModal}>
        Add bus
      </button>
      <dialog ref={dialogRef} className="modal">
        <div className="modal-box">
          <h3 className="font-bold text-lg">Add bus</h3>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text">Bus code</span>
              </label>
              <input
                type="text"
                placeholder="e.g. 01-AB"
                className={`input input-bordered w-full ${errors.bus_code ? "input-error" : ""}`}
                {...register("bus_code")}
              />
              {errors.bus_code && (
                <p className="text-error text-sm mt-1">
                  {errors.bus_code.message}
                </p>
              )}
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text">Plate number</span>
              </label>
              <input
                type="text"
                placeholder="e.g. ABC 1234"
                className={`input input-bordered w-full ${errors.plate_number ? "input-error" : ""}`}
                {...register("plate_number")}
              />
              {errors.plate_number && (
                <p className="text-error text-sm mt-1">
                  {errors.plate_number.message}
                </p>
              )}
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text">Maximum capacity</span>
              </label>
              <input
                type="number"
                min={1}
                max={999}
                placeholder="e.g. 45"
                className={`input input-bordered w-full ${errors.maximum_capacity ? "input-error" : ""}`}
                {...register("maximum_capacity", { valueAsNumber: true })}
              />
              {errors.maximum_capacity && (
                <p className="text-error text-sm mt-1">
                  {errors.maximum_capacity.message}
                </p>
              )}
            </div>
            <div className="modal-action">
              <button type="button" className="btn " onClick={closeModal}>
                Cancel
              </button>
              <button type="submit" className="btn" disabled={isSubmitting}>
                {isSubmitting ? "Adding…" : "Add bus"}
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
