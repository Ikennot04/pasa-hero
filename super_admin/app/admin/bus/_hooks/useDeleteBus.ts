"use client";

import axios from "axios";
import { useCallback, useState } from "react";

export const useDeleteBus = () => {
  const [error, setError] = useState<string | null>(null);

  const deleteBus = useCallback(async (busId: string) => {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
      const { data: response } = await axios.delete(
        `${baseUrl}/api/buses/${busId}`,
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
  return { deleteBus, error };
};
