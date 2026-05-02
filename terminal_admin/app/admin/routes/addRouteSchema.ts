import * as yup from "yup";

import type { RouteRow } from "./_components/RoutesTable";

export function buildAddRouteSchema(
  existingRoutes: RouteRow[],
  endTerminalIds: string[],
  assignedTerminalId: string
) {
  const endIdField =
    endTerminalIds.length > 0
      ? yup
          .string()
          .trim()
          .required("Please select an end terminal.")
          .oneOf(endTerminalIds, "Select a valid end terminal.")
      : yup.string().trim().required("Please select an end terminal.");

  return yup.object({
    route_code: yup
      .string()
      .trim()
      .required("Route code is required.")
      .min(2, "Route code must be at least 2 characters.")
      .max(64, "Route code must be at most 64 characters.")
      .test("unique-code", "This route code already exists.", (value) => {
        if (!value) return true;
        const code = value.toLowerCase();
        return !existingRoutes.some((r) => r.routeCode.toLowerCase() === code);
      }),
    route_name: yup.string().trim().max(120, "Route name must be at most 120 characters."),
    start_terminal_id: yup
      .string()
      .trim()
      .required("Start terminal is required.")
      .test("assigned", "Start terminal must match your assigned terminal.", (value) => {
        if (!assignedTerminalId) return true;
        return value === assignedTerminalId;
      }),
    end_terminal_id: endIdField,
    is_free_ride: yup.boolean().default(false),
  });
}

export type AddRouteFormValues = yup.InferType<ReturnType<typeof buildAddRouteSchema>>;

export function yupErrorsToFieldMap(
  err: yup.ValidationError
): Partial<Record<keyof AddRouteFormValues, string>> {
  const out: Partial<Record<keyof AddRouteFormValues, string>> = {};
  const issues = err.inner.length > 0 ? err.inner : [err];
  for (const issue of issues) {
    const path = issue.path as keyof AddRouteFormValues | undefined;
    if (path && out[path] == null) out[path] = issue.message;
  }
  return out;
}
