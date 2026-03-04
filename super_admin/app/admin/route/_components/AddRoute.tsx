"use client";

import { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { addRouteSchema, type AddRouteFormData } from "./addRouteSchema";

// Terminal options for dropdowns (ids align with backend/terminal static data)
const TERMINAL_OPTIONS: { id: string; terminal_name: string }[] = [
  { id: "1", terminal_name: "PITX (Parañaque Integrated Terminal Exchange)" },
  { id: "2", terminal_name: "SM North EDSA" },
  { id: "3", terminal_name: "Monumento" },
  { id: "4", terminal_name: "Fairview" },
  { id: "5", terminal_name: "Tamiya Terminal" },
  { id: "6", terminal_name: "Pacific Terminal" },
];

export default function AddRouteModal() {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AddRouteFormData>({
    resolver: yupResolver(addRouteSchema),
    mode: "onTouched",
    defaultValues: {
      route_name: "",
      route_code: "",
      start_terminal_id: "",
      end_terminal_id: "",
      estimated_duration: undefined,
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

  async function onSubmit(data: AddRouteFormData) {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
      const res = await fetch(`${baseUrl}/routes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          route_name: data.route_name,
          route_code: data.route_code,
          start_terminal_id: data.start_terminal_id,
          end_terminal_id: data.end_terminal_id,
          estimated_duration:
            data.estimated_duration != null ? data.estimated_duration : undefined,
          status: "active",
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.message || "Failed to add route");
      }
      closeModal();
      window.location.reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to add route");
    }
  }

  return (
    <>
      <button type="button" className="btn bg-[#0062CA] text-white hover:bg-[#0062CA]/80" onClick={openModal}>
        Add route
      </button>
      <dialog ref={dialogRef} className="modal">
        <div className="modal-box">
          <h3 className="font-bold text-lg">Add route</h3>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text">Route name</span>
              </label>
              <input
                type="text"
                placeholder="e.g. PITX — SM North EDSA"
                className={`input input-bordered w-full ${errors.route_name ? "input-error" : ""}`}
                {...register("route_name")}
              />
              {errors.route_name && (
                <p className="text-error text-sm mt-1">
                  {errors.route_name.message}
                </p>
              )}
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text">Route code</span>
              </label>
              <input
                type="text"
                placeholder="e.g. PITX-NEDSA"
                className={`input input-bordered w-full ${errors.route_code ? "input-error" : ""}`}
                {...register("route_code")}
              />
              {errors.route_code && (
                <p className="text-error text-sm mt-1">
                  {errors.route_code.message}
                </p>
              )}
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text">Start terminal</span>
              </label>
              <select
                className={`select select-bordered w-full ${errors.start_terminal_id ? "select-error" : ""}`}
                {...register("start_terminal_id")}
              >
                <option value="">Select start terminal</option>
                {TERMINAL_OPTIONS.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.terminal_name}
                  </option>
                ))}
              </select>
              {errors.start_terminal_id && (
                <p className="text-error text-sm mt-1">
                  {errors.start_terminal_id.message}
                </p>
              )}
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text">End terminal</span>
              </label>
              <select
                className={`select select-bordered w-full ${errors.end_terminal_id ? "select-error" : ""}`}
                {...register("end_terminal_id")}
              >
                <option value="">Select end terminal</option>
                {TERMINAL_OPTIONS.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.terminal_name}
                  </option>
                ))}
              </select>
              {errors.end_terminal_id && (
                <p className="text-error text-sm mt-1">
                  {errors.end_terminal_id.message}
                </p>
              )}
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text">Estimated duration (minutes)</span>
              </label>
              <input
                type="number"
                min={1}
                step={1}
                placeholder="e.g. 45"
                className={`input input-bordered w-full ${errors.estimated_duration ? "input-error" : ""}`}
                {...register("estimated_duration", { valueAsNumber: true })}
              />
              {errors.estimated_duration && (
                <p className="text-error text-sm mt-1">
                  {errors.estimated_duration.message}
                </p>
              )}
            </div>
            <div className="modal-action">
              <button type="button" className="btn" onClick={closeModal}>
                Cancel
              </button>
              <button type="submit" className="btn bg-[#0062CA] text-white hover:bg-[#0062CA]/80" disabled={isSubmitting}>
                {isSubmitting ? "Adding…" : "Add route"}
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
