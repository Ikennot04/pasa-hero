"use client";

import axios from "axios";
import { useCallback, useState } from "react";

function extractAxiosMessage(err: unknown): string | undefined {
  if (!axios.isAxiosError(err)) return undefined;
  const d = err.response?.data as { message?: string; error?: string } | undefined;
  return d?.message ?? d?.error;
}

async function patchUserStatus(
  userId: string,
  status: "suspended" | "active",
) {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
  const formData = new FormData();
  formData.append("data", JSON.stringify({ status }));
  const { data: response } = await axios.patch(
    `${baseUrl}/api/users/${userId}`,
    formData,
  );
  return response;
}

/** PATCH /api/users/:id expects multipart field `data` as JSON (see user.controller updateUser). */
export const useSuspendUser = () => {
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async (userId: string, status: "suspended" | "active") => {
    try {
      setError(null);
      return await patchUserStatus(userId, status);
    } catch (err) {
      const raw =
        extractAxiosMessage(err) ??
        (axios.isAxiosError(err) ? err.message : undefined) ??
        "Request failed";
      setError(raw);
      throw new Error(raw);
    }
  }, []);

  const suspendUser = useCallback(
    (userId: string) => run(userId, "suspended"),
    [run],
  );

  const unsuspendUser = useCallback(
    (userId: string) => run(userId, "active"),
    [run],
  );

  return { suspendUser, unsuspendUser, error };
};
