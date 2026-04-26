"use client";

import axios from "axios";
import { useCallback, useState } from "react";
import type { SystemLogProps } from "../_components/SystemLogProps";

type PopulatedUser =
  | string
  | {
      _id?: string;
      f_name?: string;
      l_name?: string;
      email?: string;
    }
  | null;

type RawSystemLog = {
  _id?: string;
  id?: string;
  user_id?: PopulatedUser;
  action?: string;
  description?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

function getUserId(value: PopulatedUser): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value._id != null ? String(value._id) : "";
}

function normalizeSystemLog(item: RawSystemLog): SystemLogProps {
  const user = item.user_id;
  const userName =
    user && typeof user !== "string"
      ? [user.f_name, user.l_name].filter(Boolean).join(" ").trim()
      : undefined;

  return {
    id: String(item._id ?? item.id ?? ""),
    user_id: getUserId(user ?? null),
    action: item.action ?? "",
    description: item.description ?? null,
    user_name: userName || undefined,
    user_email:
      user && typeof user !== "string" ? user.email ?? undefined : undefined,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

export const useGetSystemLogs = () => {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const getSystemLogs = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
      const { data } = await axios.get(`${baseUrl}/api/system-logs`);
      const raw = Array.isArray(data?.data)
        ? data.data
        : Array.isArray(data)
          ? data
          : [];
      return raw.map((item: RawSystemLog) => normalizeSystemLog(item));
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(
          err.response?.data?.message ?? "Failed to fetch system logs",
        );
      } else {
        setError("Unexpected error");
      }
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  const bulkDeleteSystemLogs = useCallback(async (ids: string[]) => {
    setError(null);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
      await axios.post(`${baseUrl}/api/system-logs/bulk-delete`, { ids });
      return true;
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const msg =
          (err.response?.data as { message?: string })?.message ??
          "Failed to delete logs";
        setError(msg);
      } else {
        setError("Unexpected error");
      }
      return false;
    }
  }, []);

  return { getSystemLogs, bulkDeleteSystemLogs, error, isLoading };
};
