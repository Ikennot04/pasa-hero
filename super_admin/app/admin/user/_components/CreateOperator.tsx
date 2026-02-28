"use client";

import { useState, useRef, useEffect } from "react";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { createUserSchema, type CreateUserFormData } from "./createUserSchema";

export default function CreateOperator() {
  const [open, setOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateUserFormData>({
    resolver: yupResolver(createUserSchema),
    defaultValues: { f_name: "", l_name: "", email: "", password: "" },
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
    setShowPassword(false);
    reset();
  }

  async function onSubmit(data: CreateUserFormData) {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
      const formData = new FormData();
      formData.append("data", JSON.stringify({ ...data, role: "operator" }));
      const res = await fetch(`${baseUrl}/user`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.message || "Failed to create operator");
      }
      closeModal();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to create operator");
    }
  }

  return (
    <>
      <button
        type="button"
        className="btn"
        onClick={openModal}
      >
        Create operator
      </button>
      <dialog ref={dialogRef} className="modal">
        <div className="modal-box">
          <h3 className="font-bold text-lg">Create operator</h3>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">First name</span>
                </label>
                <input
                  type="text"
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
                  className={`input input-bordered w-full ${errors.l_name ? "input-error" : ""}`}
                  {...register("l_name")}
                />
                {errors.l_name && (
                  <p className="text-error text-sm mt-1">{errors.l_name.message}</p>
                )}
              </div>
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text">Email</span>
              </label>
              <input
                type="email"
                className={`input input-bordered w-full ${errors.email ? "input-error" : ""}`}
                {...register("email")}
              />
              {errors.email && (
                <p className="text-error text-sm mt-1">{errors.email.message}</p>
              )}
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text">Password</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  className={`input input-bordered w-full pr-10 ${errors.password ? "input-error" : ""}`}
                  {...register("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/50 hover:text-base-content focus:outline-none"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <FaEyeSlash className="w-4 h-4" />
                  ) : (
                    <FaEye className="w-4 h-4" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-error text-sm mt-1">{errors.password.message}</p>
              )}
              <label className="label">
                <span className="label-text-alt">One capital letter and one special character</span>
              </label>
            </div>
            <div className="modal-action">
              <button type="button" className="btn btn-ghost" onClick={closeModal}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                {isSubmitting ? "Creating…" : "Create"}
              </button>
            </div>
          </form>
        </div>
        <form method="dialog" className="modal-backdrop" onSubmit={closeModal}>
          <button type="submit" aria-label="Close">close</button>
        </form>
      </dialog>
    </>
  );
}
