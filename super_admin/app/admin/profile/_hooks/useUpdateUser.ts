"use client";

import axios from "axios";
import { useCallback, useState } from "react";

export const useUpdateUser = () => {
  const [error, setError] = useState<string | null>(null);

  const updateUser = useCallback(
    async (userId: string, userData: unknown, token?: string) => {
      try {
        setError(null);
        const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
        const { data: response } = await axios.patch(
          `${baseUrl}/api/users/${userId}`,
          userData,
          token
            ? {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              }
            : undefined,
        );
        return response;
      } catch (error) {
        if (axios.isAxiosError(error)) {
          const data = error.response?.data as { message?: string; error?: string };
          setError(data?.message ?? data?.error ?? "Request failed");
        } else {
          setError("Unexpected error");
        }
        return null;
      }
    },
    [],
  );
  return { updateUser, error };
};