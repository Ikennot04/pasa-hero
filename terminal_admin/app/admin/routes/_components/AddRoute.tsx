"use client";

import { useEffect, useRef, useState } from "react";
import type { RouteRow } from "./Routes";

type NewRouteForm = {
  routeCode: string;
  startRoute: string;
  endRoute: string;
  estimatedDurationMinutes: string;
};

type AddRouteProps = {
  routes: RouteRow[];
  setRoutes: React.Dispatch<React.SetStateAction<RouteRow[]>>;
  setToast: React.Dispatch<React.SetStateAction<string | null>>;
};

const EMPTY_FORM: NewRouteForm = {
  routeCode: "",
  startRoute: "",
  endRoute: "",
  estimatedDurationMinutes: "",
};

export default function AddRoute({ routes, setRoutes, setToast }: AddRouteProps) {
  const [openAddModal, setOpenAddModal] = useState(false);
  const [form, setForm] = useState<NewRouteForm>(EMPTY_FORM);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (openAddModal) dialog.showModal();
    else dialog.close();
    const onClose = () => setOpenAddModal(false);
    dialog.addEventListener("close", onClose);
    return () => dialog.removeEventListener("close", onClose);
  }, [openAddModal]);

  function onOpenAddModal() {
    setForm(EMPTY_FORM);
    setOpenAddModal(true);
  }

  function onChange<K extends keyof NewRouteForm>(key: K, value: NewRouteForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function onCreateRoute(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const routeCode = form.routeCode.trim().toUpperCase();
    const startRoute = form.startRoute.trim();
    const endRoute = form.endRoute.trim();
    const estimatedDurationMinutes = Number(form.estimatedDurationMinutes);

    if (!routeCode || !startRoute || !endRoute) {
      setToast("Please complete all required route details.");
      return;
    }
    if (!Number.isFinite(estimatedDurationMinutes) || estimatedDurationMinutes <= 0) {
      setToast("ETA must be a valid positive number.");
      return;
    }
    const exists = routes.some((r) => r.routeCode.toLowerCase() === routeCode.toLowerCase());
    if (exists) {
      setToast(`Route code ${routeCode} already exists.`);
      return;
    }

    const next: RouteRow = {
      id: `route-${crypto.randomUUID()}`,
      routeCode,
      startRoute,
      endRoute,
      estimatedDurationMinutes: Math.round(estimatedDurationMinutes),
      status: "active",
      activeBusCount: 0,
      tripsToday: 0,
      updatedAt: new Date().toISOString(),
    };

    setRoutes((prev) => [next, ...prev]);
    setOpenAddModal(false);
    setToast(`Route ${routeCode} added.`);
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
                    className="input input-bordered w-full"
                    placeholder="e.g. PITX-QC-05"
                    value={form.routeCode}
                    onChange={(e) => onChange("routeCode", e.target.value)}
                  />
                </label>
              </div>
            </div>

            <div className="rounded-lg border border-base-300 p-3 sm:p-4">
              <p className="mb-3 text-sm font-semibold text-base-content/80">Route coverage</p>
              <label className="form-control w-full">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className="form-control w-full">
                    <span className="label-text font-medium">Start route</span>
                    <input
                      className="input input-bordered w-full"
                      placeholder="e.g. PITX"
                      value={form.startRoute}
                      onChange={(e) => onChange("startRoute", e.target.value)}
                    />
                  </label>
                  <label className="form-control w-full">
                    <span className="label-text font-medium">End route</span>
                    <input
                      className="input input-bordered w-full"
                      placeholder="e.g. Fairview"
                      value={form.endRoute}
                      onChange={(e) => onChange("endRoute", e.target.value)}
                    />
                  </label>
                </div>
              </label>
            </div>

            <div className="rounded-lg border border-base-300 p-3 sm:p-4">
              <p className="mb-3 text-sm font-semibold text-base-content/80">Operations setup</p>
              <div className="grid grid-cols-1 gap-3">
                <label className="form-control w-full">
                  <span className="label-text font-medium">ETA (minutes)</span>
                  <input
                    type="number"
                    min={1}
                    className="input input-bordered w-full"
                    value={form.estimatedDurationMinutes}
                    onChange={(e) => onChange("estimatedDurationMinutes", e.target.value)}
                  />
                </label>
              </div>
            </div>

            <div className="modal-action flex-wrap gap-2">
              <button type="button" className="btn btn-ghost" onClick={() => setOpenAddModal(false)}>
                Cancel
              </button>
              <button type="submit" className="btn bg-[#0062CA] text-white">
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
