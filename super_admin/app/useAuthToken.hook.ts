"use client";

import axios from "axios";
import { useCallback, useState } from "react";

const ALLOWED_ROLES = new Set(["super admin", "admin"]);

export const useAuthToken = () => {
  const [error, setError] = useState<string | null>(null);

  const authToken = useCallback(async () => {
    try {
      const token = localStorage.getItem("super_admin_auth_token");
      if (!token) {
        return null;
      }
      const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
      const { data: response } = await axios.get(`${baseUrl}/api/users/auth/check`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (
        response.success &&
        ALLOWED_ROLES.has(response.data.user.role)
      ) {
        return response.data;
      }
      return null;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        setError(error.response?.data.message);
        return error.response?.data;
      } else {
        setError("Unexpected error");
      }
      setError("Unexpected error");
    }
  }, []);

  return { authToken, error };
};
