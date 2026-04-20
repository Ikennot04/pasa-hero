"use client";

import axios from "axios";
import { useCallback, useState } from "react";

export const useGetNotifications = () => {
  const [error, setError] = useState<string | null>(null);

  const getNotifications = useCallback(async () => {
    try {
      setError(null);
      const assignedTerminal = localStorage?.getItem("assigned_terminal");

      const { data } = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/notifications/terminal/${assignedTerminal}`,
      );

      return data;
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const message =
          err.response?.data?.message ?? err.response?.data?.error ?? err.message;
        setError(typeof message === "string" ? message : "Request failed");
        return err.response?.data;
      }
      setError("Unexpected error");
      return undefined;
    }
  }, []);

  return { getNotifications, error };
};