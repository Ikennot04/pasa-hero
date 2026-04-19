"use client";

import axios from "axios";
import { useState } from "react";

export const useReorderRouteStops = () => {
  const [error, setError] = useState<string | null>(null);

  const reorderRouteStops = async (
    routeId: string,
    orderedStopIds: string[],
  ) => {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
      const { data: response } = await axios.patch(
        `${baseUrl}/api/route-stops/route/${routeId}/reorder`,
        { ordered_stop_ids: orderedStopIds },
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

  return { reorderRouteStops, error };
};
