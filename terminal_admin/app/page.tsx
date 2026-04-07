"use client";

import axios from "axios";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Home() {
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
        await axios.get(`${baseUrl}/api/users/auth/check`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        router.replace("/admin/dashboard");
      } catch (error) {
        if (axios.isAxiosError(error)) {
          localStorage.removeItem("terminal_admin_auth_token");
        }
        router.replace("/login");
      }
    })();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
      <p className="text-4xl font-bold text-slate-500 dark:text-slate-400">Loading…</p>
    </div>
  );

}
