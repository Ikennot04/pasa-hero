"use client";

import { useState } from "react";

import type { UserRow } from "./UserTable";

export const CONFIRM_SUSPEND_MODAL_ID = "confirm-suspend-modal";

export type ConfirmStatusModalMode = "suspend" | "unsuspend";

type ConfirmSuspendProps = {
  user: UserRow | null;
  modalId?: string;
  mode?: ConfirmStatusModalMode;
  /** When set, called before closing; errors are shown with `alert`. */
  onConfirm?: (user: UserRow) => void | Promise<void>;
};

export default function ConfirmSuspendModal({
  user,
  modalId = CONFIRM_SUSPEND_MODAL_ID,
  mode = "suspend",
  onConfirm,
}: ConfirmSuspendProps) {
  const [busy, setBusy] = useState(false);
  const closeModal = () =>
    (document.getElementById(modalId) as HTMLDialogElement)?.close();

  async function handleConfirm() {
    if (!user) return;
    if (onConfirm) {
      setBusy(true);
      try {
        await onConfirm(user);
        closeModal();
      } catch (e) {
        const fallback =
          mode === "unsuspend"
            ? "Failed to restore user access"
            : "Failed to suspend user";
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
          {isUnsuspend ? "Restore user access" : "Suspend user"}
        </h3>
        {user ? (
          <p className="py-4">
            {isUnsuspend ? (
              <>
                Restore access for{" "}
                <span className="font-semibold">
                  {user.f_name} {user.l_name}
                </span>{" "}
                ({user.email})? Their account will be marked inactive (no longer
                suspended).
              </>
            ) : (
              <>
                Are you sure you want to suspend{" "}
                <span className="font-semibold">
                  {user.f_name} {user.l_name}
                </span>{" "}
                ({user.email})? This will deactivate their account.
              </>
            )}
          </p>
        ) : (
          <p className="py-4">No user selected.</p>
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
            disabled={busy || !user}
            onClick={() => void handleConfirm()}
          >
            {busy
              ? isUnsuspend
                ? "Restoring…"
                : "Suspending…"
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
