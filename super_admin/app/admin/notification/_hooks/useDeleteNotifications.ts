"use client";

import axios from "axios";
import { useCallback, useState } from "react";

export const useDeleteNotifications = () => {
  const [error, setError] = useState<string | null>(null);

  const deleteNotifications = useCallback(async (notificationIds: string[]) => {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
      const { data: response } = await axios.delete(
        `${baseUrl}/api/notifications/bulk`,
        {
          data: { notification_ids: notificationIds },
        },
      );
      return response;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        setError(error.response?.data.message);
      } else {
        setError("Unexpected error");
      }
    }
  }, []);
  return { deleteNotifications, error };
};
