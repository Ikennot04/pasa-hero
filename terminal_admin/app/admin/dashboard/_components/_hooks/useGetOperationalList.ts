"use client";

import axios, { AxiosError } from "axios";
import { useState } from "react";

export const useGetOperationalList = () => {
  const [error, setError] = useState<string | null>(null);

  const getOperationalList = async () => {
    try {
      const assignedTerminal = localStorage?.getItem("assigned_terminal");
      const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "";

      const { data: response } = await axios.get(
        `${baseUrl}/api/terminals/${assignedTerminal}/buses-present`,
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
  return { getOperationalList, error };
};
