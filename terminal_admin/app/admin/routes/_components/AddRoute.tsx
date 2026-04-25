"use client";

import { useEffect, useRef, useState } from "react";
import * as yup from "yup";

import { buildAddRouteSchema, yupErrorsToFieldMap, type AddRouteFormValues } from "../addRouteSchema";
import { useCreateRoute } from "../_hooks/useCreateRoute";
import { useGetTerminalNames } from "../_hooks/useGetTerminalNames";
import type { RouteRow } from "./Routes";

type NewRouteForm = {
  route_code: string;
  route_name: string;
  start_terminal_id: string;
  end_terminal_id: string;
};

type AddRouteProps = {
  routes: RouteRow[];
  setRoutes: React.Dispatch<React.SetStateAction<RouteRow[]>>;
  setToast: React.Dispatch<React.SetStateAction<string | null>>;
  onCreated?: () => void | Promise<void>;
};

const EMPTY_FORM: NewRouteForm = {
  route_code: "",
  route_name: "",
  start_terminal_id: "",
  end_terminal_id: "",
};

type TerminalNameRow = { _id?: string; terminal_name?: string };

export default function AddRoute({ routes, setRoutes, setToast, onCreated }: AddRouteProps) {
  const [openAddModal, setOpenAddModal] = useState(false);
  const [form, setForm] = useState<NewRouteForm>(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof NewRouteForm, string>>>({});
  const [endTerminalOptions, setEndTerminalOptions] = useState<TerminalNameRow[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const { getTerminalNames } = useGetTerminalNames();
  const { createRoute } = useCreateRoute();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (openAddModal) dialog.showModal();
    else dialog.close();
    const onClose = () => setOpenAddModal(false);
    dialog.addEventListener("close", onClose);
    return () => dialog.removeEventListener("close", onClose);
  }, [openAddModal]);

  async function onOpenAddModal() {
    setFieldErrors({});
    setForm({
      ...EMPTY_FORM,
      start_terminal_id: localStorage.getItem("assigned_terminal") ?? "",
    });
    setOpenAddModal(true);
    const assignedId = localStorage.getItem("assigned_terminal") ?? "";
    const res = await getTerminalNames();
    if (res?.success && Array.isArray(res.data)) {
      const rows = (res.data as TerminalNameRow[])
        .filter((row) => {
          const id = row._id != null ? String(row._id) : "";
          return id && id !== assignedId && Boolean(row.terminal_name?.trim());
        })
        .sort((a, b) => (a.terminal_name ?? "").localeCompare(b.terminal_name ?? ""));
      setEndTerminalOptions(rows);
    } else {
      setEndTerminalOptions([]);
      const message =
        typeof res === "object" && res !== null && "message" in res
          ? String((res as { message: unknown }).message)
          : "Could not load terminal names.";
      setToast(message);
    }
  }

  function onChange<K extends keyof NewRouteForm>(key: K, value: NewRouteForm[K]) {
    setFieldErrors((prev) => ({ ...prev, [key]: undefined }));
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function onCreateRoute(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const assignedId = localStorage.getItem("assigned_terminal") ?? "";
    if (!assignedId) {
      setToast("Assigned terminal is missing. Please sign in again.");
      return;
    }

    const endIds = endTerminalOptions
      .map((t) => (t._id != null ? String(t._id) : ""))
      .filter(Boolean);
    const schema = buildAddRouteSchema(routes, endIds, assignedId);

    try {
      const validated = schema.validateSync(form, {
        abortEarly: false,
        stripUnknown: true,
      }) as AddRouteFormValues;
      setFieldErrors({});

      const route_code = validated.route_code.trim().toUpperCase();
      const assignedName = localStorage.getItem("assigned_terminal_name")?.trim() ?? "";
      const endName =
        endTerminalOptions.find((t) => String(t._id) === validated.end_terminal_id)?.terminal_name?.trim() ??
        validated.end_terminal_id;
      const route_name =
        validated.route_name?.trim() ||
        (assignedName && endName ? `${assignedName} – ${endName}` : `${validated.start_terminal_id} – ${endName}`);

      const payload = {
        route_name,
        route_code,
        start_terminal_id: validated.start_terminal_id,
        end_terminal_id: validated.end_terminal_id,
      };

      setIsSubmitting(true);
      try {
        const res = await createRoute(payload);
        if (res && typeof res === "object" && "success" in res && res.success === true) {
          const doc = res.data as
            | { _id?: string; route_code?: string; route_name?: string; status?: string; updatedAt?: string }
            | undefined;
          await onCreated?.();
          if (!onCreated && doc?._id) {
            const next: RouteRow = {
              id: String(doc._id),
              routeCode: doc.route_code ?? route_code,
              routeName: doc.route_name ?? route_name,
              startRoute: assignedName || validated.start_terminal_id,
              endRoute: endName,
              status: doc.status === "active" ? "active" : "paused",
              active_buses_count: 0,
              updatedAt: doc.updatedAt ?? new Date().toISOString(),
            };
            setRoutes((prev) => [next, ...prev]);
          }
          setOpenAddModal(false);
          setToast(`Route ${route_code} added.`);
          return;
        }
        const message =
          res && typeof res === "object" && "message" in res
            ? String((res as { message: unknown }).message)
            : "Could not create route.";
        setToast(message);
      } finally {
        setIsSubmitting(false);
      }
    } catch (err) {
      if (err instanceof yup.ValidationError) {
        setFieldErrors(yupErrorsToFieldMap(err) as Partial<Record<keyof NewRouteForm, string>>);
        setToast(err.errors[0] ?? "Please fix the form errors.");
        return;
      }
      throw err;
    }
  }

  return (
    <>
      <button type="button" className="btn bg-[#0062CA] text-white" onClick={onOpenAddModal}>
        Add route
      </button>

      <dialog ref={dialogRef} className="modal">
        <div className="modal-box max-w-xl">
          <h3 className="text-xl font-bold">Add route</h3>
          <p className="mt-1 text-sm text-base-content/70">
            Create a new route profile with core operational details.
          </p>

          <form className="mt-4 space-y-3" onSubmit={onCreateRoute}>
            <div className="rounded-lg border border-base-300 p-3 sm:p-4">
              <p className="mb-3 text-sm font-semibold text-base-content/80">Route identity</p>
              <div className="grid grid-cols-1 gap-3">
                <label className="form-control w-full">
                  <span className="label-text font-medium">Route code</span>
                  <input
                    className={`input input-bordered w-full${fieldErrors.route_code ? " input-error" : ""}`}
                    placeholder="e.g. PITX-QC-05"
                    value={form.route_code}
                    onChange={(e) => onChange("route_code", e.target.value)}
                    aria-invalid={fieldErrors.route_code ? true : undefined}
                  />
                  {fieldErrors.route_code ? (
                    <span className="label-text-alt text-error">{fieldErrors.route_code}</span>
                  ) : null}
                </label>
                <label className="form-control w-full">
                  <span className="label-text font-medium">Route name (optional)</span>
                  <input
                    className={`input input-bordered w-full${fieldErrors.route_name ? " input-error" : ""}`}
                    placeholder="e.g. PITX — Fairview; leave blank to use start – end"
                    value={form.route_name}
                    onChange={(e) => onChange("route_name", e.target.value)}
                    aria-invalid={fieldErrors.route_name ? true : undefined}
                  />
                  {fieldErrors.route_name ? (
                    <span className="label-text-alt text-error">{fieldErrors.route_name}</span>
                  ) : null}
                </label>
              </div>
            </div>

            <div className="rounded-lg border border-base-300 p-3 sm:p-4">
              <p className="mb-3 text-sm font-semibold text-base-content/80">Route coverage</p>
              <label className="form-control w-full">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className="form-control w-full">
                    <span className="label-text font-medium">Start terminal</span>
                    <input
                      className={`input input-bordered w-full${fieldErrors.start_terminal_id ? " input-error" : ""}`}
                      placeholder="Assigned terminal"
                      value={
                        typeof window !== "undefined"
                          ? localStorage.getItem("assigned_terminal_name")?.trim() || form.start_terminal_id
                          : form.start_terminal_id
                      }
                      disabled
                      readOnly
                      aria-invalid={fieldErrors.start_terminal_id ? true : undefined}
                    />
                    {fieldErrors.start_terminal_id ? (
                      <span className="label-text-alt text-error">{fieldErrors.start_terminal_id}</span>
                    ) : null}
                  </label>
                  <label className="form-control w-full">
                    <span className="label-text font-medium">End terminal</span>
                    <select
                      className={`select select-bordered w-full${fieldErrors.end_terminal_id ? " select-error" : ""}`}
                      value={form.end_terminal_id}
                      onChange={(e) => onChange("end_terminal_id", e.target.value)}
                      aria-invalid={fieldErrors.end_terminal_id ? true : undefined}
                    >
                      <option value="">Select end terminal</option>
                      {endTerminalOptions.map((row) => {
                        const id = row._id != null ? String(row._id) : "";
                        if (!id) return null;
                        return (
                          <option key={id} value={id}>
                            {row.terminal_name?.trim() ?? id}
                          </option>
                        );
                      })}
                    </select>
                    {fieldErrors.end_terminal_id ? (
                      <span className="label-text-alt text-error">{fieldErrors.end_terminal_id}</span>
                    ) : null}
                  </label>
                </div>
              </label>
            </div>

            <div className="modal-action flex-wrap gap-2">
              <button
                type="button"
                className="btn btn-ghost"
                disabled={isSubmitting}
                onClick={() => setOpenAddModal(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className={`btn bg-[#0062CA] text-white${isSubmitting ? " loading" : ""}`}
                disabled={isSubmitting}
              >
                Add route
              </button>
            </div>
          </form>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button type="submit" aria-label="Close">
            close
          </button>
        </form>
      </dialog>
    </>
  );
}
