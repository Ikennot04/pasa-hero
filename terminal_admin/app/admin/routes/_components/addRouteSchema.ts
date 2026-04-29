import * as yup from "yup";

const durationOptional = yup
  .number()
  .transform((v, o) => (o === "" || o === null || Number.isNaN(v) ? undefined : v))
  .required("ETA is required")
  .min(1, "Duration must be at least 1 minute")
  .integer("Duration must be a whole number");

export const addRouteSchema = yup.object({
  route_name: yup.string().required("Route name is required").trim(),
  route_code: yup.string().required("Route code is required").trim(),
  start_terminal_id: yup.string().required("Start terminal is required"),
  end_terminal_id: yup
    .string()
    .optional()
    .transform((value) => (typeof value === "string" ? value.trim() : value))
    .test(
      "different",
      "Start and end terminals must be different",
      function (value) {
        if (!value) return true;
        return value !== this.parent.start_terminal_id;
      },
    ),
  start_location: yup.string().required("Start location is required").trim(),
  end_location: yup.string().required("End location is required").trim(),
  estimated_duration: durationOptional,
});

export type AddRouteFormData = yup.InferType<typeof addRouteSchema>;

export const editRouteSchema = addRouteSchema.shape({
  status: yup
    .string()
    .oneOf(["active", "inactive", "suspended"], "Invalid status")
    .required("Status is required"),
});

export type EditRouteFormData = yup.InferType<typeof editRouteSchema>;
