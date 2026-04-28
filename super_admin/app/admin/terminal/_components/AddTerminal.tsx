"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useForm, useWatch } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { GoogleMap, useJsApiLoader, type Libraries } from "@react-google-maps/api";
import { addTerminalSchema, type AddTerminalFormData } from "./addTerminalSchema";
import { googleMapsApiKey, isGoogleMapsConfigured } from "@/lib/firebaseClient";
import { usePostTerminal } from "../_hooks/usePostTerminal";

type AddTerminalModalProps = {
  onCreated?: () => void | Promise<void>;
};

// Mandaue City, Cebu (default focus for terminal picking)
const MAP_CENTER = { lat: 10.3236, lng: 123.9229 };
const MAP_ZOOM = 14.5;
const GOOGLE_MAPS_LIBRARIES: Libraries = ["marker"];

export default function AddTerminalModal({ onCreated }: AddTerminalModalProps) {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);
  const terminalMarkerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const { postTerminal, error: postError } = usePostTerminal();
  const { isLoaded: isGoogleMapsLoaded, loadError: googleMapsLoadError } = useJsApiLoader({
    id: "pasahero-admin-map-script",
    googleMapsApiKey: isGoogleMapsConfigured ? googleMapsApiKey : "",
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<AddTerminalFormData>({
    resolver: yupResolver(addTerminalSchema),
    mode: "onTouched",
    defaultValues: {
      terminal_name: "",
      location_lat: undefined,
      location_lng: undefined,
    },
  });

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open) {
      dialog.showModal();
    } else {
      dialog.close();
    }
    const onClose = () => setOpen(false);
    dialog.addEventListener("close", onClose);
    return () => dialog.removeEventListener("close", onClose);
  }, [open]);

  const latValue = useWatch({ control, name: "location_lat" });
  const lngValue = useWatch({ control, name: "location_lng" });

  const setTerminalMarker = useCallback(
    (lat: number, lng: number) => {
    if (!mapInstance || !window.google?.maps?.marker?.AdvancedMarkerElement) return;

    const position = { lat, lng };

    if (!terminalMarkerRef.current) {
      const pin = document.createElement("div");
      pin.style.width = "28px";
      pin.style.height = "28px";
      pin.style.borderRadius = "9999px";
      pin.style.display = "flex";
      pin.style.alignItems = "center";
      pin.style.justifyContent = "center";
      pin.style.color = "#fff";
      pin.style.fontWeight = "700";
      pin.style.fontSize = "11px";
      pin.style.boxShadow = "0 2px 6px rgba(0,0,0,0.25)";
      pin.style.background = "#0062CA";
      pin.textContent = "T";

      terminalMarkerRef.current = new google.maps.marker.AdvancedMarkerElement({
        map: mapInstance,
        position,
        title: `Terminal (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
        content: pin,
      });
    } else {
      terminalMarkerRef.current.position = position;
      terminalMarkerRef.current.title = `Terminal (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
      terminalMarkerRef.current.map = mapInstance;
    }
    },
    [mapInstance],
  );

  function onMapClick(e: google.maps.MapMouseEvent) {
    if (!e.latLng) return;
    const lat = Number(e.latLng.lat().toFixed(6));
    const lng = Number(e.latLng.lng().toFixed(6));
    setValue("location_lat", lat, { shouldValidate: true, shouldTouch: true });
    setValue("location_lng", lng, { shouldValidate: true, shouldTouch: true });
    setTerminalMarker(lat, lng);
  }

  useEffect(() => {
    if (!open || !mapInstance || !window.google?.maps) return;
    window.google.maps.event.trigger(mapInstance, "resize");
    const lat = Number.isFinite(latValue) ? latValue : MAP_CENTER.lat;
    const lng = Number.isFinite(lngValue) ? lngValue : MAP_CENTER.lng;
    mapInstance.setCenter({ lat, lng });
    if (Number.isFinite(latValue) && Number.isFinite(lngValue)) {
      setTerminalMarker(latValue, lngValue);
    }
  }, [open, mapInstance, latValue, lngValue, setTerminalMarker]);

  useEffect(() => {
    return () => {
      if (terminalMarkerRef.current) {
        terminalMarkerRef.current.map = null;
        terminalMarkerRef.current = null;
      }
    };
  }, []);

  function openModal() {
    setOpen(true);
    reset();
    if (terminalMarkerRef.current) {
      terminalMarkerRef.current.map = null;
      terminalMarkerRef.current = null;
    }
  }

  function closeModal() {
    setOpen(false);
    reset();
    if (terminalMarkerRef.current) {
      terminalMarkerRef.current.map = null;
      terminalMarkerRef.current = null;
    }
  }

  async function onSubmit(data: AddTerminalFormData) {
    const res = await postTerminal(data);
    if (res) {
      closeModal();
      await onCreated?.();
      return;
    }
    // If request fails, `usePostTerminal` sets `postError` which is rendered in the form.
  }

  return (
    <>
      <button type="button" className="btn bg-[#0062CA] text-white hover:bg-[#0062CA]/80" onClick={openModal}>
        Add terminal
      </button>
      <dialog ref={dialogRef} className="modal">
        <div className="modal-box">
          <h3 className="font-bold text-lg">Add terminal</h3>
          {/* eslint-disable-next-line react-hooks/refs */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
            {postError && (
              <div className="rounded-lg border border-error/30 bg-error/10 px-3 py-2 text-sm text-error">
                {postError}
              </div>
            )}
            <div className="form-control">
              <label className="label">
                <span className="label-text">Terminal name</span>
              </label>
              <input
                type="text"
                placeholder="e.g. PITX"
                className={`input input-bordered w-full ${errors.terminal_name ? "input-error" : ""}`}
                {...register("terminal_name")}
              />
              {errors.terminal_name && (
                <p className="text-error text-sm mt-1">
                  {errors.terminal_name.message}
                </p>
              )}
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Pick location on map</span>
              </label>
              <div className="relative min-h-[260px] overflow-hidden rounded-xl border border-base-300 bg-base-200">
                {isGoogleMapsConfigured ? (
                  googleMapsLoadError ? (
                    <div className="flex h-full min-h-[260px] items-center justify-center px-6 text-center text-sm text-error">
                      Failed to load Google Maps. Check your API key and restrictions.
                    </div>
                  ) : isGoogleMapsLoaded ? (
                    <GoogleMap
                      center={MAP_CENTER}
                      zoom={MAP_ZOOM}
                      mapContainerStyle={{ width: "100%", minHeight: "260px" }}
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
                    <div className="flex h-full min-h-[260px] items-center justify-center px-6 text-center text-sm text-base-content/70">
                      Loading map...
                    </div>
                  )
                ) : (
                  <div className="flex h-full min-h-[260px] items-center justify-center px-6 text-center text-sm text-base-content/70">
                    Add <code className="mx-1">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code>
                    to enable map picking.
                  </div>
                )}
              </div>
              <div className="mt-2 rounded-md bg-base-200 p-2 text-xs text-base-content/70">
                Click the map to set coordinates. Current:{" "}
                {Number.isFinite(latValue) && Number.isFinite(lngValue)
                  ? `${Number(latValue).toFixed(6)}, ${Number(lngValue).toFixed(6)}`
                  : "—"}
              </div>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Latitude</span>
              </label>
              <input
                type="number"
                step="any"
                placeholder="e.g. 14.5547"
                className={`input input-bordered w-full ${errors.location_lat ? "input-error" : ""}`}
                {...register("location_lat", { valueAsNumber: true })}
              />
              {errors.location_lat && (
                <p className="text-error text-sm mt-1">
                  {errors.location_lat.message}
                </p>
              )}
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text">Longitude</span>
              </label>
              <input
                type="number"
                step="any"
                placeholder="e.g. 120.9842"
                className={`input input-bordered w-full ${errors.location_lng ? "input-error" : ""}`}
                {...register("location_lng", { valueAsNumber: true })}
              />
              {errors.location_lng && (
                <p className="text-error text-sm mt-1">
                  {errors.location_lng.message}
                </p>
              )}
            </div>
            <div className="modal-action">
              <button type="button" className="btn" onClick={closeModal}>
                Cancel
              </button>
              <button type="submit" className="btn bg-[#0062CA] text-white hover:bg-[#0062CA]/80" disabled={isSubmitting}>
                {isSubmitting ? "Adding…" : "Add terminal"}
              </button>
            </div>
          </form>
        </div>
        <form method="dialog" className="modal-backdrop" onSubmit={closeModal}>
          <button type="submit" aria-label="Close">
            close
          </button>
        </form>
      </dialog>
    </>
  );
}
