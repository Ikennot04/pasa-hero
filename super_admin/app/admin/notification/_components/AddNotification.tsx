"use client";

import { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import {
  addNotificationSchema,
  type AddNotificationFormData,
} from "./addNotificationSchema";
import type { NotificationScope } from "../NotificationProps";

const TERMINAL_OPTIONS: { id: string; terminal_name: string }[] = [
  { id: "1", terminal_name: "PITX (Parañaque Integrated Terminal Exchange)" },
  { id: "2", terminal_name: "SM North EDSA" },
  { id: "3", terminal_name: "Monumento" },
  { id: "4", terminal_name: "Fairview" },
  { id: "5", terminal_name: "Tamiya Terminal" },
  { id: "6", terminal_name: "Pacific Terminal" },
];

const ROUTE_OPTIONS: { id: string; route_name: string }[] = [
  { id: "1", route_name: "PITX — SM North EDSA" },
  { id: "2", route_name: "SM North EDSA — Monumento" },
  { id: "3", route_name: "Monumento — Fairview" },
  { id: "4", route_name: "PITX — Monumento" },
  { id: "5", route_name: "Fairview — SM North EDSA" },
  { id: "6", route_name: "Tamiya — Pacific Terminal" },
  { id: "7", route_name: "PITX — Fairview (Express)" },
];

const BUS_OPTIONS: { id: string; bus_number: string }[] = [
  { id: "b1", bus_number: "01-AB" },
  { id: "b2", bus_number: "12C" },
  { id: "b3", bus_number: "13B" },
  { id: "b4", bus_number: "O1L" },
];

const NOTIFICATION_TYPE_OPTIONS = [
  { value: "delay", label: "Delay" },
  { value: "full", label: "Full (at capacity)" },
  { value: "skipped_stop", label: "Skipped stop" },
  { value: "info", label: "Info" },
] as const;

const PRIORITY_OPTIONS = [
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
] as const;

const SCOPE_OPTIONS: { value: NotificationScope; label: string }[] = [
  { value: "bus", label: "Bus" },
  { value: "route", label: "Route" },
  { value: "terminal", label: "Terminal" },
  { value: "system", label: "System" },
];

export default function AddNotificationModal() {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<AddNotificationFormData>({
    resolver: yupResolver(addNotificationSchema),
    mode: "onTouched",
    defaultValues: {
      title: "",
      message: "",
      notification_type: "info",
      priority: "medium",
      scope: "system",
      bus_id: null,
      route_id: null,
      terminal_id: null,
    },
  });

  const currentScope = watch("scope");

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

  useEffect(() => {
    if (!open) return;
    setValue("bus_id", null);
    setValue("route_id", null);
    setValue("terminal_id", null);
  }, [currentScope, open, setValue]);

  function openModal() {
    setOpen(true);
    reset({
      title: "",
      message: "",
      notification_type: "info",
      priority: "medium",
      scope: "system",
      bus_id: null,
      route_id: null,
      terminal_id: null,
    });
  }

  function closeModal() {
    setOpen(false);
    reset();
  }

  async function onSubmit(data: AddNotificationFormData) {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
      const res = await fetch(`${baseUrl}/notifications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: data.title,
          message: data.message,
          notification_type: data.notification_type,
          priority: data.priority,
          scope: data.scope,
          bus_id: data.bus_id || null,
          route_id: data.route_id || null,
          terminal_id: data.terminal_id || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.message || "Failed to create notification");
      }
      closeModal();
      window.location.reload();
    } catch (err) {
      alert(
        err instanceof Error ? err.message : "Failed to create notification"
      );
    }
  }

  return (
    <>
      <button type="button" className="btn" onClick={openModal}>
        Create notification
      </button>
      <dialog ref={dialogRef} className="modal">
        <div className="modal-box max-w-lg">
          <h3 className="font-bold text-lg">Create manual notification</h3>
          <p className="text-sm text-base-content/70 mt-1">
            Send a notification to users. Optionally target a bus, route, or terminal.
          </p>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text">Title</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Delay on PITX — SM North EDSA"
                className={`input input-bordered w-full ${errors.title ? "input-error" : ""}`}
                {...register("title")}
              />
              {errors.title && (
                <p className="text-error text-sm mt-1">{errors.title.message}</p>
              )}
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text">Message</span>
              </label>
              <textarea
                placeholder="Notification message..."
                rows={3}
                className={`textarea textarea-bordered w-full ${errors.message ? "textarea-error" : ""}`}
                {...register("message")}
              />
              {errors.message && (
                <p className="text-error text-sm mt-1">{errors.message.message}</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Type</span>
                </label>
                <select
                  className={`select select-bordered w-full ${errors.notification_type ? "select-error" : ""}`}
                  {...register("notification_type")}
                >
                  {NOTIFICATION_TYPE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                {errors.notification_type && (
                  <p className="text-error text-sm mt-1">
                    {errors.notification_type.message}
                  </p>
                )}
              </div>
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Priority</span>
                </label>
                <select
                  className={`select select-bordered w-full ${errors.priority ? "select-error" : ""}`}
                  {...register("priority")}
                >
                  {PRIORITY_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                {errors.priority && (
                  <p className="text-error text-sm mt-1">
                    {errors.priority.message}
                  </p>
                )}
              </div>
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text">Scope</span>
              </label>
              <select
                className={`select select-bordered w-full ${errors.scope ? "select-error" : ""}`}
                {...register("scope")}
              >
                {SCOPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              {errors.scope && (
                <p className="text-error text-sm mt-1">{errors.scope.message}</p>
              )}
            </div>

            {currentScope === "bus" && (
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Bus (optional)</span>
                </label>
                <select
                  className="select select-bordered w-full"
                  {...register("bus_id")}
                >
                  <option value="">— None —</option>
                  {BUS_OPTIONS.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.bus_number}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {currentScope === "route" && (
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Route (optional)</span>
                </label>
                <select
                  className="select select-bordered w-full"
                  {...register("route_id")}
                >
                  <option value="">— None —</option>
                  {ROUTE_OPTIONS.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.route_name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {currentScope === "terminal" && (
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Terminal (optional)</span>
                </label>
                <select
                  className="select select-bordered w-full"
                  {...register("terminal_id")}
                >
                  <option value="">— None —</option>
                  {TERMINAL_OPTIONS.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.terminal_name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="modal-action">
              <button type="button" className="btn" onClick={closeModal}>
                Cancel
              </button>
              <button
                type="submit"
                className="btn"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Creating…" : "Create notification"}
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
