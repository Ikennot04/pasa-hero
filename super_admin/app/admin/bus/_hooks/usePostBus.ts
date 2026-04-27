"use client";

import axios from "axios";
import { useCallback, useState } from "react";

export const usePostBus = () => {
  const [error, setError] = useState<string | null>(null);

  const postBus = useCallback(async (busData: unknown) => {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
      const { data: response } = await axios.post(
        `${baseUrl}/api/buses`,
        busData,
      );
      return response;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        setError(error.response?.data.message);
      } else {
        setError("Unexpected error");
      }
    }
  }, []);
  return { postBus, error };
};
