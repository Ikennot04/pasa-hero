"use client";

import axios from "axios";
import { useCallback, useState } from "react";
import type { CreateUserFormData } from "../../user/_components/createUserSchema";

/** Body for POST /api/users (createAdminUser expects multipart field `data` as JSON). */
export type PostUserPayload = CreateUserFormData & {
  role: string;
  assigned_terminal?: string;
};

function extractAxiosMessage(err: unknown): string | undefined {
  if (!axios.isAxiosError(err)) return undefined;
  const d = err.response?.data as { message?: string; error?: string } | undefined;
  return d?.message ?? d?.error;
}

export const usePostUser = () => {
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const postUser = useCallback(async (data: PostUserPayload) => {
    try {
      setError(null);
      const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
      const token =
        typeof window !== "undefined"
          ? localStorage.getItem("super_admin_auth_token")
          : null;
      const formData = new FormData();
      formData.append("data", JSON.stringify(data));
      const { data: response } = await axios.post(`${baseUrl}/api/users`, formData, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      return response as { success?: boolean; data?: unknown; message?: string };
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(extractAxiosMessage(err) ?? err.message ?? "Request failed");
      } else {
        setError("Unexpected error");
      }
      return null;
    }
  }, []);

  return { postUser, error, clearError };
};
