"use client";

import { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { addDriverSchema, type AddDriverFormData } from "./addDriverSchema";
import { usePostDriver } from "../../_hooks/usePostDriver";

type AddDriverModalProps = {
  onDriverAdded?: () => void | Promise<void>;
};

export default function AddDriverModal({ onDriverAdded }: AddDriverModalProps) {
  const [open, setOpen] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const { postDriver, error: postDriverError } = usePostDriver();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AddDriverFormData>({
    resolver: yupResolver(addDriverSchema),
    defaultValues: {
      f_name: "",
      l_name: "",
      license_number: "",
      contact_number: "",
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
    reset();
  }

  function closeModal() {
    setOpen(false);
    setSubmitError(null);
    reset();
  }

  async function onSubmit(data: AddDriverFormData) {
    try {
      setSubmitError(null);
      const formData = new FormData();
      formData.append(
        "data",
        JSON.stringify({
          f_name: data.f_name,
          l_name: data.l_name,
          license_number: data.license_number,
          contact_number: data.contact_number || "",
        })
      );
      if (data.profile_image?.length) {
        formData.append("image_type", "driver");
        formData.append("image", data.profile_image[0]);
      }
      const response = await postDriver(formData);
      if (!response) {
        setSubmitError(postDriverError ?? "Failed to add driver");
        return;
      }
      await onDriverAdded?.();
      closeModal();
    } catch {
      setSubmitError("Failed to add driver");
    }
  }

  return (
    <>
      <button type="button" className="btn bg-[#0062CA] text-white hover:bg-[#0062CA]/80" onClick={openModal}>
        Add driver
      </button>
      <dialog ref={dialogRef} className="modal" id="add_driver_modal">
        <div className="modal-box">
          <h3 className="font-bold text-lg">Add driver</h3>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text">First name</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Juan"
                className={`input input-bordered w-full ${errors.f_name ? "input-error" : ""}`}
                {...register("f_name")}
              />
              {errors.f_name && (
                <p className="text-error text-sm mt-1">{errors.f_name.message}</p>
              )}
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text">Last name</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Dela Cruz"
                className={`input input-bordered w-full ${errors.l_name ? "input-error" : ""}`}
                {...register("l_name")}
              />
              {errors.l_name && (
                <p className="text-error text-sm mt-1">{errors.l_name.message}</p>
              )}
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text">License number</span>
              </label>
              <input
                type="text"
                placeholder="e.g. DL-2024-001234"
                className={`input input-bordered w-full ${errors.license_number ? "input-error" : ""}`}
                {...register("license_number")}
              />
              {errors.license_number && (
                <p className="text-error text-sm mt-1">
                  {errors.license_number.message}
                </p>
              )}
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text">Contact number</span>
              </label>
              <input
                type="tel"
                inputMode="numeric"
                placeholder="e.g.  0912 345 6789"
                className={`input input-bordered w-full ${errors.contact_number ? "input-error" : ""}`}
                {...register("contact_number")}
                onInput={(event) => {
                  event.currentTarget.value = event.currentTarget.value.replace("-", "");
                }}
              />
              {errors.contact_number && (
                <p className="text-error text-sm mt-1">
                  {errors.contact_number.message}
                </p>
              )}
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text">Profile image</span>
              </label>
              <input
                type="file"
                accept="image/jpeg,image/jpg,image/png"
                className={`file-input file-input-bordered w-full ${errors.profile_image ? "input-error" : ""}`}
                {...register("profile_image")}
              />
              {errors.profile_image && (
                <p className="text-error text-sm mt-1">
                  {errors.profile_image.message}
                </p>
              )}
            </div>
            <div className="modal-action">
              <button type="button" className="btn" onClick={closeModal}>
                Cancel
              </button>
              <button type="submit" className="btn bg-[#0062CA] text-white hover:bg-[#0062CA]/80" disabled={isSubmitting}>
                {isSubmitting ? "Adding…" : "Add driver"}
              </button>
            </div>
            {submitError || postDriverError ? (
              <p className="text-error text-sm">{submitError ?? postDriverError}</p>
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
