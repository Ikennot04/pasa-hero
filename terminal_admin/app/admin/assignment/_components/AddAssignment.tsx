"use client";

import { yupResolver } from "@hookform/resolvers/yup";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useGetAvailables } from "../_hooks/useGetAvailables";
import { usePostAssignment } from "../_hooks/usePostAssignment";
import { addAssignmentSchema } from "./addAssignmentSchema";
import type { AssignmentFormData } from "./assignmentTypes";

type AvailableBus = { _id: string; bus_number?: string };
type AvailableRoute = { _id: string; route_name?: string };
type AvailablePerson = { _id: string; f_name?: string; l_name?: string };
type AvailableResources = {
  buses?: AvailableBus[];
  routes?: AvailableRoute[];
  operators?: AvailablePerson[];
  drivers?: AvailablePerson[];
};

type AddAssignmentModalProps = {
  onAdded?: () => void;
};

export default function AddAssignmentModal({ onAdded }: AddAssignmentModalProps) {
  const [open, setOpen] = useState(false);
  const [buses, setBuses] = useState<AvailableBus[]>([]);
  const [routes, setRoutes] = useState<AvailableRoute[]>([]);
  const [operators, setOperators] = useState<AvailablePerson[]>([]);
  const [drivers, setDrivers] = useState<AvailablePerson[]>([]);
  const [loadingAvailables, setLoadingAvailables] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const { getAvailables, error: availablesError } = useGetAvailables();
  const { postAssignment, error: postError, clearError: clearPostError } = usePostAssignment();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AssignmentFormData>({
    resolver: yupResolver(addAssignmentSchema),
    defaultValues: {
      driver_id: "",
      bus_id: "",
      route_id: "",
      operator_user_id: "",
    },
  });

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open) dialog.showModal();
    else dialog.close();
    const onClose = () => setOpen(false);
    dialog.addEventListener("close", onClose);
    return () => dialog.removeEventListener("close", onClose);
  }, [open]);

  function closeModal() {
    clearPostError();
    setOpen(false);
    reset();
  }

  useEffect(() => {
    if (!open) return;

    (async () => {
      setLoadingAvailables(true);
      const response = await getAvailables();
      const data =
        response?.success === true && response?.data
          ? (response.data as AvailableResources)
          : null;

      setBuses(Array.isArray(data?.buses) ? data.buses : []);
      setRoutes(Array.isArray(data?.routes) ? data.routes : []);
      setOperators(Array.isArray(data?.operators) ? data.operators : []);
      setDrivers(Array.isArray(data?.drivers) ? data.drivers : []);
      setLoadingAvailables(false);
    })();
  }, [getAvailables, open]);

  async function onSubmit(data: AssignmentFormData) {
    const result = await postAssignment(data);
    if (result === null) return;
    closeModal();
    onAdded?.();
  }

  return (
    <>
      <button
        type="button"
        className="btn bg-[#0062CA] text-white hover:bg-[#0062CA]/80"
        onClick={() => {
          clearPostError();
          setOpen(true);
          reset();
        }}
      >
        Add new assignment
      </button>

      <dialog ref={dialogRef} className="modal">
        <div className="modal-box">
          <h3 className="font-bold text-lg">Add new assignment</h3>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
            {availablesError ? (
              <div role="alert" className="alert alert-error text-sm">
                {availablesError}
              </div>
            ) : null}
            {postError ? (
              <div role="alert" className="alert alert-error text-sm">
                {postError}
              </div>
            ) : null}
            <div className="form-control">
              <label className="label">
                <span className="label-text">Driver</span>
              </label>
              <select
                className={`select select-bordered w-full ${errors.driver_id ? "select-error" : ""}`}
                {...register("driver_id")}
              >
                <option value="">Select driver</option>
                {drivers.map((d) => (
                  <option key={d._id} value={d._id}>
                    {d.f_name} {d.l_name}
                  </option>
                ))}
              </select>
              {errors.driver_id ? (
                <p className="text-error text-sm mt-1">{errors.driver_id.message}</p>
              ) : null}
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Bus</span>
              </label>
              <select
                className={`select select-bordered w-full ${errors.bus_id ? "select-error" : ""}`}
                {...register("bus_id")}
              >
                <option value="">Select bus</option>
                {buses.map((b) => (
                  <option key={b._id} value={b._id}>
                    {b.bus_number}
                  </option>
                ))}
              </select>
              {errors.bus_id ? (
                <p className="text-error text-sm mt-1">{errors.bus_id.message}</p>
              ) : null}
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Route</span>
              </label>
              <select
                className={`select select-bordered w-full ${errors.route_id ? "select-error" : ""}`}
                {...register("route_id")}
              >
                <option value="">Select route</option>
                {routes.map((r) => (
                  <option key={r._id} value={r._id}>
                    {r.route_name}
                  </option>
                ))}
              </select>
              {errors.route_id ? (
                <p className="text-error text-sm mt-1">{errors.route_id.message}</p>
              ) : null}
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Operator name</span>
              </label>
              <select
                className={`select select-bordered w-full ${errors.operator_user_id ? "select-error" : ""}`}
                {...register("operator_user_id")}
              >
                <option value="">Select operator</option>
                {operators.map((o) => (
                  <option key={o._id} value={o._id}>
                    {o.f_name} {o.l_name}
                  </option>
                ))}
              </select>
              {errors.operator_user_id ? (
                <p className="text-error text-sm mt-1">
                  {errors.operator_user_id.message}
                </p>
              ) : null}
            </div>

            <div className="modal-action">
              <button type="button" className="btn btn-ghost" onClick={closeModal}>
                Cancel
              </button>
              <button
                type="submit"
                className="btn bg-[#0062CA] text-white hover:bg-[#0062CA]/80"
                disabled={isSubmitting || loadingAvailables}
              >
                {isSubmitting ? "Adding..." : "Add assignment"}
              </button>
            </div>
          </form>
        </div>
        <form method="dialog" className="modal-backdrop" onSubmit={closeModal}>
          <button type="submit" aria-label="Close">
            close
          </button>
        </form>
      </dialog>
    </>
  );
}
