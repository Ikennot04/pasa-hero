"use client";

import axios from "axios";
import { useCallback, useState } from "react";

export const useGetRoutes = () => {
  const [error, setError] = useState<string | null>(null);

  const getRoutes = useCallback(async () => {
    try {
      setError(null);
      const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
      const { data: response } = await axios.get(`${baseUrl}/api/routes`);
      return response;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const data = error.response?.data as { message?: string; error?: string };
        setError(data?.message ?? data?.error ?? "Failed to fetch routes");
      } else {
        setError("Unexpected error");
      }
      return null;
    }
  }, []);
  return { getRoutes, error };
}