"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import type { UserRow } from "./UserTable";
import { editUserSchema, type EditUserFormData } from "./createUserSchema";
import { useUpdateUser } from "../_hooks/useUpdateUser";

// ICONS
import { MdOutlineSave, MdOutlineEdit } from "react-icons/md";

export const EDIT_USER_MODAL_ID = "edit-user-modal";

type EditUserProps = {
  user: UserRow;
  modalId?: string;
  onUpdated?: () => void | Promise<void>;
};

const defaultValues: EditUserFormData = {
  f_name: "",
  l_name: "",
  email: "",
  role: "",
};

export default function EditUserModal({
  user,
  modalId = `${EDIT_USER_MODAL_ID}-${user.id}`,
  onUpdated,
}: EditUserProps) {
  const { updateUser, error: submitError, clearError } = useUpdateUser();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EditUserFormData>({
    resolver: yupResolver(editUserSchema),
    defaultValues,
  });

  const openModal = () => {
    clearError();
    (document.getElementById(modalId) as HTMLDialogElement)?.showModal();
  };

  const closeModal = () => {
    (document.getElementById(modalId) as HTMLDialogElement)?.close();
  };

  const onSubmit = async (data: EditUserFormData) => {
    const res = await updateUser(user.id, data);
    if (res?.success === true) {
      closeModal();
      await onUpdated?.();
    }
  };

  useEffect(() => {
    reset({
      f_name: user.f_name,
      l_name: user.l_name,
      email: user.email,
      role: user.role,
    });
  }, [user, reset]);

  return (
    <>
      <button
        type="button"
        className="btn"
        onClick={openModal}
        aria-label={`Edit ${user.f_name} ${user.l_name}`}
      >
        <MdOutlineEdit className="w-5 h-5" />
        Edit
      </button>
      <dialog id={modalId} className="modal">
        <div className="modal-box">
          <h3 className="font-bold text-lg">Edit user</h3>
          {submitError ? (
            <div role="alert" className="alert alert-error text-sm mt-4">
              {submitError}
            </div>
          ) : null}
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
                  <p className="text-error text-sm mt-1">
                    {errors.f_name.message}
                  </p>
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
                  <p className="text-error text-sm mt-1">
                    {errors.l_name.message}
                  </p>
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
                <p className="text-error text-sm mt-1">
                  {errors.email.message}
                </p>
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
                disabled={isSubmitting}
                onClick={() => {
                  clearError();
                  closeModal();
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn bg-[#008DF7] hover:bg-[#008DF7]/80 text-white"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <span className="loading loading-spinner loading-sm" />
                ) : (
                  <MdOutlineSave className="w-5 h-5" />
                )}
                Save
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
