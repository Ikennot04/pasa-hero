"use client";

import { useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { FaTrash } from "react-icons/fa6";

const DELETE_CONFIRM_MODAL_ID = "delete-bus-confirm-modal";

type DeleteBusButtonProps = {
  busId: string;
  busNumber: string;
};

export default function DeleteBusButton({ busId, busNumber }: DeleteBusButtonProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (showModal) {
      el.showModal();
    } else {
      el.close();
    }
  }, [showModal]);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    const onClose = () => setShowModal(false);
    el.addEventListener("close", onClose);
    return () => el.removeEventListener("close", onClose);
  }, []);

  async function handleConfirmDelete() {
    setIsDeleting(true);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
      const res = await fetch(`${baseUrl}/bus/${busId}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.message ?? "Failed to delete bus");
      }
      setShowModal(false);
      router.push("/admin/bus");
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete bus");
      setIsDeleting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setShowModal(true)}
        disabled={isDeleting}
        className="btn bg-[#D0393A] hover:bg-[#D0393A]/80 gap-2 text-white rounded-xl btn-md text-base"
        aria-label={`Delete bus ${busNumber}`}
      >
        <FaTrash className="w-4 h-4" />
        {isDeleting ? "Deleting…" : "Delete"}
      </button>

      <dialog
        ref={dialogRef}
        id={DELETE_CONFIRM_MODAL_ID}
        className="modal"
        aria-labelledby="delete-bus-confirm-title"
        aria-describedby="delete-bus-confirm-desc"
      >
        <div className="modal-box">
          <h3 id="delete-bus-confirm-title" className="font-bold text-lg">
            Delete bus?
          </h3>
          <p id="delete-bus-confirm-desc" className="py-4 text-base-content/80">
            Are you sure you want to delete <strong>Bus {busNumber}</strong>? This action cannot be undone.
          </p>
          <div className="modal-action">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setShowModal(false)}
              disabled={isDeleting}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn bg-[#D0393A] hover:bg-[#D0393A]/80 gap-2 text-white"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
            >
              <FaTrash className="w-4 h-4" />
              {isDeleting ? "Deleting…" : "Delete bus"}
            </button>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button type="submit" tabIndex={-1} aria-hidden>
            close
          </button>
        </form>
      </dialog>
    </>
  );
}
