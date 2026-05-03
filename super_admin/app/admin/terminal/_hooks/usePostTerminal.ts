"use client";

import axios from "axios";
import { useCallback, useState } from "react";
import { AddTerminalFormData } from "../_components/addTerminalSchema";

export const usePostTerminal = () => {
  const [error, setError] = useState<string | null>(null);

  const postTerminal = useCallback(async (data: AddTerminalFormData) => {
    setError(null);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
      const token =
        typeof window !== "undefined"
          ? localStorage.getItem("super_admin_auth_token")
          : null;
      const { data: response } = await axios.post(
        `${baseUrl}/api/terminals`,
        data,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        },
      );
      return response;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const data = error.response?.data as { message?: string; error?: string };
        setError(data?.message ?? data?.error ?? "Request failed");
      } else {
        setError("Unexpected error");
      }
      return null;
    }
  }, []);

  return { postTerminal, error };
}