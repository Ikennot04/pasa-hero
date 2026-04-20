"use client";

import type { Dispatch, SetStateAction } from "react";
import { useEffect, useRef, useState } from "react";
import { useUpdateRouteStop } from "../_hooks/useUpdateRouteStop";

export type EditBusStopStop = {
  _id: string;
  stop_name: string;
  stop_order: number;
  latitude: number;
  longitude: number;
};

type EditBusStopProps = {
  stop: EditBusStopStop | null;
  onClose: () => void;
  onToast: Dispatch<SetStateAction<string | null>>;
  onUpdated: (stop: EditBusStopStop) => void;
};

export default function EditBusStop({
  stop,
  onClose,
  onToast,
  onUpdated,
}: EditBusStopProps) {
  const { updateRouteStop } = useUpdateRouteStop();
  const [stopName, setStopName] = useState(() => stop?.stop_name ?? "");
  const [saving, setSaving] = useState(false);
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

  async function onSubmit() {
    if (!stop) return;
    const name = stopName.trim();
    if (!name) {
      onToast("Please enter a stop name.");
      setTimeout(() => onToast(null), 3500);
      return;
    }

    setSaving(true);
    const res = await updateRouteStop(stop._id, { stop_name: name });
    setSaving(false);

    if (res && "success" in res && res.success && res.data) {
      const row = res.data as EditBusStopStop;
      onUpdated({
        ...stop,
        stop_name: row.stop_name ?? name,
        stop_order: row.stop_order ?? stop.stop_order,
        latitude: row.latitude ?? stop.latitude,
        longitude: row.longitude ?? stop.longitude,
      });
      onToast("Bus stop updated.");
      setTimeout(() => onToast(null), 2600);
      onClose();
    } else {
      const message =
        res && typeof res === "object" && "message" in res
          ? String((res as { message?: string }).message)
          : "Failed to update bus stop";
      onToast(message);
      setTimeout(() => onToast(null), 3500);
    }
  }

  return (
    <dialog ref={dialogRef} className="modal">
      <div className="modal-box max-w-lg">
        <h3 className="text-xl font-bold">Edit bus stop</h3>
        <p className="mt-1 text-sm text-base-content/70">
          Update the display name for this stop.
        </p>

        <div className="mt-4 space-y-3">
          <label className="form-control w-full">
            <span className="label-text font-medium">Stop name</span>
            <input
              type="text"
              className="input input-bordered w-full"
              placeholder="e.g. Quezon Avenue"
              value={stopName}
              onChange={(e) => setStopName(e.target.value)}
              disabled={saving}
            />
          </label>
        </div>

        <div className="modal-action flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-ghost"
            disabled={saving}
            onClick={() => onClose()}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn bg-[#0062CA] text-white disabled:bg-[#0062CA]/50"
            disabled={saving}
            onClick={() => void onSubmit()}
          >
            {saving ? (
              <span className="loading loading-spinner loading-sm" />
            ) : null}
            Save
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
