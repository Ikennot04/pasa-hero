"use client";

import axios from "axios";
import { useState } from "react";

export const useGetRoutes = () => {
  const [error, setError] = useState<string | null>(null);

  const getRoutes = async () => {
    const terminalId = localStorage?.getItem("assigned_terminal");
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
      const { data: response } = await axios.get(`${baseUrl}/api/routes/terminal/${terminalId}`);

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
  
  return { getRoutes, error };
};
