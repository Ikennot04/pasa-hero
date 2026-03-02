"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import type { BusProps } from "../BusProps";
import { editBusSchema, type EditBusFormData } from "./editBusSchema";

export const EDIT_BUS_MODAL_ID = "edit-bus-modal";

type EditBusProps = {
  bus: BusProps | null;
  modalId?: string;
  onCloseModal?: () => void;
};

const defaultValues: EditBusFormData = {
  bus_code: "",
  plate_number: "",
  maximum_capacity: 0,
};

export default function EditBusModal({ bus, modalId = EDIT_BUS_MODAL_ID, onCloseModal }: EditBusProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EditBusFormData>({
    resolver: yupResolver(editBusSchema),
    defaultValues,
  });

  useEffect(() => {
    if (bus) {
      reset({
        bus_code: bus.bus_number,
        plate_number: bus.plate_number,
        maximum_capacity: bus.capacity,
      });
    } else {
      reset(defaultValues);
    }
  }, [bus, reset]);

  async function onSubmit(data: EditBusFormData) {
    if (!bus) return;
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
      const res = await fetch(`${baseUrl}/bus/${bus.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bus_number: data.bus_code,
          plate_number: data.plate_number,
          capacity: data.maximum_capacity,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.message ?? "Failed to update bus");
      }
      (document.getElementById(modalId) as HTMLDialogElement)?.close();
      onCloseModal?.();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update bus");
    }
  }

  useEffect(() => {
    const el = document.getElementById(modalId) as HTMLDialogElement | null;
    if (!el) return;
    if (bus) {
      el.showModal();
    } else {
      el.close();
    }
    const onClose = () => onCloseModal?.();
    el.addEventListener("close", onClose);
    return () => el.removeEventListener("close", onClose);
  }, [bus, modalId, onCloseModal]);

  return (
    <dialog id={modalId} className="modal">
      <div className="modal-box flex flex-col max-h-[90vh] p-0">
        <h3 className="font-bold text-lg p-4 pb-0">Edit bus</h3>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
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
                <p className="text-error text-sm mt-1">{errors.bus_code.message}</p>
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
                <p className="text-error text-sm mt-1">{errors.plate_number.message}</p>
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
                <p className="text-error text-sm mt-1">{errors.maximum_capacity.message}</p>
              )}
            </div>
          </div>
          <div className="modal-action sticky bottom-0 bg-base-100 border-t border-base-content/5 p-4 mt-0 shrink-0">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                (document.getElementById(modalId) as HTMLDialogElement)?.close();
                onCloseModal?.();
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn bg-[#0062CA] text-white hover:bg-[#0062CA]/80"
            >
              Save
            </button>
          </div>
        </form>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button type="submit">close</button>
      </form>
    </dialog>
  );
}
