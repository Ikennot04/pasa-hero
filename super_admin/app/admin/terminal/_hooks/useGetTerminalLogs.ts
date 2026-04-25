"use client";

import axios from "axios";
import { useCallback, useState } from "react";

export const useGetTerminalLogs = () => {
  const [error, setError] = useState<string | null>(null);

  const getTerminalLogs = useCallback(async () => {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
      const { data: response } = await axios.get(`${baseUrl}/api/terminal-logs`);
      return response;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message =
          error.response?.data?.message ??
          error.response?.data?.error ??
          "Failed to fetch terminal logs";
        setError(message);
        return error.response?.data;
      } else {
        setError("Unexpected error");
        return null;
      }
    }
  }, []);
  return { getTerminalLogs, error };
}