"use client";

import axios from "axios";
import { useCallback, useState } from "react";
import { AssignmentUpdateFormData } from "../_components/assignmentTypes";

export const usePatchAssignment = () => {
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const patchAssignment = useCallback(
    async (id: string, data: AssignmentUpdateFormData) => {
      setError(null);
      try {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
        const token =
          typeof window !== "undefined"
            ? localStorage.getItem("terminal_admin_auth_token")
            : null;
        const { data: response } = await axios.patch(
          `${baseUrl}/api/bus-assignments/${id}`,
          data,
          {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          },
        );
        return response;
      } catch (err) {
        if (axios.isAxiosError(err)) {
          const data = err.response?.data as { message?: string; error?: string };
          setError(data?.message ?? data?.error ?? "Request failed");
        } else {
          setError("Unexpected error");
        }
        return null;
      }
    },
    [],
  );

  return { patchAssignment, error, clearError };
};
