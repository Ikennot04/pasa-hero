"use client";

import { useEffect, useRef, useState } from "react";

type RouteStopRow = {
  id: string;
  stopName: string;
  stopOrder: number;
  latitude: number;
  longitude: number;
};

type AddBusStopProps = {
  routeId: string | null | undefined;
  activeStops: RouteStopRow[];
  onAddStop: (payload: { stopName: string; latitude: number; longitude: number }) => {
    ok: boolean;
    message: string;
  };
  onToast: (message: string) => void;
};

function toMapPercent(lat: number, lng: number) {
  const minLat = 14.45;
  const maxLat = 14.8;
  const minLng = 120.9;
  const maxLng = 121.12;
  const x = ((lng - minLng) / (maxLng - minLng)) * 100;
  const y = ((maxLat - lat) / (maxLat - minLat)) * 100;
  return {
    left: `${Math.min(100, Math.max(0, x))}%`,
    top: `${Math.min(100, Math.max(0, y))}%`,
  };
}

export default function AddBusStop({ routeId, activeStops, onAddStop, onToast }: AddBusStopProps) {
  const [openAddStopModal, setOpenAddStopModal] = useState(false);
  const [newStopName, setNewStopName] = useState("");
  const [newStopLatitude, setNewStopLatitude] = useState<number>(14.5995);
  const [newStopLongitude, setNewStopLongitude] = useState<number>(120.9842);
  const addStopDialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = addStopDialogRef.current;
    if (!dialog) return;
    if (openAddStopModal) dialog.showModal();
    else dialog.close();

    const onClose = () => setOpenAddStopModal(false);
    dialog.addEventListener("close", onClose);
    return () => dialog.removeEventListener("close", onClose);
  }, [openAddStopModal]);

  function onOpenAddStopModal() {
    if (!routeId) return;
    const last = activeStops[activeStops.length - 1];
    setNewStopName("");
    setNewStopLatitude(last?.latitude ?? 14.5995);
    setNewStopLongitude(last?.longitude ?? 120.9842);
    setOpenAddStopModal(true);
  }

  function onMiniMapClick(event: React.MouseEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = Math.min(Math.max(event.clientX - rect.left, 0), rect.width);
    const y = Math.min(Math.max(event.clientY - rect.top, 0), rect.height);
    const xRatio = rect.width === 0 ? 0 : x / rect.width;
    const yRatio = rect.height === 0 ? 0 : y / rect.height;

    const minLat = 14.45;
    const maxLat = 14.8;
    const minLng = 120.9;
    const maxLng = 121.12;
    const lat = maxLat - yRatio * (maxLat - minLat);
    const lng = minLng + xRatio * (maxLng - minLng);
    setNewStopLatitude(Number(lat.toFixed(6)));
    setNewStopLongitude(Number(lng.toFixed(6)));
  }

  function onSubmitAddStop() {
    const stopName = newStopName.trim();
    if (!stopName) {
      onToast("Please enter a stop name.");
      return;
    }
    if (!Number.isFinite(newStopLatitude) || !Number.isFinite(newStopLongitude)) {
      onToast("Please select a valid location on the mini map.");
      return;
    }

    const result = onAddStop({
      stopName,
      latitude: Number(newStopLatitude.toFixed(6)),
      longitude: Number(newStopLongitude.toFixed(6)),
    });
    onToast(result.message);
    if (!result.ok) return;
    setNewStopName("");
    setOpenAddStopModal(false);
  }

  return (
    <>
      <div className="mb-4">
        <button type="button" className="btn btn-outline" onClick={onOpenAddStopModal}>
          Add route stop
        </button>
      </div>

      <dialog ref={addStopDialogRef} className="modal">
        <div className="modal-box w-11/12 max-w-4xl">
          <h3 className="text-xl font-bold">Add route stop</h3>
          <p className="mt-1 text-sm text-base-content/70">
            Enter the stop name and pick location from the mini map.
          </p>

          <div className="mt-4 space-y-3">
            <label className="form-control w-full">
              <span className="label-text font-medium">Route stop name</span>
              <input
                type="text"
                className="input input-bordered w-full"
                placeholder="e.g. Quezon Avenue"
                value={newStopName}
                onChange={(e) => setNewStopName(e.target.value)}
              />
            </label>

            <div className="rounded-lg border border-base-300 p-3">
              <p className="mb-2 text-sm font-medium">Mini map picker</p>
              <div
                role="button"
                tabIndex={0}
                onClick={onMiniMapClick}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                  }
                }}
                className="relative h-96 w-full cursor-crosshair overflow-hidden rounded-md border border-base-300 bg-linear-to-br from-sky-100 via-emerald-100 to-slate-200"
                aria-label="Mini map picker"
              >
                <div className="absolute inset-0 opacity-40">
                  <div className="h-full w-full bg-[linear-gradient(to_right,rgba(0,0,0,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.08)_1px,transparent_1px)] bg-size-[24px_24px]" />
                </div>
                <div
                  className="absolute -translate-x-1/2 -translate-y-1/2"
                  style={toMapPercent(newStopLatitude, newStopLongitude)}
                >
                  <span className="inline-block h-4 w-4 rounded-full border-2 border-white bg-red-500 shadow" />
                </div>
              </div>
              <p className="mt-2 text-xs text-base-content/70">
                Click anywhere on the mini map to set the stop coordinates.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="form-control w-full">
                <span className="label-text text-sm font-medium">Latitude</span>
                <input
                  type="number"
                  step="0.000001"
                  className="input input-bordered w-full"
                  value={newStopLatitude}
                  onChange={(e) => setNewStopLatitude(Number(e.target.value))}
                />
              </label>
              <label className="form-control w-full">
                <span className="label-text text-sm font-medium">Longitude</span>
                <input
                  type="number"
                  step="0.000001"
                  className="input input-bordered w-full"
                  value={newStopLongitude}
                  onChange={(e) => setNewStopLongitude(Number(e.target.value))}
                />
              </label>
            </div>
          </div>

          <div className="modal-action flex-wrap gap-2">
            <button type="button" className="btn btn-ghost" onClick={() => setOpenAddStopModal(false)}>
              Cancel
            </button>
            <button type="button" className="btn bg-[#0062CA] text-white" onClick={onSubmitAddStop}>
              Add stop
            </button>
          </div>
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
