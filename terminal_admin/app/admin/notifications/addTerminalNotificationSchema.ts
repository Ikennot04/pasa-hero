import * as yup from "yup";

import type { NotificationTargetScope } from "./terminalBroadcastCatalog";

export type AddTerminalNotificationForm = {
  title: string;
  message: string;
  notification_type: "delay" | "full" | "skipped_stop" | "info";
  priority: "high" | "medium" | "low";
  target_scope: NotificationTargetScope;
  route_id: string;
  bus_id: string;
};

export const addTerminalNotificationSchema = yup
  .object({
    title: yup.string().trim().required("Title is required").max(160),
    message: yup.string().trim().required("Message is required").max(2000),
    notification_type: yup
      .mixed<"delay" | "full" | "skipped_stop" | "info">()
      .oneOf(["delay", "full", "skipped_stop", "info"])
      .required(),
    priority: yup.mixed<"high" | "medium" | "low">().oneOf(["high", "medium", "low"]).required(),
    target_scope: yup
      .mixed<NotificationTargetScope>()
      .oneOf(["terminal", "route", "bus"])
      .required(),
    route_id: yup.string().default(""),
    bus_id: yup.string().default(""),
  })
  .test("scope-target", function (values) {
    const v = values as AddTerminalNotificationForm;
    if (v.target_scope === "route" && !v.route_id) {
      return this.createError({ path: "route_id", message: "Choose a route" });
    }
    if (v.target_scope === "bus" && !v.bus_id) {
      return this.createError({ path: "bus_id", message: "Choose a bus" });
    }
    return true;
  });
