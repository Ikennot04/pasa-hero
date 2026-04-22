"use client";

import type { Dispatch, SetStateAction } from "react";
import { useEffect, useRef, useState } from "react";
import { useDeleteRouteStops } from "../_hooks/useDeleteRouteStops";

export type DeleteBusStopTarget = {
  _id: string;
  stop_name: string;
};

type DeleteBusStopProps = {
  stop: DeleteBusStopTarget | null;
  onClose: () => void;
  onToast: Dispatch<SetStateAction<string | null>>;
  onDeleted: (stopId: string) => void;
};

export default function DeleteBusStop({
  stop,
  onClose,
  onToast,
  onDeleted,
}: DeleteBusStopProps) {
  const { deleteRouteStop } = useDeleteRouteStops();
  const [deleting, setDeleting] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (stop) {
      dialog.showModal();
    } else {
      dialog.close();
    }

    const onDialogClose = () => {
      if (stop) onCloseRef.current();
    };
    dialog.addEventListener("close", onDialogClose);
    return () => dialog.removeEventListener("close", onDialogClose);
  }, [stop]);

  async function onConfirmDelete() {
    if (!stop) return;

    setDeleting(true);
    const res = await deleteRouteStop(stop._id);
    setDeleting(false);

    if (res && "success" in res && res.success) {
      onDeleted(stop._id);
      onToast("Bus stop deleted.");
      setTimeout(() => onToast(null), 2600);
      onClose();
    } else {
      const message =
        res && typeof res === "object" && "message" in res
          ? String((res as { message?: string }).message)
          : "Failed to delete bus stop";
      onToast(message);
      setTimeout(() => onToast(null), 3500);
    }
  }

  return (
    <dialog ref={dialogRef} className="modal">
      <div className="modal-box max-w-lg">
        <h3 className="text-xl font-bold">Delete bus stop</h3>
        <p className="mt-3 text-sm text-base-content/80">
          Are you sure you want to delete{" "}
          <span className="font-semibold text-base-content">
            {stop?.stop_name ?? "this stop"}
          </span>
          ? This cannot be undone.
        </p>

        <div className="modal-action flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-ghost"
            disabled={deleting}
            onClick={() => onClose()}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-error text-white disabled:opacity-50"
            disabled={deleting}
            onClick={() => void onConfirmDelete()}
          >
            {deleting ? (
              <span className="loading loading-spinner loading-sm" />
            ) : null}
            Delete
          </button>
        </div>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button type="submit" aria-label="Close">
          close
        </button>
      </form>
    </dialog>
  );
}
