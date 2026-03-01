import * as yup from "yup";

const notificationType = yup
  .string()
  .oneOf(["delay", "full", "skipped_stop", "info"], "Invalid notification type")
  .required("Notification type is required");

const priority = yup
  .string()
  .oneOf(["high", "medium", "low"], "Invalid priority")
  .required("Priority is required");

const scope = yup
  .string()
  .oneOf(["bus", "route", "terminal", "system"], "Invalid scope")
  .required("Scope is required");

export const addNotificationSchema = yup.object({
  title: yup.string().required("Title is required").trim().max(200, "Title is too long"),
  message: yup.string().required("Message is required").trim().max(1000, "Message is too long"),
  notification_type: notificationType,
  priority,
  scope,
  bus_id: yup
    .string()
    .trim()
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .default(null),
  route_id: yup
    .string()
    .trim()
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .default(null),
  terminal_id: yup
    .string()
    .trim()
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .default(null),
});

export type AddNotificationFormData = yup.InferType<typeof addNotificationSchema>;
