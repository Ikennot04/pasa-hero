"use client";

import axios from "axios";
import { useCallback, useState } from "react";

export const useGetRouteDetails = () => {
  const [error, setError] = useState<string | null>(null);

  const getRouteDetails = useCallback(async (routeId: string) => {
    try {
      setError(null);
      const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
      const { data: response } = await axios.get(
        `${baseUrl}/api/routes/${routeId}`,
      );
      return response;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const data = error.response?.data as {
          message?: string;
          error?: string;
        };
        setError(data?.message ?? data?.error ?? "Request failed");
      } else {
        setError("Unexpected error");
      }
      return null;
    }
  }, []);
  return { getRouteDetails, error };
};
