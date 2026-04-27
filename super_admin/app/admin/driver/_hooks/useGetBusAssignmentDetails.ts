"use client";

import axios from "axios";
import { useCallback, useState } from "react";

export const useGetBusAssignmentDetails = () => {
  const [error, setError] = useState<string | null>(null);

  const getBusAssignmentDetails = useCallback(async (assignmentId: string) => {
    setError(null);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
      const { data: response } = await axios.get(`${baseUrl}/api/bus-assignments/${assignmentId}`);
      return response;
    } catch (error) {
      let msg = "Request failed";
      if (axios.isAxiosError(error)) {
        const data = error.response?.data as { message?: string; error?: string };
        msg = data?.message ?? data?.error ?? msg;
        setError(msg);
      } else {
        msg = "Unexpected error";
        setError(msg);
      }
      return { success: false as const, message: msg };
    }
  }, []);
  return { getBusAssignmentDetails, error };
}