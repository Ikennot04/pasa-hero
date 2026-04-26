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
    setValue,
    watch,
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

  const startTerminalValue = watch("start_terminal_id");
  const endTerminalValue = watch("end_terminal_id");

  function resolveTerminalId(value: string) {
    const normalized = value.trim().toLowerCase();
    if (!normalized) return "";

    const match = TERMINAL_OPTIONS.find((t) => {
      const terminalName = t.terminal_name.toLowerCase();
      return (
        t.id.toLowerCase() === normalized ||
        terminalName === normalized ||
        terminalName.includes(normalized)
      );
    });

    return match?.id ?? value.trim();
  }

  useEffect(() => {
    const generatedRouteName =
      startTerminalValue.trim() && endTerminalValue.trim()
        ? `${startTerminalValue.trim()} - ${endTerminalValue.trim()}`
        : "";
    setValue("route_name", generatedRouteName, { shouldValidate: false });
  }, [endTerminalValue, setValue, startTerminalValue]);

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
          start_terminal_id: resolveTerminalId(data.start_terminal_id),
          end_terminal_id: resolveTerminalId(data.end_terminal_id),
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
        <div className="modal-box max-w-[500px] rounded-md p-5">
          <h3 className="text-xl font-semibold text-[#222222]">Add route</h3>
          <p className="mt-1 text-sm text-[#6B7280]">
            Create a new route profile with core operational details.
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-3">
            <input type="hidden" {...register("route_name")} />

            <section className="rounded-md border border-[#E5E7EB] p-3.5">
              <h4 className="text-sm font-semibold text-[#4B5563]">Route identity</h4>
              <div className="mt-3">
                <label className="mb-1.5 block text-base font-medium text-[#2D2D2D]">Route code</label>
                <input
                  type="text"
                  placeholder="e.g. PITX-QC-05"
                  className={`input input-bordered h-10 min-h-10 w-full rounded-md text-sm ${errors.route_code ? "input-error" : ""}`}
                  {...register("route_code")}
                />
                {errors.route_code && <p className="mt-1 text-sm text-error">{errors.route_code.message}</p>}
              </div>
            </section>

            <section className="rounded-md border border-[#E5E7EB] p-3.5">
              <h4 className="text-sm font-semibold text-[#4B5563]">Route coverage</h4>
              <div className="mt-3 grid grid-cols-1 gap-2.5 md:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-base font-medium text-[#2D2D2D]">Start route</label>
                  <input
                    type="text"
                    placeholder="e.g. PITX"
                    className={`input input-bordered h-10 min-h-10 w-full rounded-md text-sm ${errors.start_terminal_id ? "input-error" : ""}`}
                    {...register("start_terminal_id")}
                  />
                  {errors.start_terminal_id && <p className="mt-1 text-sm text-error">{errors.start_terminal_id.message}</p>}
                </div>
                <div>
                  <label className="mb-1.5 block text-base font-medium text-[#2D2D2D]">End route</label>
                  <input
                    type="text"
                    placeholder="e.g. Fairview"
                    className={`input input-bordered h-10 min-h-10 w-full rounded-md text-sm ${errors.end_terminal_id ? "input-error" : ""}`}
                    {...register("end_terminal_id")}
                  />
                  {errors.end_terminal_id && <p className="mt-1 text-sm text-error">{errors.end_terminal_id.message}</p>}
                </div>
              </div>
            </section>

            <section className="rounded-md border border-[#E5E7EB] p-3.5">
              <h4 className="text-sm font-semibold text-[#4B5563]">Operations setup</h4>
              <div className="mt-3">
                <label className="mb-1.5 block text-base font-medium text-[#2D2D2D]">ETA (minutes)</label>
                <input
                  type="number"
                  min={1}
                  step={1}
                  className={`input input-bordered h-10 min-h-10 w-full rounded-md text-sm ${errors.estimated_duration ? "input-error" : ""}`}
                  {...register("estimated_duration", { valueAsNumber: true })}
                />
                {errors.estimated_duration && (
                  <p className="mt-1 text-sm text-error">{errors.estimated_duration.message}</p>
                )}
              </div>
            </section>

            {errors.route_name && <p className="text-sm text-error">{errors.route_name.message}</p>}

            <div className="mt-5 flex items-center justify-end gap-3">
              <button
                type="button"
                className="text-sm font-semibold text-[#242424] hover:text-[#111111]"
                onClick={closeModal}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn h-10 min-h-10 rounded-md border-none bg-[#0062CA] px-5 text-sm font-semibold text-white hover:bg-[#0052A8]"
                disabled={isSubmitting}
              >
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
