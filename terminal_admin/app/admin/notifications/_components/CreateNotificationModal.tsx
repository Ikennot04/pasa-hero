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
  type NotificationFields,
} from "../terminalBroadcastCatalog";
import { DEFAULT_TERMINAL_ID } from "../terminalNotificationsMock";

const TYPE_OPTIONS = [
  { value: "info", label: "Info" },
  { value: "other", label: "Other" },
  { value: "custom", label: "Custom" },
] as const;

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

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (open) el.showModal();
    else el.close();
    const onClose = () => setOpen(false);
    el.addEventListener("close", onClose);
    return () => el.removeEventListener("close", onClose);
  }, [open]);

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
    const terminalAdminUserId = localStorage.getItem("terminal_admin_user_id")?.trim();
    const senderId = terminalAdminUserId || MOCK_TERMINAL_SENDER_ID;

    const payload = {
      sender_id: senderId,
      title: data.title.trim(),
      message: data.message.trim(),
      notification_type: data.notification_type,
      scope: "terminal",
      priority: "medium",
    };

    console.log("Notification form data:", payload);

    const now = new Date().toISOString();

    const next: NotificationFields = {
      id: `sent-${crypto.randomUUID()}`,
      sender_id: senderId,
      terminal_id: DEFAULT_TERMINAL_ID,
      bus_id: null,
      route_id: null,
      title: data.title.trim(),
      message: data.message.trim(),
      notification_type: data.notification_type,
      priority: "medium",
      scope: "terminal",
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

          <form
            className="mt-4 space-y-4"
            onSubmit={handleSubmit(onSubmit)}
          >
            <label className="form-control w-full">
              <span className="label-text  font-medium">Title</span>
              <input
                type="text"
                className={`input input-bordered w-full ${errors.title ? "input-error" : ""}`}
                placeholder="e.g. Terminal temporarily closed — Gate A"
                {...register("title")}
              />
              {errors.title ? (
                <div className="label-text-alt text-error">
                  {errors.title.message}
                </div>
              ) : null}
            </label>

            <label className="form-control w-full mt-4">
              <span className="label-text  font-medium">Message</span>
              <textarea
                className={`textarea textarea-bordered w-full min-h-24 ${errors.message ? "textarea-error" : ""}`}
                placeholder="Clear instructions for riders and staff…"
                {...register("message")}
              />
              {errors.message ? (
                <div className="label-text-alt text-error">
                  {errors.message.message}
                </div>
              ) : null}
            </label>

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

            <input type="hidden" {...register("priority")} value="medium" />
            <input type="hidden" {...register("target_scope")} value="terminal" />
            <input type="hidden" {...register("route_id")} value="" />
            <input type="hidden" {...register("bus_id")} value="" />

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
