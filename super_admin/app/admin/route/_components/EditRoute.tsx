"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { MdOutlineEdit } from "react-icons/md";
import type { RouteProps } from "../RouteProps";
import {
  editRouteSchema,
  type EditRouteFormData,
} from "./addRouteSchema";

const EDIT_ROUTE_MODAL_ID = "edit-route-modal";

const TERMINAL_OPTIONS: { id: string; terminal_name: string }[] = [
  { id: "1", terminal_name: "PITX (Parañaque Integrated Terminal Exchange)" },
  { id: "2", terminal_name: "SM North EDSA" },
  { id: "3", terminal_name: "Monumento" },
  { id: "4", terminal_name: "Fairview" },
  { id: "5", terminal_name: "Tamiya Terminal" },
  { id: "6", terminal_name: "Pacific Terminal" },
];

type EditRouteProps = {
  route: RouteProps;
  modalId?: string;
  onCloseModal?: () => void;
};

const defaultValues: EditRouteFormData = {
  route_name: "",
  route_code: "",
  start_terminal_id: "",
  end_terminal_id: "",
  estimated_duration: undefined,
  status: "active",
};

export default function EditRoute({
  route,
  modalId = EDIT_ROUTE_MODAL_ID,
  onCloseModal,
}: EditRouteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EditRouteFormData>({
    resolver: yupResolver(editRouteSchema),
    defaultValues,
  });

  useEffect(() => {
    reset({
      route_name: route.route_name,
      route_code: route.route_code,
      start_terminal_id: route.start_terminal_id,
      end_terminal_id: route.end_terminal_id,
      estimated_duration: route.estimated_duration ?? undefined,
      status: route.status,
    });
  }, [route, reset]);

  async function onSubmit(data: EditRouteFormData) {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
      const res = await fetch(`${baseUrl}/routes/${route.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          route_name: data.route_name,
          route_code: data.route_code,
          start_terminal_id: data.start_terminal_id,
          end_terminal_id: data.end_terminal_id,
          estimated_duration:
            data.estimated_duration != null ? data.estimated_duration : undefined,
          status: data.status,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.message ?? "Failed to update route");
      }
      (document.getElementById(modalId) as HTMLDialogElement)?.close();
      setIsOpen(false);
      onCloseModal?.();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update route");
    }
  }

  useEffect(() => {
    const el = document.getElementById(modalId) as HTMLDialogElement | null;
    if (!el) return;
    if (isOpen) {
      el.showModal();
    } else {
      el.close();
    }
    const onClose = () => {
      setIsOpen(false);
      onCloseModal?.();
    };
    el.addEventListener("close", onClose);
    return () => el.removeEventListener("close", onClose);
  }, [isOpen, modalId, onCloseModal]);

  return (
    <>
      <button
        type="button"
        className="btn"
        onClick={() => setIsOpen(true)}
      >
        <MdOutlineEdit className="w-5 h-5" />
        Edit
      </button>
      <dialog id={modalId} className="modal">
        <div className="modal-box flex flex-col max-h-[90vh] p-0">
          <h3 className="font-bold text-lg p-4 pb-0">Edit route</h3>
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="flex flex-col flex-1 min-h-0"
          >
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
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
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Status</span>
                </label>
                <select
                  className={`select select-bordered w-full ${errors.status ? "select-error" : ""}`}
                  {...register("status")}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="suspended">Suspended</option>
                </select>
                {errors.status && (
                  <p className="text-error text-sm mt-1">
                    {errors.status.message}
                  </p>
                )}
              </div>
            </div>
            <div className="modal-action sticky bottom-0 bg-base-100 border-t border-base-content/5 p-4 mt-0 shrink-0">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  (document.getElementById(modalId) as HTMLDialogElement)?.close();
                  setIsOpen(false);
                  onCloseModal?.();
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn bg-[#008DF7] hover:bg-[#008DF7]/80 text-white"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Saving…" : "Save"}
              </button>
            </div>
          </form>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button type="submit">close</button>
        </form>
      </dialog>
    </>
  );
}
