"use client";

import axios from "axios";
import { useCallback, useState } from "react";

export const useGetTopSubscribed = () => {
  const [error, setError] = useState<string | null>(null);

  const getTopSubscribed = useCallback(async () => {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
      const { data: response } = await axios.get(`${baseUrl}/api/admin-dashboard/top-subscribed-routes-and-buses`);
      return response;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        setError("Request failed");
      } else {
        setError("Unexpected error");
      }
    }
  }, []);
  return { getTopSubscribed, error };
}