"use client";

import { useState } from "react";

type Operator = {
  id: string;
  name: string;
  email: string;
  terminal: string;
  createdBy: string;
  status: "Active" | "Suspended";
};

export const CONFIRM_SUSPEND_OPERATOR_MODAL_ID = "confirm-suspend-operator-modal";

export type ConfirmOperatorStatusModalMode = "suspend" | "unsuspend";

type SuspendOperatorProps = {
  operator: Operator | null;
  modalId?: string;
  mode?: ConfirmOperatorStatusModalMode;
  onConfirm?: (operator: Operator) => void | Promise<void>;
};

export default function SuspendOperator({
  operator,
  modalId = CONFIRM_SUSPEND_OPERATOR_MODAL_ID,
  mode = "suspend",
  onConfirm,
}: SuspendOperatorProps) {
  const [busy, setBusy] = useState(false);
  const closeModal = () =>
    (document.getElementById(modalId) as HTMLDialogElement)?.close();

  async function handleConfirm() {
    if (!operator) return;
    if (onConfirm) {
      setBusy(true);
      try {
        await onConfirm(operator);
        closeModal();
      } catch (e) {
        const fallback =
          mode === "unsuspend"
            ? "Failed to restore operator access"
            : "Failed to suspend operator";
        alert(e instanceof Error ? e.message : fallback);
      } finally {
        setBusy(false);
      }
    } else {
      closeModal();
    }
  }

  const isUnsuspend = mode === "unsuspend";

  return (
    <dialog id={modalId} className="modal">
      <div className="modal-box">
        <h3 className="font-bold text-lg">
          {isUnsuspend ? "Restore operator access" : "Suspend operator"}
        </h3>
        {operator ? (
          <p className="py-4">
            {isUnsuspend ? (
              <>
                Restore access for{" "}
                <span className="font-semibold">{operator.name}</span> (
                {operator.email})? Their account will be marked active.
              </>
            ) : (
              <>
                Are you sure you want to suspend{" "}
                <span className="font-semibold">{operator.name}</span> (
                {operator.email})? This will deactivate their account.
              </>
            )}
          </p>
        ) : (
          <p className="py-4">No operator selected.</p>
        )}
        <div className="modal-action">
          <button
            type="button"
            className="btn"
            disabled={busy}
            onClick={closeModal}
          >
            Cancel
          </button>
          <button
            type="button"
            className={
              isUnsuspend
                ? "btn btn-success text-white"
                : "btn bg-[#D0393A] hover:bg-[#D0393A]/90 text-white"
            }
            disabled={busy || !operator}
            onClick={() => void handleConfirm()}
          >
            {busy
              ? isUnsuspend
                ? "Restoring..."
                : "Suspending..."
              : isUnsuspend
                ? "Restore access"
                : "Suspend"}
          </button>
        </div>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button type="submit">close</button>
      </form>
    </dialog>
  );
}
