"use client";

import axios from "axios";
import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";

type LoginPayload = {
  email: string;
  password: string;
};

type SignInResponse = {
  success?: boolean;
  token?: string;
  message?: string;
  data?: {
    role?: string;
    f_name?: string;
  };
};

const AUTH_TOKEN_KEY = "super_admin_auth_token";
const PROFILE_ROLE_KEY = "super_admin_role";

const ALLOWED_ROLES = new Set(["super admin", "admin"]);

export const useLogin = () => {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const handleLogin = useCallback(
    async (data: LoginPayload) => {
      setError(null);
      const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "";

      try {
        const { data: res } = await axios.post<SignInResponse>(
          `${baseUrl}/api/users/auth/signin`,
          data,
        );

        if (res.success && res.token) {
          const role = res.data?.role;
          if (!role || !ALLOWED_ROLES.has(role)) {
            setError(
              "Access denied. This portal is for super administrators and admins only.",
            );
            return;
          }

          localStorage.setItem(AUTH_TOKEN_KEY, res.token);
          if (res.data?.f_name) {
            localStorage.setItem("super_admin_f_name", res.data.f_name);
          }
          if (role) {
            localStorage.setItem(PROFILE_ROLE_KEY, role);
          }

          router.push("/admin/dashboard");
          return;
        }

        setError(res.message ?? "Sign in failed");
      } catch (err) {
        if (axios.isAxiosError(err)) {
          const msg =
            (err.response?.data as { message?: string })?.message ??
            err.message ??
            "Sign in failed";
          setError(msg);
        } else {
          setError("Unexpected error");
        }
      }
    },
    [router],
  );

  return { handleLogin, error };
};
