"use client";

import axios from "axios";
import { useCallback, useEffect, useState } from "react";
import type { UserRow } from "../_components/UserTable";

type ApiUser = {
  _id: string;
  f_name: string;
  l_name: string;
  email: string;
  role: string;
  status: string;
};

type UsersListResponse = {
  success: boolean;
  data: ApiUser[];
};

const mapToUserRow = (u: ApiUser): UserRow => ({
  id: String(u._id),
  f_name: u.f_name,
  l_name: u.l_name,
  email: u.email,
  role: u.role,
  status: u.status,
});

export const useGetUsers = () => {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
      const token = typeof window !== "undefined"
        ? localStorage.getItem("super_admin_auth_token")
        : null;
      const { data: body } = await axios.get<UsersListResponse>(
        `${baseUrl}/api/users`,
        token ? { headers: { Authorization: `Bearer ${token}` } } : undefined,
      );
      if (body?.success && Array.isArray(body.data)) {
        setUsers(body.data.map(mapToUserRow));
      } else {
        setUsers([]);
        setError("Invalid users response");
      }
    } catch (err) {
      setUsers([]);
      if (axios.isAxiosError(err)) {
        const msg =
          err.response?.data?.message ?? err.response?.data?.error;
        setError(typeof msg === "string" ? msg : "Request failed");
      } else {
        setError("Unexpected error");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { users, loading, error, refetch };
};
