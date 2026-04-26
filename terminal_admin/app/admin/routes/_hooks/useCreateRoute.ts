"use client";

import axios from "axios";
import { useState } from "react";

type RouteType = {
  route_name: string;
  route_code: string;
  start_terminal_id: string;
  end_terminal_id: string;
  estimated_duration?: number;
  status?: string;
  route_type?: string;
  pointA?: { latitude: number; longitude: number } | null;
  pointB?: { latitude: number; longitude: number } | null;
  busStops?: Array<{ name: string; latitude: number; longitude: number }>;
};

export const useCreateRoute = () => {
  const [error, setError] = useState<string | null>(null);

  const createRoute = async (route: RouteType) => {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
      const { data: response } = await axios.post(`${baseUrl}/api/routes`, route);
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

  return { createRoute, error };
};
