import * as yup from "yup";

const durationOptional = yup
  .number()
  .transform((v, o) => (o === "" || o === null || Number.isNaN(v) ? undefined : v))
  .optional()
  .nullable()
  .min(1, "Duration must be at least 1 minute")
  .integer("Duration must be a whole number");

export const addRouteSchema = yup.object({
  route_name: yup.string().required("Route name is required").trim(),
  route_code: yup.string().required("Route code is required").trim(),
  start_terminal_id: yup.string().required("Start terminal is required"),
  end_terminal_id: yup
    .string()
    .required("End terminal is required")
    .test(
      "different",
      "Start and end terminals must be different",
      function (value) {
        return value !== this.parent.start_terminal_id;
      }
    ),
  estimated_duration: durationOptional,
});

export type AddRouteFormData = yup.InferType<typeof addRouteSchema>;
