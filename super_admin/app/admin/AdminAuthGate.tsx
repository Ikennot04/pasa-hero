"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useAuthToken } from "../useAuthToken.hook";

export default function AdminAuthGate({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const router = useRouter();
  const { authToken } = useAuthToken();
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  useEffect(() => {
    void (async () => {
      const result = await authToken();
      if (!result?.user) {
        router.replace("/login");
        return;
      }
      setIsCheckingSession(false);
    })();
  }, [authToken, router]);

  if (isCheckingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <p className="text-4xl font-bold text-slate-500 dark:text-slate-400">Loading…</p>
      </div>
    );
  }

  return <>{children}</>;
}
