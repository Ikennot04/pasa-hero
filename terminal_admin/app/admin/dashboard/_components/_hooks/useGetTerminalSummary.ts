"use client";

import axios, { AxiosError } from "axios";
import { useState } from "react";

export const useGetTerminalSummary = () => {
  const [error, setError] = useState<string | null>(null);

  const getTerminalSummary = async () => {
    try {
      const assignedTerminal = localStorage?.getItem("assigned_terminal");

      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/terminals/${assignedTerminal}/operational-summary`,
      );

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        setError(error.message);
      } else {
        setError("Unexpected error");
      }
    }
  };

  return { getTerminalSummary, error };
};
