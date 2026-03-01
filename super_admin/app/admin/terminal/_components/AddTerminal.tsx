"use client";

import { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { addTerminalSchema, type AddTerminalFormData } from "./addTerminalSchema";

export default function AddTerminalModal() {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AddTerminalFormData>({
    resolver: yupResolver(addTerminalSchema),
    mode: "onTouched",
    defaultValues: {
      terminal_name: "",
      location_lat: undefined,
      location_lng: undefined,
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

  async function onSubmit(data: AddTerminalFormData) {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
      const res = await fetch(`${baseUrl}/terminals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          terminal_name: data.terminal_name,
          location_lat: data.location_lat,
          location_lng: data.location_lng,
          status: "active",
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.message || "Failed to add terminal");
      }
      closeModal();
      window.location.reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to add terminal");
    }
  }

  return (
    <>
      <button type="button" className="btn" onClick={openModal}>
        Add terminal
      </button>
      <dialog ref={dialogRef} className="modal">
        <div className="modal-box">
          <h3 className="font-bold text-lg">Add terminal</h3>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text">Terminal name</span>
              </label>
              <input
                type="text"
                placeholder="e.g. PITX"
                className={`input input-bordered w-full ${errors.terminal_name ? "input-error" : ""}`}
                {...register("terminal_name")}
              />
              {errors.terminal_name && (
                <p className="text-error text-sm mt-1">
                  {errors.terminal_name.message}
                </p>
              )}
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text">Latitude</span>
              </label>
              <input
                type="number"
                step="any"
                placeholder="e.g. 14.5547"
                className={`input input-bordered w-full ${errors.location_lat ? "input-error" : ""}`}
                {...register("location_lat", { valueAsNumber: true })}
              />
              {errors.location_lat && (
                <p className="text-error text-sm mt-1">
                  {errors.location_lat.message}
                </p>
              )}
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text">Longitude</span>
              </label>
              <input
                type="number"
                step="any"
                placeholder="e.g. 120.9842"
                className={`input input-bordered w-full ${errors.location_lng ? "input-error" : ""}`}
                {...register("location_lng", { valueAsNumber: true })}
              />
              {errors.location_lng && (
                <p className="text-error text-sm mt-1">
                  {errors.location_lng.message}
                </p>
              )}
            </div>
            <div className="modal-action">
              <button type="button" className="btn" onClick={closeModal}>
                Cancel
              </button>
              <button type="submit" className="btn" disabled={isSubmitting}>
                {isSubmitting ? "Adding…" : "Add terminal"}
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
