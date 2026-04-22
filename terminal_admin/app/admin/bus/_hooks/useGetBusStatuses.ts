"use client";

import axios from "axios";
import { useState } from "react";

export const useGetBusStatuses = () => {
  const [error, setError] = useState<string | null>(null);

  const getBusStatuses = async () => {
    try {
      const assignedTerminal = localStorage?.getItem("assigned_terminal");
      const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "";

      const { data: response } = await axios.get(
        `${baseUrl}/api/bus-status/terminal/${assignedTerminal}`,
      );
      
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

  return { getBusStatuses, error };
};
