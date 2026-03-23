"use client";

import { yupResolver } from "@hookform/resolvers/yup";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";

import {
  addTerminalNotificationSchema,
  type AddTerminalNotificationForm,
} from "../addTerminalNotificationSchema";
import {
  MOCK_TERMINAL_SENDER_ID,
  TERMINAL_BUS_OPTIONS,
  TERMINAL_ROUTE_OPTIONS,
  type NotificationFields,
  type NotificationTargetScope,
} from "../terminalBroadcastCatalog";
import { DEFAULT_TERMINAL_ID } from "../terminalNotificationsMock";

const TYPE_OPTIONS = [
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

const SCOPE_OPTIONS: { value: NotificationTargetScope; label: string }[] = [
  { value: "terminal", label: "Entire terminal" },
  { value: "route", label: "Specific route" },
  { value: "bus", label: "Specific bus" },
];

type Props = {
  onCreated: (n: NotificationFields) => void;
};

export default function CreateNotificationModal({ onCreated }: Props) {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<AddTerminalNotificationForm>({
    resolver: yupResolver(addTerminalNotificationSchema),
    mode: "onTouched",
    defaultValues: {
      title: "",
      message: "",
      notification_type: "info",
      priority: "medium",
      target_scope: "terminal",
      route_id: "",
      bus_id: "",
    },
  });

  const targetScope = watch("target_scope");

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (open) el.showModal();
    else el.close();
    const onClose = () => setOpen(false);
    el.addEventListener("close", onClose);
    return () => el.removeEventListener("close", onClose);
  }, [open]);

  useEffect(() => {
    if (targetScope === "terminal") {
      setValue("route_id", "");
      setValue("bus_id", "");
    }
    if (targetScope === "route") setValue("bus_id", "");
    if (targetScope === "bus") setValue("route_id", "");
  }, [targetScope, setValue]);

  function openModal() {
    reset({
      title: "",
      message: "",
      notification_type: "info",
      priority: "medium",
      target_scope: "terminal",
      route_id: "",
      bus_id: "",
    });
    setOpen(true);
  }

  function onSubmit(data: AddTerminalNotificationForm) {
    const route_id =
      data.target_scope === "route" ? data.route_id || null : null;
    const bus_id = data.target_scope === "bus" ? data.bus_id || null : null;
    const scope = data.target_scope;
    const now = new Date().toISOString();

    const next: NotificationFields = {
      id: `sent-${crypto.randomUUID()}`,
      sender_id: MOCK_TERMINAL_SENDER_ID,
      terminal_id: DEFAULT_TERMINAL_ID,
      bus_id,
      route_id,
      title: data.title.trim(),
      message: data.message.trim(),
      notification_type: data.notification_type,
      priority: data.priority,
      scope,
      createdAt: now,
      updatedAt: now,
    };

    onCreated(next);
    setOpen(false);
  }

  return (
    <>
      <button type="button" className="btn bg-[#0062CA] text-white" onClick={openModal}>
        Create notification
      </button>

      <dialog ref={dialogRef} className="modal">
        <div className="modal-box max-w-lg">
          <h3 className="font-bold text-lg">New notification</h3>

          <form className="mt-4 space-y-3" onSubmit={handleSubmit(onSubmit)}>
            <label className="form-control w-full">
              <span className="label-text  font-medium">Title</span>
              <input
                type="text"
                className={`input input-bordered w-full ${errors.title ? "input-error" : ""}`}
                placeholder="e.g. Terminal temporarily closed — Gate A"
                {...register("title")}
              />
              {errors.title ? (
                <span className="label-text-alt text-error">
                  {errors.title.message}
                </span>
              ) : null}
            </label>

            <label className="form-control w-full">
              <span className="label-text  font-medium">Message</span>
              <textarea
                className={`textarea textarea-bordered w-full min-h-24 ${errors.message ? "textarea-error" : ""}`}
                placeholder="Clear instructions for riders and staff…"
                {...register("message")}
              />
              {errors.message ? (
                <span className="label-text-alt text-error">
                  {errors.message.message}
                </span>
              ) : null}
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="form-control w-full">
                <span className="label-text font-medium">
                  notification_type
                </span>
                <select
                  className="select select-bordered w-full"
                  {...register("notification_type")}
                >
                  {TYPE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="form-control w-full">
                <span className="label-text font-medium">priority</span>
                <select
                  className="select select-bordered w-full"
                  {...register("priority")}
                >
                  {PRIORITY_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="form-control w-full">
              <span className="label-text font-medium">Scope</span>
              <select
                className="select select-bordered w-full"
                {...register("target_scope")}
              >
                {SCOPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>

            {targetScope === "route" ? (
              <label className="form-control w-full">
                <span className="label-text text-sm font-medium">
                  route_id (select)
                </span>
                <select
                  className={`select select-bordered select-sm w-full ${errors.route_id ? "select-error" : ""}`}
                  {...register("route_id")}
                >
                  <option value="">Select route…</option>
                  {TERMINAL_ROUTE_OPTIONS.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
                {errors.route_id ? (
                  <span className="label-text-alt text-error">
                    {errors.route_id.message}
                  </span>
                ) : null}
              </label>
            ) : null}

            {targetScope === "bus" ? (
              <label className="form-control w-full">
                <span className="label-text text-xs font-medium">
                  bus_id (select)
                </span>
                <select
                  className={`select select-bordered select-sm w-full ${errors.bus_id ? "select-error" : ""}`}
                  {...register("bus_id")}
                >
                  <option value="">Select bus…</option>
                  {TERMINAL_BUS_OPTIONS.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.bus_number}
                    </option>
                  ))}
                </select>
                {errors.bus_id ? (
                  <span className="label-text-alt text-error">
                    {errors.bus_id.message}
                  </span>
                ) : null}
              </label>
            ) : null}

            <div className="modal-action flex-wrap gap-2">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setOpen(false)}
              >
                Cancel
              </button>
              <button type="submit" className="btn bg-[#0062CA] text-white">
                Send notification
              </button>
            </div>
          </form>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button type="submit" aria-label="Close">
            close
          </button>
        </form>
      </dialog>
    </>
  );
}
