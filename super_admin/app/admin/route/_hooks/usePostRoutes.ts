"use client";

import axios from "axios";
import { useCallback, useState } from "react";

export const usePostRoutes = () => {
  const [error, setError] = useState<string | null>(null);

  const postRoutes = useCallback(async (routeData: unknown) => {
    setError(null);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
      const token =
        typeof window !== "undefined"
          ? localStorage.getItem("super_admin_auth_token")
          : null;
      const { data: response } = await axios.post(
        `${baseUrl}/api/routes`,
        routeData,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        },
      );
      return response;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.message ?? "Failed to create route.";
        setError(message);
        return { success: false, message };
      }
      setError("Failed to create route.");
      return { success: false, message: "Failed to create route." };
    }
  }, []);
  return { postRoutes, error };
};
