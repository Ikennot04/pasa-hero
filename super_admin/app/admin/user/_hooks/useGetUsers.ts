"use client";

import axios from "axios";
import { useCallback, useState } from "react";

export const useGetUsers = () => {
  const [error, setError] = useState<string | null>(null);

  const getUsers = useCallback(async () => {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
      const { data: response } = await axios.get(`${baseUrl}/api/users`);
      return response;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        setError(error.response?.data.message);
      } else {
        setError("Unexpected error");
      }
      return null;
    }
  }, []);
  return { getUsers, error };
}