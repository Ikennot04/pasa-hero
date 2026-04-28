"use client";

import axios from "axios";
import { useCallback, useState } from "react";

export const usePostBusStop = () => {
  const [error, setError] = useState<string | null>(null);

  const postBusStop = useCallback(async (busStop: unknown) => {
    setError(null);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
      const { data: response } = await axios.post(
        `${baseUrl}/api/route-stops`,
        busStop,
      );
      return response;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        setError(error.response?.data?.message);
      } else {
        setError("Unexpected error");
      }
    }
  }, []);
  return { postBusStop, error };
};
