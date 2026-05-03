"use client";

import { yupResolver } from "@hookform/resolvers/yup";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { MdOutlineEdit } from "react-icons/md";
import { usePatchAssignment } from "../_hooks/usePatchAssignment";
import { updateAssignmentSchema } from "./updateAssignmentSchema";
import type {
  AssignmentResult,
  AssignmentRow,
  AssignmentStatus,
  AssignmentUpdateFormData,
} from "./assignmentTypes";

const STATUS_OPTIONS: AssignmentStatus[] = ["active", "inactive"];
const RESULT_OPTIONS: AssignmentResult[] = [
  "pending",
  "completed",
  "cancelled",
];

const STATUS_COLORS: Record<AssignmentStatus, string> = {
  active: "btn-success",
  inactive: "btn-neutral",
};

const RESULT_COLORS: Record<AssignmentResult, string> = {
  pending: "btn-warning",
  completed: "btn-success",
  cancelled: "btn-error",
};

function formatLabel(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

type OptionButtonProps<T extends string> = {
  value: T;
  selected: boolean;
  activeClass: string;
  onSelect: (value: T) => void;
};

function OptionButton<T extends string>({
  value,
  selected,
  activeClass,
  onSelect,
}: OptionButtonProps<T>) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={() => onSelect(value)}
      className={`btn join-item btn-sm flex-1 capitalize ${
        selected ? activeClass : "btn-outline"
      }`}
    >
      {formatLabel(value)}
    </button>
  );
}

type UpdateAssignmentModalProps = {
  assignment: AssignmentRow;
  onUpdated?: () => void;
};

export default function UpdateAssignmentModal({
  assignment,
  onUpdated,
}: UpdateAssignmentModalProps) {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const {
    patchAssignment,
    error: patchError,
    clearError: clearPatchError,
  } = usePatchAssignment();

  const {
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<AssignmentUpdateFormData>({
    resolver: yupResolver(updateAssignmentSchema),
    defaultValues: {
      assignment_status: assignment.assignment_status,
      assignment_result: assignment.assignment_result,
    },
  });

  const selectedStatus = watch("assignment_status");
  const selectedResult = watch("assignment_result");

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open) {
      dialog.showModal();
      reset({
        assignment_status: assignment.assignment_status,
        assignment_result: assignment.assignment_result,
      });
    } else {
      dialog.close();
    }
    const onClose = () => setOpen(false);
    dialog.addEventListener("close", onClose);
    return () => dialog.removeEventListener("close", onClose);
  }, [assignment, open, reset]);

  function closeModal() {
    clearPatchError();
    setOpen(false);
  }

  async function onSubmit(data: AssignmentUpdateFormData) {
    const result = await patchAssignment(assignment.id, data);
    if (result === null) return;
    closeModal();
    onUpdated?.();
  }

  function handleStatusSelect(value: AssignmentStatus) {
    setValue("assignment_status", value, {
      shouldDirty: true,
      shouldValidate: true,
    });
  }

  function handleResultSelect(value: AssignmentResult) {
    setValue("assignment_result", value, {
      shouldDirty: true,
      shouldValidate: true,
    });
  }

  return (
    <>
      <button
        type="button"
        className="btn btn-sm"
        onClick={() => {
          clearPatchError();
          setOpen(true);
        }}
      >
        <MdOutlineEdit className="w-4 h-4" />
        Update
      </button>
      <dialog ref={dialogRef} className="modal">
        <div className="modal-box max-w-md">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#0062CA]/10 text-[#0062CA]">
              <MdOutlineEdit className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <h3 className="font-bold text-lg leading-tight">
                Update assignment
              </h3>
              <p className="text-sm text-base-content/60">
                {assignment.plate_number}
                {assignment.route_name ? ` - ${assignment.route_name}` : ""}
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 mt-5">
            {patchError ? (
              <div role="alert" className="alert alert-error text-sm">
                {patchError}
              </div>
            ) : null}

            <div className="space-y-2">
              <label className="text-xs font-semibold tracking-wide uppercase text-base-content/60">
                Status
              </label>
              <div
                role="radiogroup"
                aria-label="Assignment status"
                className="join w-full flex-wrap"
              >
                {STATUS_OPTIONS.map((s) => (
                  <OptionButton
                    key={s}
                    value={s}
                    selected={selectedStatus === s}
                    activeClass={STATUS_COLORS[s]}
                    onSelect={handleStatusSelect}
                  />
                ))}
              </div>
              {errors.assignment_status ? (
                <p className="text-error text-sm">
                  {errors.assignment_status.message}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold tracking-wide uppercase text-base-content/60">
                Result
              </label>
              <div
                role="radiogroup"
                aria-label="Assignment result"
                className="join w-full flex-wrap"
              >
                {RESULT_OPTIONS.map((r) => (
                  <OptionButton
                    key={r}
                    value={r}
                    selected={selectedResult === r}
                    activeClass={RESULT_COLORS[r]}
                    onSelect={handleResultSelect}
                  />
                ))}
              </div>
              {errors.assignment_result ? (
                <p className="text-error text-sm">
                  {errors.assignment_result.message}
                </p>
              ) : null}
            </div>

            <div className="modal-action">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={closeModal}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn bg-[#0062CA] text-white hover:bg-[#0062CA]/80"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <span className="loading loading-spinner loading-xs" />
                    Saving...
                  </>
                ) : (
                  "Save changes"
                )}
              </button>
            </div>
          </form>
        </div>
        <form
          method="dialog"
          className="modal-backdrop"
          onSubmit={closeModal}
        >
          <button type="submit" aria-label="Close">
            close
          </button>
        </form>
      </dialog>
    </>
  );
}
