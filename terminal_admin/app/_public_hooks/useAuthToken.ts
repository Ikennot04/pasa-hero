"use client";

import axios from "axios";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

type UseAuthTokenOptions = {
  redirectOnSuccess?: string;
};

export default function useAuthToken({ redirectOnSuccess }: UseAuthTokenOptions = {}) {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("terminal_admin_auth_token");
    if (!token) {
      router.replace("/login");
      return;
    }

    const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "";

    void (async () => {
      try {
        const { data: response } = await axios.get(`${baseUrl}/api/users/auth/check`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.success && response.data.user.role === "terminal admin") {
          localStorage.setItem("f_name", response.data.user.f_name);
          localStorage.setItem("assigned_terminal", response.data.user.assigned_terminal);
          if (redirectOnSuccess) {
            router.replace(redirectOnSuccess);
          }
        } else {
          localStorage.removeItem("terminal_admin_auth_token");
          router.replace("/login");
        }
      } catch (error) {
        if (axios.isAxiosError(error)) {
          localStorage.removeItem("terminal_admin_auth_token");
        }
        router.replace("/login");
      }
    })();
  }, [redirectOnSuccess, router]);
}
