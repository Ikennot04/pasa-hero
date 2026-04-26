"use client";

import { useState } from "react";

import type { UserRow } from "./UserTable";

export const CONFIRM_SUSPEND_MODAL_ID = "confirm-suspend-modal";

type ConfirmSuspendProps = {
  user: UserRow | null;
  modalId?: string;
  /** When set, called before closing; errors are shown with `alert`. */
  onConfirm?: (user: UserRow) => void | Promise<void>;
};

export default function ConfirmSuspendModal({
  user,
  modalId = CONFIRM_SUSPEND_MODAL_ID,
  onConfirm,
}: ConfirmSuspendProps) {
  const [busy, setBusy] = useState(false);
  const closeModal = () =>
    (document.getElementById(modalId) as HTMLDialogElement)?.close();

  async function handleSuspend() {
    if (!user) return;
    if (onConfirm) {
      setBusy(true);
      try {
        await onConfirm(user);
        closeModal();
      } catch (e) {
        alert(e instanceof Error ? e.message : "Failed to suspend user");
      } finally {
        setBusy(false);
      }
    } else {
      closeModal();
    }
  }

  return (
    <dialog id={modalId} className="modal">
      <div className="modal-box">
        <h3 className="font-bold text-lg">Suspend user</h3>
        {user ? (
          <p className="py-4">
            Are you sure you want to suspend{" "}
            <span className="font-semibold">
              {user.f_name} {user.l_name}
            </span>{" "}
            ({user.email})? This will deactivate their account.
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
            className="btn bg-[#D0393A] hover:bg-[#D0393A]/90 text-white"
            disabled={busy || !user}
            onClick={() => void handleSuspend()}
          >
            {busy ? "Suspending…" : "Suspend"}
          </button>
        </div>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button type="submit">close</button>
      </form>
    </dialog>
  );
}
