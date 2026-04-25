"use client";

import axios from "axios";
import { useState } from "react";

type NotificationType = {
  sender_id: string;
  terminal_id: string;
  title: string;
  message: string;
  notification_type: string;
  scope: string;
  priority: string;
};

export const useCreateNotification = () => {
  const [error, setError] = useState<string | null>(null);

  const createNotification = async (data: NotificationType) => {
    try {
      setError(null);
      const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
      const { data: response } = await axios.post(`${baseUrl}/api/notifications`, data);
      return response;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        setError(error.response?.data?.message ?? "Request failed");
        return error.response?.data;
      } else {
        setError("Unexpected error");
      }
    }
  };

  return { createNotification, error };
};

