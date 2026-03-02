"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import type { UserRow } from "./UserTable";
import { editUserSchema, type EditUserFormData } from "./createUserSchema";

export const EDIT_USER_MODAL_ID = "edit-user-modal";

type EditUserProps = {
  user: UserRow | null;
  modalId?: string;
};

const defaultValues: EditUserFormData = {
  f_name: "",
  l_name: "",
  email: "",
  role: "",
};

export default function EditUser({ user, modalId = EDIT_USER_MODAL_ID }: EditUserProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EditUserFormData>({
    resolver: yupResolver(editUserSchema),
    defaultValues,
  });

  useEffect(() => {
    if (user) {
      reset({
        f_name: user.f_name,
        l_name: user.l_name,
        email: user.email,
        role: user.role,
      });
    } else {
      reset(defaultValues);
    }
  }, [user, reset]);

  return (
    <dialog id={modalId} className="modal">
      <div className="modal-box">
        <h3 className="font-bold text-lg">Edit user</h3>
        <form onSubmit={handleSubmit(() => {})} className="space-y-4 mt-4">
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
              <span className="label-text">Role</span>
            </label>
            <select
              className={`select select-bordered w-full ${errors.role ? "select-error" : ""}`}
              {...register("role")}
            >
              <option value="">Select role</option>
              <option value="user">user</option>
              <option value="super admin">super admin</option>
              <option value="operator">operator</option>
              <option value="terminal admin">terminal admin</option>
            </select>
            {errors.role && (
              <p className="text-error text-sm mt-1">{errors.role.message}</p>
            )}
          </div>
          <div className="modal-action">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => (document.getElementById(modalId) as HTMLDialogElement)?.close()}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
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
