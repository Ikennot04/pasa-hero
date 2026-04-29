"use client";

import axios from "axios";
import { useCallback, useState } from "react";

export const useGetOperators = () => {
  const [error, setError] = useState<string | null>(null);

  const getOperators = useCallback(async (terminalId: string) => {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
      const { data: response } = await axios.get(`${baseUrl}/api/users/operators/terminal/${terminalId}`);
      return response;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        setError(error.response?.data?.message);
      } else {
        setError("Unexpected error");
      }
      return null;
    }
  }, []);
  return { getOperators, error };
};