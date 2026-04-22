"use client";

import axios from "axios";
import { useState } from "react";

export const useGetTerminalManagement = () => {
  const [error, setError] = useState<string | null>(null);

  const getTerminalManagement = async () => {
    try {
      const assignedTerminal = localStorage?.getItem("assigned_terminal");

      const { data: response } = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/terminals/${assignedTerminal}/terminal-management`,
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
  return { getTerminalManagement, error };
};
