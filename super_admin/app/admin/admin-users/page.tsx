"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import axios from "axios";

import { useAuthToken } from "../../useAuthToken.hook";
import {
  createUserSchema,
  type CreateUserFormData,
} from "../user/_components/createUserSchema";
import ConfirmSuspendModal from "../user/_components/ConfirmSuspend";
import type { UserRow } from "../user/_components/UserTable";
import { useGetUsers } from "./_hooks/useGetUsers";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { FaUserPlus } from "react-icons/fa6";
import { MdOutlinePersonOff } from "react-icons/md";

const SUPER_ADMIN_ROLE = "super admin";

const ADMIN_PORTAL_ROLES = new Set(["super admin", "admin"]);

const ADMIN_USERS_SUSPEND_MODAL_ID = "admin-users-confirm-suspend-modal";

type ApiUser = {
  _id: string;
  f_name: string;
  l_name: string;
  email: string;
  role: string;
  status: string;
};

function toUserRow(u: ApiUser): UserRow {
  return {
    id: String(u._id),
    f_name: u.f_name,
    l_name: u.l_name,
    email: u.email,
    role: u.role,
    status: u.status,
  };
}

export default function AdminUsersPage() {
  const router = useRouter();
  const { authToken } = useAuthToken();
  const { getUsers, error: usersFetchError } = useGetUsers();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const [userToSuspend, setUserToSuspend] = useState<UserRow | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);

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
    void (async () => {
      const result = await authToken();
      if (result?.user?.role !== SUPER_ADMIN_ROLE) {
        router.replace("/admin/dashboard");
        return;
      }
      const self = result.user as { _id?: string; id?: string };
      setSessionUserId(String(self._id ?? self.id ?? ""));
      setAllowed(true);
    })();
  }, [authToken, router]);

  useEffect(() => {
    if (allowed !== true) return;
    let cancelled = false;
    void (async () => {
      setUsersLoading(true);
      try {
        const res = await getUsers();
        if (cancelled) return;
        if (res?.success === true && Array.isArray(res.data)) {
          setUsers(res.data);
        } else {
          setUsers([]);
        }
      } finally {
        if (!cancelled) setUsersLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [allowed, getUsers]);

  const portalAdmins = useMemo(
    () =>
      users.filter((u) =>
        ADMIN_PORTAL_ROLES.has(u.role.trim().toLowerCase()),
      ),
    [users],
  );

  function openSuspendModal(user: ApiUser) {
    setUserToSuspend(toUserRow(user));
    (
      document.getElementById(
        ADMIN_USERS_SUSPEND_MODAL_ID,
      ) as HTMLDialogElement
    )?.showModal();
  }

  async function confirmSuspendUser(row: UserRow) {
    const token = localStorage.getItem("super_admin_auth_token");
    if (!token) {
      throw new Error("Not signed in");
    }
    const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
    const formData = new FormData();
    formData.append("data", JSON.stringify({ status: "suspended" }));
    try {
      const { data: res } = await axios.patch<{
        success?: boolean;
        message?: string;
      }>(`${baseUrl}/api/users/${row.id}`, formData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.success) {
        throw new Error(res.message ?? "Failed to suspend user");
      }
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const msg = (err.response?.data as { message?: string })?.message;
        throw new Error(msg ?? err.message ?? "Failed to suspend user");
      }
      throw err;
    }
    const refresh = await getUsers();
    if (refresh?.success === true && Array.isArray(refresh.data)) {
      setUsers(refresh.data);
    }
  }

  async function onSubmit(data: CreateUserFormData) {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
      const formData = new FormData();
      formData.append(
        "data",
        JSON.stringify({ ...data, role: "admin" }),
      );
      const res = await fetch(`${baseUrl}/user`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(
          (err as { message?: string })?.message ??
            "Failed to create admin user",
        );
      }
      reset();
      const refresh = await getUsers();
      if (refresh?.success === true && Array.isArray(refresh.data)) {
        setUsers(refresh.data);
      }
    } catch (err) {
      alert(
        err instanceof Error ? err.message : "Failed to create admin user",
      );
    }
  }

  if (allowed !== true) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center pt-6">
        <p className="text-lg font-medium text-base-content/60">Loading…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 pt-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0062CA]">Create admin user</h1>
        <p className="mt-1 text-sm text-base-content/70">
          Add a new administrator who can sign in to this super admin portal.
          Only super administrators can access this page.
        </p>
      </div>

      {usersFetchError ? (
        <div role="alert" className="alert alert-error text-sm">
          {usersFetchError}
        </div>
      ) : null}

      <div className="card bg-base-200 shadow-md">
        <div className="card-body">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                  <p className="text-error mt-1 text-sm">
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
                  <p className="text-error mt-1 text-sm">
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
                <p className="text-error mt-1 text-sm">
                  {errors.email.message}
                </p>
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
                    <FaEyeSlash className="h-4 w-4" />
                  ) : (
                    <FaEye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-error mt-1 text-sm">
                  {errors.password.message}
                </p>
              )}
              <label className="label">
                <span className="label-text-alt">
                  One capital letter and one special character
                </span>
              </label>
            </div>
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="btn bg-[#0062CA] text-white hover:bg-[#0062CA]/80"
                disabled={isSubmitting}
              >
                <FaUserPlus className="h-5 w-5" />
                {isSubmitting ? "Creating…" : "Create admin user"}
              </button>
            </div>
          </form>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-base-content">
          Super admins & admins
        </h2>
        <p className="mt-1 text-sm text-base-content/70">
          Accounts with the super admin or admin role ({portalAdmins.length}{" "}
          shown).
        </p>
        <div className="mt-3 overflow-x-auto rounded-box border border-base-content/5 bg-base-100">
          {usersLoading ? (
            <div className="flex justify-center py-12">
              <span className="loading loading-spinner loading-md text-primary" />
            </div>
          ) : (
            <table className="table text-base">
              <thead>
                <tr>
                  <th></th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {portalAdmins.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="text-center text-base-content/60"
                    >
                      No super admin or admin users found.
                    </td>
                  </tr>
                ) : (
                  portalAdmins.map((user, i) => {
                    const isSelf = sessionUserId === String(user._id);
                    const isSuspended =
                      user.status.trim().toLowerCase() === "suspended";
                    return (
                      <tr key={user._id}>
                        <th>{i + 1}</th>
                        <td>
                          {user.f_name} {user.l_name}
                        </td>
                        <td>{user.email}</td>
                        <td>{user.role}</td>
                        <td>{user.status}</td>
                        <td>
                          <button
                            type="button"
                            className="btn bg-[#D0393A] hover:bg-[#D0393A]/90 text-white"
                            disabled={isSelf || isSuspended}
                            title={
                              isSelf
                                ? "You cannot suspend your own account"
                                : isSuspended
                                  ? "Already suspended"
                                  : undefined
                            }
                            onClick={() => openSuspendModal(user)}
                          >
                            <MdOutlinePersonOff className="h-5 w-5" />
                            Suspend
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <ConfirmSuspendModal
        user={userToSuspend}
        modalId={ADMIN_USERS_SUSPEND_MODAL_ID}
        onConfirm={confirmSuspendUser}
      />
    </div>
  );
}
