"use client";

import axios from "axios";
import { useCallback, useState } from "react";

export const useGetTerminalNames = () => {
  const [error, setError] = useState<string | null>(null);

  const getTerminalNames = useCallback(async () => {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
      const { data: response } = await axios.get(
        `${baseUrl}/api/terminals/terminal-names`,
      );
      return response;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        setError(error.response?.data.message);
        return error.response?.data;
      }
      return null;
    }
  }, []);
  return { getTerminalNames, error };
};
