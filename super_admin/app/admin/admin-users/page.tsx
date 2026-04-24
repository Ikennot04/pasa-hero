"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";

import { useAuthToken } from "../../useAuthToken.hook";
import {
  createUserSchema,
  type CreateUserFormData,
} from "../user/_components/createUserSchema";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { FaUserPlus } from "react-icons/fa6";

const SUPER_ADMIN_ROLE = "super admin";

export default function AdminUsersPage() {
  const router = useRouter();
  const { authToken } = useAuthToken();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [showPassword, setShowPassword] = useState(false);

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
      setAllowed(true);
    })();
  }, [authToken, router]);

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
    <div className="mx-auto max-w-2xl space-y-6 pt-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0062CA]">Create admin user</h1>
        <p className="mt-1 text-sm text-base-content/70">
          Add a new administrator who can sign in to this super admin portal.
          Only super administrators can access this page.
        </p>
      </div>

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
    </div>
  );
}
