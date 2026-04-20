"use client";

import axios from "axios";
import { useState } from "react";

export const useDeleteRouteStops = () => {
  const [error, setError] = useState<string | null>(null);

  const deleteRouteStop = async (stopId: string) => {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
      const { data: response } = await axios.delete(
        `${baseUrl}/api/route-stops/${stopId}`,
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

  return { deleteRouteStop, error };
};
