"use client";

import axios from "axios";
import { useCallback, useState } from "react";

export const useGetBusAssignments = () => {
  const [error, setError] = useState<string | null>(null);

  const getBusAssignments = useCallback(async () => {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
      const { data: response } = await axios.get(`${baseUrl}/api/bus-assignments`);
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
  }, []);
  return { getBusAssignments, error };
}