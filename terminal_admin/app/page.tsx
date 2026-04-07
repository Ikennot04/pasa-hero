"use client";

import useAuthToken from "./_public_hooks/useAuthToken";

export default function Home() {
  // Use effect to check if the token is expired
  useAuthToken({ redirectOnSuccess: "/admin/dashboard" });

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
      <p className="text-4xl font-bold text-slate-500 dark:text-slate-400">Loading…</p>
    </div>
  );

}
