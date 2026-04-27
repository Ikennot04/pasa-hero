"use client";

import axios from "axios";
import { useCallback, useState } from "react";

const AUTH_TOKEN_KEY = "super_admin_auth_token";

function decodeJwtUserId(token: string): string | null {
  try {
    const payloadSegment = token.split(".")[1];
    if (!payloadSegment) return null;
    const payloadJson = atob(payloadSegment.replace(/-/g, "+").replace(/_/g, "/"));
    const payload = JSON.parse(payloadJson) as { userId?: unknown; _id?: unknown; id?: unknown };
    const raw = payload.userId ?? payload._id ?? payload.id;
    return raw == null ? null : String(raw);
  } catch {
    return null;
  }
}

export const usePostNotifications = () => {
  const [error, setError] = useState<string | null>(null);

  const postNotifications = useCallback(async (notificationData: unknown) => {
    try {
      setError(null);
      const token =
        typeof window === "undefined" ? null : localStorage.getItem(AUTH_TOKEN_KEY);
      const senderId = token ? decodeJwtUserId(token) : null;
      if (!senderId) {
        throw new Error("Unable to identify current user.");
      }

      const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
      const payload =
        notificationData && typeof notificationData === "object"
          ? { ...(notificationData as Record<string, unknown>), sender_id: senderId }
          : { sender_id: senderId };
      const { data: response } = await axios.post(
        `${baseUrl}/api/notifications`,
        payload,
      );
      return response;
    } catch (error) {
      let message = "Unexpected error";
      if (axios.isAxiosError(error)) {
        message = error.response?.data?.message || "Failed to create notification";
      }
      setError(message);
      throw new Error(message);
    }
  }, []);
  return { postNotifications, error };
};
