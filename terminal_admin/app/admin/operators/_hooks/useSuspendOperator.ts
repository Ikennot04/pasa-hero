"use client";

import axios from "axios";
import { useCallback, useState } from "react";

function extractAxiosMessage(err: unknown): string | undefined {
  if (!axios.isAxiosError(err)) return undefined;
  const payload = err.response?.data as
    | { message?: string; error?: string }
    | undefined;
  return payload?.message ?? payload?.error;
}

async function patchOperatorStatus(
  operatorId: string,
  status: "suspended" | "active",
) {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("terminal_admin_auth_token")
      : null;
  const formData = new FormData();
  formData.append("data", JSON.stringify({ status }));
  const { data: response } = await axios.patch(
    `${baseUrl}/api/users/${operatorId}`,
    formData,
    {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    },
  );
  return response;
}

export const useSuspendOperator = () => {
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(
    async (operatorId: string, status: "suspended" | "active") => {
      try {
        setError(null);
        return await patchOperatorStatus(operatorId, status);
      } catch (err) {
        const raw =
          extractAxiosMessage(err) ??
          (axios.isAxiosError(err) ? err.message : undefined) ??
          "Request failed";
        setError(raw);
        throw new Error(raw);
      }
    },
    [],
  );

  const suspendOperator = useCallback(
    (operatorId: string) => run(operatorId, "suspended"),
    [run],
  );

  const unsuspendOperator = useCallback(
    (operatorId: string) => run(operatorId, "active"),
    [run],
  );

  return { suspendOperator, unsuspendOperator, error };
};
