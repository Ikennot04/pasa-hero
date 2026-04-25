"use client";

import axios from "axios";
import { useState } from "react";

export const useConfirmTerminalLog = () => {
  const [error, setError] = useState<string | null>(null);

  const confirmTerminalLog = async (id: string) => {
    try {
      setError(null);
      const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
      const confirmed_by = localStorage?.getItem("terminal_admin_user_id");

      const { data: response } = await axios.patch(
        `${baseUrl}/api/terminal-logs/${id}/confirm`,
        { confirmed_by },
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

  return { confirmTerminalLog, error };
};
