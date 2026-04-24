"use client";

import axios from "axios";
import { useCallback, useState } from "react";

export const useGetTotalOccupancyPerRoute = () => {
  const [error, setError] = useState<string | null>(null);

  const getTotalOccupancyPerRoute = useCallback(async () => {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
      const { data: response } = await axios.get(`${baseUrl}/api/admin-dashboard/total-occupancy-count-per-route`);
      return response;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const body = error.response?.data as { message?: string; error?: string } | undefined;
        setError(body?.message ?? body?.error ?? error.message);
      } else {
        setError("Unexpected error");
      }
    }
  }, []);
  return { getTotalOccupancyPerRoute, error };
}