"use client";

import axios from "axios";
import { useState } from "react";

export const useUpdateRouteStop = () => {
  const [error, setError] = useState<string | null>(null);

  const updateRouteStop = async (stopId: string, body: { stop_name: string }) => {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
      const { data: response } = await axios.patch(
        `${baseUrl}/api/route-stops/${stopId}`,
        body,
      );
      return response;
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message);
        return err.response?.data;
      }
      setError("Unexpected error");
      return { success: false, message: "Unexpected error" };
    }
  };

  return { updateRouteStop, error };
};
