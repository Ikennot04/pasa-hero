"use client";

import axios from "axios";
import { useCallback, useState } from "react";
import type { NotificationProps } from "../NotificationProps";

type PopulatedRef =
  | string
  | {
      _id?: string;
      f_name?: string;
      l_name?: string;
      bus_number?: string;
      route_name?: string;
      terminal_name?: string;
    }
  | null;

type RawNotification = {
  _id?: string;
  id?: string;
  sender_id?: PopulatedRef;
  bus_id?: PopulatedRef;
  route_id?: PopulatedRef;
  terminal_id?: PopulatedRef;
  title?: string;
  message?: string;
  notification_type?: string;
  priority?: string;
  scope?: string;
  createdAt?: string;
  updatedAt?: string;
};

function getRefId(value: PopulatedRef): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  return value._id ?? null;
}

function normalizeNotification(item: RawNotification): NotificationProps {
  const sender = item.sender_id;
  const bus = item.bus_id;
  const route = item.route_id;
  const terminal = item.terminal_id;

  const senderName =
    sender && typeof sender !== "string"
      ? [sender.f_name, sender.l_name].filter(Boolean).join(" ").trim()
      : undefined;

  return {
    id: item.id ?? item._id ?? "",
    sender_id: getRefId(sender ?? null) ?? "",
    bus_id: getRefId(bus ?? null),
    route_id: getRefId(route ?? null),
    terminal_id: getRefId(terminal ?? null),
    title: item.title ?? "",
    message: item.message ?? "",
    notification_type: (item.notification_type ?? "info") as NotificationProps["notification_type"],
    priority: (item.priority ?? "medium") as NotificationProps["priority"],
    scope: (item.scope ?? "system") as NotificationProps["scope"],
    sender_name: senderName || undefined,
    bus_number:
      bus && typeof bus !== "string" ? bus.bus_number ?? undefined : undefined,
    route_name:
      route && typeof route !== "string"
        ? route.route_name ?? undefined
        : undefined,
    terminal_name:
      terminal && typeof terminal !== "string"
        ? terminal.terminal_name ?? undefined
        : undefined,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

export const useGetNotifications = () => {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const getNotifications = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
      const { data } = await axios.get(`${baseUrl}/api/notifications`);
      const rawNotifications = Array.isArray(data?.data)
        ? data.data
        : Array.isArray(data)
          ? data
          : [];
      return rawNotifications.map((item: RawNotification) =>
        normalizeNotification(item),
      );
    } catch (error) {
      if (axios.isAxiosError(error)) {
        setError(error.response?.data?.message ?? "Failed to fetch notifications");
      } else {
        setError("Unexpected error");
      }
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);
  return { getNotifications, error, isLoading };
};