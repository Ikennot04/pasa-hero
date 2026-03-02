"use client";

import type { UserRow } from "./UserTable";

export const CONFIRM_SUSPEND_MODAL_ID = "confirm-suspend-modal";

type ConfirmSuspendProps = {
  user: UserRow | null;
  modalId?: string;
};

export default function ConfirmSuspendModal({ user, modalId = CONFIRM_SUSPEND_MODAL_ID }: ConfirmSuspendProps) {
  const closeModal = () => (document.getElementById(modalId) as HTMLDialogElement)?.close();

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
          <button type="button" className="btn" onClick={closeModal}>
            Cancel
          </button>
          <button type="button" className="btn bg-[#D0393A] hover:bg-[#D0393A]/90 text-white" onClick={closeModal}>
            Suspend
          </button>
        </div>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button type="submit">close</button>
      </form>
    </dialog>
  );
}
