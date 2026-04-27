"use client";

import axios from "axios";
import { useCallback, useState } from "react";

export const useUpdateDriver = () => {
  const [error, setError] = useState<string | null>(null);

  const updateDriver = useCallback(
    async (driverId: string, driverData: unknown) => {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
        const { data: response } = await axios.patch(
          `${baseUrl}/api/drivers/${driverId}`,
          driverData,
        );
        return response;
      } catch (error) {
        if (axios.isAxiosError(error)) {
          setError(error.response?.data.message);
        } else {
          setError("Unexpected error");
        }
      }
    },
    [],
  );
  return { updateDriver, error };
};
