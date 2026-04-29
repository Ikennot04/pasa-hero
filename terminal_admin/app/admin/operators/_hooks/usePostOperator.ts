"use client";

import axios from "axios";
import { useCallback, useState } from "react";

export const usePostOperator = () => {
  const [error, setError] = useState<string | null>(null);

  const postOperator = useCallback(async (operatorData: unknown) => {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
      const { data: response } = await axios.post(
        `${baseUrl}/api/users`,
        operatorData,
      );
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
  return { postOperator, error };
};
