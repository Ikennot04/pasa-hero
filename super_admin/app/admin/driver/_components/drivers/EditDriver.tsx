"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import type { DriverProps } from "./DriverProps";
import { editDriverSchema, type EditDriverFormData } from "./editDriverSchema";
import { MdOutlineEdit } from "react-icons/md";

export const EDIT_DRIVER_MODAL_ID = "edit-driver-modal";

type EditDriverProps = {
  driver: DriverProps;
  modalId?: string;
  onCloseModal?: () => void;
};

const defaultValues: EditDriverFormData = {
  f_name: "",
  l_name: "",
  license_number: "",
  contact_number: "",
  status: "active",
};

export default function EditDriverModal({
  driver,
  modalId = EDIT_DRIVER_MODAL_ID,
  onCloseModal,
}: EditDriverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EditDriverFormData>({
    resolver: yupResolver(editDriverSchema),
    defaultValues,
  });

  useEffect(() => {
    reset({
      f_name: driver.f_name,
      l_name: driver.l_name,
      license_number: driver.license_number,
      contact_number: driver.contact_number ?? "",
      status: driver.status,
    });
  }, [driver, reset]);

  async function onSubmit(data: EditDriverFormData) {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
      const body: Record<string, unknown> = {
        f_name: data.f_name,
        l_name: data.l_name,
        license_number: data.license_number,
        contact_number: data.contact_number || "",
        status: data.status,
      };
      if (data.profile_image?.length) {
        const formData = new FormData();
        formData.append("data", JSON.stringify(body));
        formData.append("image", data.profile_image[0]);
        const res = await fetch(`${baseUrl}/drivers/${driver.id}`, {
          method: "PATCH",
          body: formData,
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err?.message ?? "Failed to update driver");
        }
      } else {
        const res = await fetch(`${baseUrl}/drivers/${driver.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err?.message ?? "Failed to update driver");
        }
      }
      (document.getElementById(modalId) as HTMLDialogElement)?.close();
      setIsOpen(false);
      onCloseModal?.();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update driver");
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
        <h3 className="font-bold text-lg p-4 pb-0">Edit driver</h3>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
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
                <span className="label-text">Status</span>
              </label>
              <select
                className={`select select-bordered w-full ${errors.status ? "select-error" : ""}`}
                {...register("status")}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
              {errors.status && (
                <p className="text-error text-sm mt-1">{errors.status.message}</p>
              )}
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text">Profile image (optional)</span>
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
