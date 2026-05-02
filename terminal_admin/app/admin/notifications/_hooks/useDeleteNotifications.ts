"use client";

import axios from "axios";
import { useCallback, useState } from "react";

export const useDeleteNotifications = () => {
  const [error, setError] = useState<string | null>(null);

  const deleteNotifications = useCallback(async (notificationIds: string[]) => {
    try {
      setError(null);
      const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
      const { data: response } = await axios.delete(
        `${baseUrl}/api/notifications/bulk`,
        {
          data: { notification_ids: notificationIds },
        },
      );
      return response;
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

  return { deleteNotifications, error };
};
