"use client";

import axios from "axios";
import { useCallback, useState } from "react";
import { CreateTerminalAdminFormData } from "../_components/createUserSchema";

export const usePostTerminalAdmin = () => {
  const [error, setError] = useState<string | null>(null);

  const postTerminalAdmin = useCallback(
    async (data: CreateTerminalAdminFormData) => {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
        const { data: response } = await axios.post(
          `${baseUrl}/api/users`,
          data,
        );
        return response;
      } catch (error) {
        if (axios.isAxiosError(error)) {
          setError(error.response?.data.message);
        } else {
          setError("Unexpected error");
        }
        return null;
      }
    },
    [],
  );
  return { postTerminalAdmin, error };
};
