"use client";

import axios from "axios";
import { useCallback, useState } from "react";

export const useGetAvailables = () => {
  const [error, setError] = useState<string | null>(null);

  const getAvailables = useCallback(async () => {
    try {
      const terminalId = localStorage?.getItem("assigned_terminal");
      const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
      const { data: response } = await axios.get(
        `${baseUrl}/api/bus-assignments/available/terminal/${terminalId}`,
      );
      return response;
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const data = err.response?.data as { message?: string; error?: string };
        setError(data?.message ?? data?.error ?? "Request failed");
      } else {
        setError("Unexpected error");
      }
      return null;
    }
  }, []);

  return { getAvailables, error };
};
