import * as yup from "yup";

export const addBusSchema = yup.object({
  bus_number: yup.string().required("Bus number is required").trim(),
  plate_number: yup.string().required("Plate number is required").trim(),
  maximum_capacity: yup
    .number()
    .typeError("Must be a number")
    .required("Maximum capacity is required")
    .integer("Must be a whole number")
    .min(1, "Must be at least 1")
    .max(100, "Must be 100 or less"),
});

export type AddBusFormData = yup.InferType<typeof addBusSchema>;
