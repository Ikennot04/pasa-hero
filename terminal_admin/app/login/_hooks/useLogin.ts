"use client";

import { useCallback, useState } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import axios from "axios";
import { useRouter } from "next/navigation";

const SIGNIN_PATH = "/api/users/auth/signin";

export const loginSchema = yup.object({
  email: yup
    .string()
    .required("Email is required")
    .email("Please enter a valid email"),
  password: yup
    .string()
    .required("Password is required")
    .min(6, "Password must be at least 6 characters"),
});

export type LoginFormData = yup.InferType<typeof loginSchema>;

export function useLogin() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: yupResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = useCallback(
    async (data: LoginFormData) => {
      setServerError(null);
      const base = process.env.NEXT_PUBLIC_API_URL ?? "";

      const url = `${base}${SIGNIN_PATH}`;

      try {
        const { data: res } = await axios.post(url, {
          email: data.email,
          password: data.password,
        });

        if (res.success && res.token) {
          localStorage.setItem("terminal_admin_auth_token", res.token);
          router.push("/admin/dashboard");
          return;
        }

        setServerError(res.message ?? "Sign in failed");
      } catch (err) {
        if (axios.isAxiosError(err)) {
          const msg =
            (err.response?.data as { message?: string })?.message ??
            err.message ??
            "Sign in failed";
          setServerError(msg);
        } else {
          setServerError("Something went wrong");
        }
      }
    },
    [router],
  );

  return {
    register,
    errors,
    isSubmitting,
    serverError,
    submitForm: handleSubmit(onSubmit),
  };
}
