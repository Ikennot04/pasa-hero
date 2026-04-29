"use client";

import axios from "axios";
import { useCallback, useState } from "react";

export const usePostOperator = () => {
  const [error, setError] = useState<string | null>(null);

  const postOperator = useCallback(
    async (operatorData: FormData, token: string) => {
      setError(null);
      try {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
        const { data: response } = await axios.post(
          `${baseUrl}/api/users`,
          operatorData,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );
        return response;
      } catch (error) {
        if (axios.isAxiosError(error)) {
          setError(error.response?.data?.message ?? "Failed to create operator");
        } else {
          setError("Unexpected error");
        }
        return null;
      }
    },
    [],
  );
  return { postOperator, error };
};
