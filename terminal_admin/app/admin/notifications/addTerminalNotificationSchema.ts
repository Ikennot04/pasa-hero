import * as yup from "yup";

export type AddTerminalNotificationForm = {
  title: string;
  message: string;
  notification_type: "info" | "other" | "custom";
  priority: "medium";
  target_scope: "terminal";
  route_id: string;
  bus_id: string;
};

export const addTerminalNotificationSchema = yup
  .object({
    title: yup.string().trim().required("Title is required").max(160),
    message: yup.string().trim().required("Message is required").max(2000),
    notification_type: yup
      .mixed<"info" | "other" | "custom">()
      .oneOf(["info", "other", "custom"])
      .required(),
    priority: yup.mixed<"medium">().oneOf(["medium"]).required(),
    target_scope: yup.mixed<"terminal">().oneOf(["terminal"]).required(),
    route_id: yup.string().default(""),
    bus_id: yup.string().default(""),
  });
