"use client";

import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { MdOutlineEdit } from "react-icons/md";
import type { TerminalProps, TerminalStatus } from "../TerminalProps";
import {
  addTerminalSchema,
  type AddTerminalFormData,
} from "./addTerminalSchema";

type EditTerminalFormData = AddTerminalFormData & {
  status: TerminalStatus;
};

const editTerminalSchema = addTerminalSchema.shape({
  status: yup
    .mixed<TerminalStatus>()
    .oneOf(["active", "inactive"])
    .required("Status is required"),
});

type EditTerminalProps = {
  terminal: TerminalProps;
};

export default function EditTerminal({ terminal }: EditTerminalProps) {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EditTerminalFormData>({
    resolver: yupResolver(editTerminalSchema),
    mode: "onTouched",
    defaultValues: {
      terminal_name: terminal.terminal_name,
      location_lat: terminal.location_lat,
      location_lng: terminal.location_lng,
      status: terminal.status,
    },
  });

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open) {
      dialog.showModal();
      reset({
        terminal_name: terminal.terminal_name,
        location_lat: terminal.location_lat,
        location_lng: terminal.location_lng,
        status: terminal.status,
      });
    } else {
      dialog.close();
    }
    const onClose = () => setOpen(false);
    dialog.addEventListener("close", onClose);
    return () => dialog.removeEventListener("close", onClose);
  }, [open, reset, terminal]);

  function openModal() {
    setOpen(true);
  }

  function closeModal() {
    setOpen(false);
  }

  async function onSubmit(data: EditTerminalFormData) {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
      const res = await fetch(`${baseUrl}/terminals/${terminal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          terminal_name: data.terminal_name,
          location_lat: data.location_lat,
          location_lng: data.location_lng,
          status: data.status,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.message || "Failed to update terminal");
      }
      closeModal();
      window.location.reload();
    } catch (err) {
      alert(
        err instanceof Error ? err.message : "Failed to update terminal",
      );
    }
  }

  return (
    <>
      <button
        type="button"
        className="btn"
        onClick={openModal}
        aria-label={`Edit terminal ${terminal.terminal_name}`}
      >
        <MdOutlineEdit className="w-5 h-5" />
        Edit
      </button>
      <dialog
        ref={dialogRef}
        className="modal"
        id={`edit_terminal_modal_${terminal.id}`}
      >
        <div className="modal-box">
          <h3 className="font-bold text-lg">Edit terminal</h3>
          <p className="text-sm text-base-content/60 mt-1">
            Terminal ID: {terminal.id}
          </p>
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-4 mt-4"
          >
            <div className="form-control">
              <label className="label">
                <span className="label-text">Terminal name</span>
              </label>
              <input
                type="text"
                placeholder="e.g. PITX"
                className={`input input-bordered w-full ${
                  errors.terminal_name ? "input-error" : ""
                }`}
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
                className={`input input-bordered w-full ${
                  errors.location_lat ? "input-error" : ""
                }`}
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
                className={`input input-bordered w-full ${
                  errors.location_lng ? "input-error" : ""
                }`}
                {...register("location_lng", { valueAsNumber: true })}
              />
              {errors.location_lng && (
                <p className="text-error text-sm mt-1">
                  {errors.location_lng.message}
                </p>
              )}
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text">Status</span>
              </label>
              <select
                className={`select select-bordered w-full ${
                  errors.status ? "select-error" : ""
                }`}
                {...register("status")}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
              {errors.status && (
                <p className="text-error text-sm mt-1">
                  {errors.status.message}
                </p>
              )}
            </div>
            <div className="modal-action">
              <button
                type="button"
                className="btn"
                onClick={closeModal}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn bg-[#008DF7] hover:bg-[#008DF7]/80 text-white"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Saving…" : "Save changes"}
              </button>
            </div>
          </form>
        </div>
        <form
          method="dialog"
          className="modal-backdrop"
          onSubmit={closeModal}
        >
          <button type="submit" aria-label="Close">
            close
          </button>
        </form>
      </dialog>
    </>
  );
}

