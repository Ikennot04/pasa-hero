"use client";

import axios from "axios";
import { useState } from "react";

export const useGetDashboardSummary = () => {
  const [error, setError] = useState<string | null>(null);

  const getDashboardSummary = async () => {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
      const { data: response } = await axios.get(`${baseUrl}/api/admin-dashboard/counts`);
      return response;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        setError(error.response?.data.error);
      } else {
        setError("Unexpected error");
      }
    }
  };
  return { getDashboardSummary, error };
};