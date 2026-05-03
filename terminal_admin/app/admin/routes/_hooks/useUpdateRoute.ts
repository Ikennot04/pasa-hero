"use client";

import axios from "axios";
import { useCallback, useState } from "react";

export const useUpdateRoute = () => {
  const [error, setError] = useState<string | null>(null);

  const updateRoute = useCallback(
    async (routeId: string, routeData: unknown) => {
      setError(null);
      try {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
        const token =
          typeof window !== "undefined"
            ? localStorage.getItem("terminal_admin_auth_token")
            : null;
        const { data: response } = await axios.patch(
          `${baseUrl}/api/routes/${routeId}`,
          routeData,
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
    },
    [],
  );
  return { updateRoute, error };
};
