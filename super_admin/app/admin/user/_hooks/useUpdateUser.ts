"use client";

import axios from "axios";
import { useCallback, useState } from "react";
import type { EditUserFormData } from "../_components/createUserSchema";

function extractAxiosMessage(err: unknown): string | undefined {
  if (!axios.isAxiosError(err)) return undefined;
  const d = err.response?.data as { message?: string; error?: string } | undefined;
  return d?.message ?? d?.error;
}

/** Hide raw MongoDB duplicate-key text if it still reaches the client. */
function humanizeUserApiMessage(message: string | undefined): string {
  if (!message?.trim()) return "Something went wrong. Please try again.";
  if (/E11000 duplicate key/i.test(message)) {
    if (/email|email_1/i.test(message)) {
      return "This email address is already registered.";
    }
    return "That value is already in use. Please choose another.";
  }
  return message;
}

export type UpdateUserResponse = {
  success?: boolean;
  data?: unknown;
  message?: string;
};

/** PATCH /api/users/:id expects multipart field `data` as JSON (see user.controller updateUser). */
export const useUpdateUser = () => {
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const updateUser = useCallback(async (userId: string, data: EditUserFormData) => {
    try {
      setError(null);
      const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
      const token =
        typeof window !== "undefined"
          ? localStorage.getItem("super_admin_auth_token")
          : null;
      const formData = new FormData();
      formData.append("data", JSON.stringify(data));
      const { data: response } = await axios.patch<UpdateUserResponse>(
        `${baseUrl}/api/users/${userId}`,
        formData,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        },
      );
      return response;
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const raw =
          extractAxiosMessage(err) ?? err.message ?? "Request failed";
        setError(humanizeUserApiMessage(raw));
      } else {
        setError("Unexpected error");
      }
      return null;
    }
  }, []);

  return { updateUser, error, clearError };
};
