"use client";

import axios from "axios";
import { useCallback, useState } from "react";
import { AssignmentFormData } from "../_components/assignmentTypes";

export const usePostAssignment = () => {
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const postAssignment = useCallback(async (data: AssignmentFormData) => {
    setError(null);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
      const { data: response } = await axios.post(`${baseUrl}/api/bus-assignments`, data);
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
  }, []);

  return { postAssignment, error, clearError };
};