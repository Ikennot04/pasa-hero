"use client";

import axios from "axios";
import { useState } from "react";

export const useGetTerminalLogs = () => {
  const [error, setError] = useState<string | null>(null);

  const getTerminalLogs = async () => {
    try {
      const assignedTerminal = localStorage?.getItem("assigned_terminal");

      const { data: response } = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/terminal-logs/terminal/${assignedTerminal}`,
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
  return { getTerminalLogs, error };
};
