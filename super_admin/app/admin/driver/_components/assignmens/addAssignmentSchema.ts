import * as yup from "yup";

export const addAssignmentSchema = yup.object({
  driver_id: yup.string().required("Driver is required").trim(),
  bus_id: yup.string().required("Bus is required").trim(),
  route_id: yup.string().required("Route is required").trim(),
  operator_user_id: yup.string().required("Operator is required").trim(),
});

export type AddAssignmentFormData = yup.InferType<typeof addAssignmentSchema>;
