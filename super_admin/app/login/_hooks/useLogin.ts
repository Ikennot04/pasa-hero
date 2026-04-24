"use client";

import axios from "axios";
import { useState } from "react";

type LoginType = {
  email: string;
  password: string;
}

export const useLogin = () => {
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (data: LoginType) => {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
      const { data: response } = await axios.post(`${baseUrl}/api/users/auth/signin`, data);
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

  return { handleLogin, error };
};