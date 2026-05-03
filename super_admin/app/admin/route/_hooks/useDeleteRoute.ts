"use client";

import axios from "axios";
import { useCallback, useState } from "react";

export const useDeleteRoute = () => {
  const [error, setError] = useState<string | null>(null);

  const deleteRoute = useCallback(async (routeId: string) => {
    setError(null);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
      const token =
        typeof window !== "undefined"
          ? localStorage.getItem("super_admin_auth_token")
          : null;
      const { data: response } = await axios.delete(
        `${baseUrl}/api/routes/${routeId}`,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        },
      );
      return response;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        setError(error.response?.data?.message);
      } else {
        setError("Unexpected error");
      }
    }
  }, []);
  return { deleteRoute, error };
}