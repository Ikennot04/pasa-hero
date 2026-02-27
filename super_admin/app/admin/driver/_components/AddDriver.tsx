"use client";

import { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { addDriverSchema, type AddDriverFormData } from "./addDriverSchema";

export default function AddDriverModal() {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

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
    reset();
  }

  function closeModal() {
    setOpen(false);
    reset();
  }

  async function onSubmit(data: AddDriverFormData) {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
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
        formData.append("image", data.profile_image[0]);
      }
      const res = await fetch(`${baseUrl}/drivers`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.message || "Failed to add driver");
      }
      closeModal();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to add driver");
    }
  }

  return (
    <>
      <button type="button" className="btn" onClick={openModal}>
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
                type="text"
                placeholder="e.g. +63 912 345 6789"
                className={`input input-bordered w-full ${errors.contact_number ? "input-error" : ""}`}
                {...register("contact_number")}
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
                accept="image/jpeg,image/png,image/gif,image/webp"
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
              <button type="submit" className="btn" disabled={isSubmitting}>
                {isSubmitting ? "Adding…" : "Add driver"}
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
