"use client";

import axios from "axios";
import { useState } from "react";

export const useGetNotifications = () => {
  const [error, setError] = useState<string | null>(null);

  const getNotifications = async () => {
    try {
      const assignedTerminal = localStorage?.getItem("assigned_terminal");

      const { data: response } = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/notifications/latest/${assignedTerminal}`,
      );

      return response;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        setError(error.response?.data.message);
        return error.response?.data;
      } else {
        setError("Unexpected error");
      }
    }
  };
  return { getNotifications, error };
};
