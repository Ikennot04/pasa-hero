import * as yup from "yup";
import type {
  AssignmentResult,
  AssignmentStatus,
} from "./assignmentTypes";

const ASSIGNMENT_STATUS_VALUES: AssignmentStatus[] = ["active", "inactive"];
const ASSIGNMENT_RESULT_VALUES: AssignmentResult[] = [
  "pending",
  "completed",
  "cancelled",
];

export const updateAssignmentSchema = yup.object({
  assignment_status: yup
    .string()
    .oneOf(ASSIGNMENT_STATUS_VALUES, "Invalid status")
    .required("Status is required"),
  assignment_result: yup
    .string()
    .oneOf(ASSIGNMENT_RESULT_VALUES, "Invalid result")
    .required("Result is required"),
});
