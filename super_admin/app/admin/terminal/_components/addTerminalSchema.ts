import * as yup from "yup";

const numberRequired = (msg: string) =>
  yup
    .number()
    .transform((v, o) => (o === "" || Number.isNaN(v) ? undefined : v))
    .typeError("Must be a number")
    .required(msg);

export const addTerminalSchema = yup.object({
  terminal_name: yup.string().required("Terminal name is required").trim(),
  location_lat: numberRequired("Latitude is required")
    .min(-90, "Latitude must be between -90 and 90")
    .max(90, "Latitude must be between -90 and 90"),
  location_lng: numberRequired("Longitude is required")
    .min(-180, "Longitude must be between -180 and 180")
    .max(180, "Longitude must be between -180 and 180"),
});

export type AddTerminalFormData = yup.InferType<typeof addTerminalSchema>;
