"use client";

import axios from "axios";
import { useCallback, useState } from "react";

export const useGetBusDetails = () => {
  const [error, setError] = useState<string | null>(null);

  const getBusDetails = useCallback(async (busId: string) => {
    try {
      setError(null);
      const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
      const { data: response } = await axios.get(`${baseUrl}/api/buses/${busId}`);
      return response;
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const msg = err.response?.data?.message ?? err.response?.data?.error;
        setError(typeof msg === "string" ? msg : "Request failed");
      } else {
        setError("Unexpected error");
      }
    }
  }, []);
  return { getBusDetails, error };
}