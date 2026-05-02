"use client";

import { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { addBusSchema, type AddBusFormData } from "./addBusSchema";
import { usePostBus } from "../_hooks/usePostBus";

type AddBusModalProps = {
  onBusAdded?: () => void | Promise<void>;
};

function generateBusNumber(): string {
  const letters = Array.from({ length: 3 }, () =>
    String.fromCharCode(65 + Math.floor(Math.random() * 26)),
  ).join("");
  const digits = String(Math.floor(Math.random() * 1000)).padStart(3, "0");
  return `${letters}-${digits}`;
}

export default function AddBusModal({ onBusAdded }: AddBusModalProps) {
  const [open, setOpen] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const { postBus, error: postBusError } = usePostBus();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AddBusFormData>({
    resolver: yupResolver(addBusSchema),
    defaultValues: {
      bus_number: "",
      plate_number: "",
      maximum_capacity: undefined,
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
    setSubmitError(null);
    reset({
      bus_number: generateBusNumber(),
      plate_number: "",
      maximum_capacity: undefined,
    });
  }

  function closeModal() {
    setOpen(false);
    setSubmitError(null);
    reset();
  }

  async function onSubmit(data: AddBusFormData) {
    try {
      setSubmitError(null);
      const response = await postBus({
        bus_number: data.bus_number,
        plate_number: data.plate_number,
        capacity: data.maximum_capacity,
      });
      if (!response) {
        setSubmitError(postBusError ?? "Failed to add bus");
        return;
      }
      await onBusAdded?.();
      closeModal();
    } catch {
      setSubmitError("Failed to add bus");
    }
  }

  return (
    <>
      <button type="button" className="btn bg-[#0062CA] text-white hover:bg-[#0062CA]/80" onClick={openModal}>
        Add bus
      </button>
      <dialog ref={dialogRef} className="modal">
        <div className="modal-box">
          <h3 className="font-bold text-lg">Add bus</h3>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text">Bus number</span>
              </label>
              <input
                type="text"
                placeholder="e.g. ABC-132"
                className={`input input-bordered w-full ${errors.bus_number ? "input-error" : ""}`}
                {...register("bus_number")}
              />
              {errors.bus_number && (
                <p className="text-error text-sm mt-1">
                  {errors.bus_number.message}
                </p>
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
                <p className="text-error text-sm mt-1">
                  {errors.plate_number.message}
                </p>
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
                step={1}
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="e.g. 45"
                className={`input input-bordered w-full ${errors.maximum_capacity ? "input-error" : ""}`}
                {...register("maximum_capacity", {
                  setValueAs: (value) =>
                    value === "" ? undefined : Number(value),
                })}
                onInput={(event) => {
                  event.currentTarget.value = event.currentTarget.value.replace(
                    /\D/g,
                    "",
                  );
                }}
              />
              {errors.maximum_capacity && (
                <p className="text-error text-sm mt-1">
                  {errors.maximum_capacity.message}
                </p>
              )}
            </div>
            <div className="modal-action">
              <button type="button" className="btn btn-ghost" onClick={closeModal}>
                Cancel
              </button>
              <button type="submit" className="btn bg-[#0062CA] text-white hover:bg-[#0062CA]/80" disabled={isSubmitting}>
                {isSubmitting ? "Adding…" : "Add bus"}
              </button>
            </div>
            {submitError || postBusError ? (
              <p className="text-error text-sm">{submitError ?? postBusError}</p>
            ) : null}
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
