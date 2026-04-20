"use client";

import axios from "axios";
import { useState } from "react";

export const useGetRouteStops = () => {
  const [error, setError] = useState<string | null>(null);

  const getRouteStops = async (routeId: string) => {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
      const { data: response } = await axios.get(
        `${baseUrl}/api/route-stops/route/${routeId}`,
      );
      return response;
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message);
        return err.response?.data;
      }
      setError("Unexpected error");
    }
  };

  return { getRouteStops, error };
};
