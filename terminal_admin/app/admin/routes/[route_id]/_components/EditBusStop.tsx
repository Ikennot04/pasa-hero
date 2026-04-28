"use client";

import type { Dispatch, SetStateAction } from "react";
import { useEffect, useRef, useState } from "react";
import { GoogleMap, useJsApiLoader, type Libraries } from "@react-google-maps/api";
import { googleMapsApiKey, isGoogleMapsConfigured } from "@/lib/firebaseClient";
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

const GOOGLE_MAPS_LIBRARIES: Libraries = ["marker"];
const DEFAULT_MAP_ZOOM = 14.5;

export default function EditBusStop({
  stop,
  onClose,
  onToast,
  onUpdated,
}: EditBusStopProps) {
  const { updateRouteStop } = useUpdateRouteStop();
  const [stopName, setStopName] = useState(() => stop?.stop_name ?? "");
  const [latitude, setLatitude] = useState<number>(() => stop?.latitude ?? 14.5995);
  const [longitude, setLongitude] = useState<number>(() => stop?.longitude ?? 120.9842);
  const [saving, setSaving] = useState(false);
  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const onCloseRef = useRef(onClose);
  const { isLoaded: isGoogleMapsLoaded, loadError: googleMapsLoadError } = useJsApiLoader({
    id: "pasahero-admin-map-script",
    googleMapsApiKey: isGoogleMapsConfigured ? googleMapsApiKey : "",
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    // Reset form fields whenever a different stop is selected for editing.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStopName(stop?.stop_name ?? "");
    setLatitude(stop?.latitude ?? 14.5995);
    setLongitude(stop?.longitude ?? 120.9842);
  }, [stop]);

  function setCoordinateSelection(newLatitude: number, newLongitude: number) {
    const roundedLatitude = Number(newLatitude.toFixed(6));
    const roundedLongitude = Number(newLongitude.toFixed(6));
    setLatitude(roundedLatitude);
    setLongitude(roundedLongitude);
    console.log(`[EditBusStop] longitude=${roundedLongitude}, latitude=${roundedLatitude}`);
  }

  function onMapClick(event: google.maps.MapMouseEvent) {
    if (!event.latLng) return;
    setCoordinateSelection(event.latLng.lat(), event.latLng.lng());
  }

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

  useEffect(() => {
    if (!stop || !mapInstance || !window.google?.maps) return;
    window.google.maps.event.trigger(mapInstance, "resize");
    mapInstance.setCenter({ lat: latitude, lng: longitude });
  }, [stop, mapInstance, latitude, longitude]);

  useEffect(() => {
    if (!mapInstance || !window.google?.maps?.marker?.AdvancedMarkerElement) return;
    if (markerRef.current) markerRef.current.map = null;

    markerRef.current = new google.maps.marker.AdvancedMarkerElement({
      map: mapInstance,
      position: { lat: latitude, lng: longitude },
      title: `Bus stop (${latitude.toFixed(6)}, ${longitude.toFixed(6)})`,
    });

    return () => {
      if (markerRef.current) markerRef.current.map = null;
      markerRef.current = null;
    };
  }, [mapInstance, latitude, longitude]);

  async function onSubmit() {
    if (!stop) return;
    const name = stopName.trim();
    if (!name) {
      onToast("Please enter a stop name.");
      setTimeout(() => onToast(null), 3500);
      return;
    }

    setSaving(true);
    const res = await updateRouteStop(stop._id, {
      stop_name: name,
      latitude: Number(latitude.toFixed(6)),
      longitude: Number(longitude.toFixed(6)),
    });
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
          Update the stop name and location.
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

          <div className="rounded-lg border border-base-300 p-3">
            <p className="mb-2 text-sm font-medium">Map picker</p>
            <div className="relative h-80 w-full overflow-hidden rounded-md border border-base-300 bg-base-200">
              {isGoogleMapsConfigured ? (
                googleMapsLoadError ? (
                  <div className="flex h-full items-center justify-center px-6 text-center text-sm text-error">
                    Failed to load Google Maps script. Check your API key and map restrictions.
                  </div>
                ) : isGoogleMapsLoaded ? (
                  <GoogleMap
                    center={{ lat: latitude, lng: longitude }}
                    zoom={DEFAULT_MAP_ZOOM}
                    mapContainerStyle={{ width: "100%", height: "100%" }}
                    options={{
                      mapId: "DEMO_MAP_ID",
                      mapTypeId: "hybrid",
                      streetViewControl: false,
                      mapTypeControl: false,
                      fullscreenControl: false,
                    }}
                    onLoad={(map) => setMapInstance(map)}
                    onUnmount={() => setMapInstance(null)}
                    onClick={onMapClick}
                  />
                ) : (
                  <div className="flex h-full items-center justify-center px-6 text-center text-sm text-base-content/70">
                    Loading map...
                  </div>
                )
              ) : (
                <div className="flex h-full items-center justify-center px-6 text-center text-sm text-base-content/70">
                  Add <code className="mx-1">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> to show Google Map
                  preview.
                </div>
              )}
            </div>
            <p className="mt-2 text-xs text-base-content/70">
              Click on the map to set the updated bus stop coordinates.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="form-control w-full">
              <span className="label-text text-sm font-medium">Latitude</span>
              <input
                type="number"
                step="0.000001"
                className="input input-bordered w-full"
                value={latitude}
                onChange={(e) => setCoordinateSelection(Number(e.target.value), longitude)}
                disabled={saving}
              />
            </label>
            <label className="form-control w-full">
              <span className="label-text text-sm font-medium">Longitude</span>
              <input
                type="number"
                step="0.000001"
                className="input input-bordered w-full"
                value={longitude}
                onChange={(e) => setCoordinateSelection(latitude, Number(e.target.value))}
                disabled={saving}
              />
            </label>
          </div>
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
