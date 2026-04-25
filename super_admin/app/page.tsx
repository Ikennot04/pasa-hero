"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuthToken } from "./useAuthToken.hook";

export default function Home() {
  const router = useRouter();
  const { authToken } = useAuthToken();

  useEffect(() => {
    void (async () => {
      const result = await authToken();
      if (result?.user) {
        router.replace("/admin/dashboard");
      } else {
        router.replace("/login");
      }
    })();
  }, [authToken, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
      <p className="text-4xl font-bold text-slate-500 dark:text-slate-400">Loading…</p>
    </div>
  );
}
