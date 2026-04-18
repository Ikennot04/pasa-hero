"use client";

import axios from "axios";
import { useState } from "react";

export const useGetRoute = () => {
  const [error, setError] = useState<string | null>(null);

  const getRoute = async (routeId: string) => {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
      const { data: response } = await axios.get(`${baseUrl}/api/routes/${routeId}`);

      return response;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        setError(error.response?.data.message);
        return error.response?.data;
      } else {
        setError("Unexpected error");
      }
    }
  };
  
  return { getRoute, error };
};
