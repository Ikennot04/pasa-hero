"use client";

import axios from "axios";
import { useState } from "react";

const emptyCounts = {
  totalEvents: 0,
  confirmed: 0,
  pending: 0,
  rejected: 0,
};

export type TerminalLogsCounts = typeof emptyCounts;

export type TerminalLogsApiSuccess = {
  success: true;
  data: unknown[];
  counts: TerminalLogsCounts;
};

export type TerminalLogsApiFailure = {
  success: false;
  message?: string;
  data: unknown[];
  counts: TerminalLogsCounts;
};

export type TerminalLogsApiResponse = TerminalLogsApiSuccess | TerminalLogsApiFailure;

export const useGetTerminalLogs = () => {
  const [error, setError] = useState<string | null>(null);

  const getTerminalLogs = async (): Promise<TerminalLogsApiResponse> => {
    try {
      const assignedTerminal = localStorage?.getItem("assigned_terminal");
      if (!assignedTerminal) {
        const message = "No terminal assigned";
        setError(message);
        return { success: false, message, data: [], counts: emptyCounts };
      }

      const { data: response } = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/terminal-logs/terminal/${assignedTerminal}`,
      );

      return response as TerminalLogsApiResponse;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const raw = error.response?.data?.message;
        const message =
          typeof raw === "string" ? raw : error.message || "Request failed";
        setError(message);
        return {
          success: false,
          message,
          data: [],
          counts: emptyCounts,
        };
      }
      setError("Unexpected error");
      return {
        success: false,
        message: "Unexpected error",
        data: [],
        counts: emptyCounts,
      };
    }
  };

  return { getTerminalLogs, error };
};
