"use client";

import axios from "axios";
import { useCallback, useState } from "react";

export const useGetRoutesPerformance = () => {
  const [error, setError] = useState<string | null>(null);

  const getRoutesPerformance = useCallback(async () => {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
      const { data: response } = await axios.get(`${baseUrl}/api/admin-dashboard/route-performance-report`);
      return response;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        setError(error.response?.data.error);
      } else {
        setError("Unexpected error");
      }
    }
  }, []);
  return { getRoutesPerformance, error };
}