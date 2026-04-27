"use client";

import { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import {
  addNotificationSchema,
  type AddNotificationFormData,
} from "./addNotificationSchema";
import type { NotificationScope } from "../NotificationProps";
import { usePostNotifications } from "../_hooks/usePostNotifications";

const TERMINAL_OPTIONS: { id: string; terminal_name: string }[] = [
  { id: "1", terminal_name: "PITX (Parañaque Integrated Terminal Exchange)" },
  { id: "2", terminal_name: "SM North EDSA" },
  { id: "3", terminal_name: "Monumento" },
  { id: "4", terminal_name: "Fairview" },
  { id: "5", terminal_name: "Tamiya Terminal" },
  { id: "6", terminal_name: "Pacific Terminal" },
];

const PRIORITY_OPTIONS = [
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
] as const;

const SCOPE_OPTIONS: { value: NotificationScope; label: string }[] = [
  { value: "terminal", label: "Terminal" },
  { value: "system", label: "System" },
];

type AddNotificationModalProps = {
  onCreated?: () => Promise<void> | void;
};

export default function AddNotificationModal({ onCreated }: AddNotificationModalProps) {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const { postNotifications, error: postNotificationError } = usePostNotifications();

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
      notification_type: "custom",
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
      notification_type: "custom",
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
      await postNotifications({
        title: data.title,
        message: data.message,
        notification_type: data.notification_type,
        priority: data.priority,
        scope: data.scope,
        bus_id: data.bus_id || null,
        route_id: data.route_id || null,
        terminal_id: data.terminal_id || null,
      });
      closeModal();
      await onCreated?.();
    } catch (err) {
      alert(
        err instanceof Error
          ? err.message
          : postNotificationError || "Failed to create notification"
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
            <input type="hidden" {...register("notification_type")} />
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
            <div className="grid grid-cols-1 gap-4">
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
