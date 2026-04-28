"use client";

import axios from "axios";
import { useCallback, useState } from "react";

export const useGetUsers = () => {
  const [error, setError] = useState<string | null>(null);

  const getUsers = useCallback(async () => {
    try {
      setError(null);
      const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
      const token =
        typeof window !== "undefined"
          ? localStorage.getItem("super_admin_auth_token")
          : null;
      const { data: response } = await axios.get(`${baseUrl}/api/users`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      return response;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const responseData = error.response?.data as
          | { message?: string; error?: string }
          | undefined;
        setError(
          responseData?.message ?? responseData?.error ?? "Failed to fetch users",
        );
      } else {
        setError("Unexpected error");
      }
      return null;
    }
  }, []);
  return { getUsers, error };
}