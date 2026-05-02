"use client";

import { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { renderToStaticMarkup } from "react-dom/server";
import { FaBus } from "react-icons/fa";
import { GoogleMap, useJsApiLoader } from "@react-google-maps/api";
import { addRouteSchema, type AddRouteFormData } from "./addRouteSchema";
import { googleMapsApiKey, isGoogleMapsConfigured } from "@/lib/firebaseClient";
import {
  GOOGLE_MAPS_LIBRARIES,
  GOOGLE_MAPS_SCRIPT_ID,
} from "@/lib/googleMaps";
import { useGetTerminalNames } from "../_hooks/getTerminalNames";
import { usePostRoutes } from "../_hooks/usePostRoutes";
import { usePostRouteStop } from "../_hooks/usePostRouteStop";

type MarkerType = "start" | "end" | "stop";

type DroppedMarker = {
  id: string;
  type: MarkerType;
  lat: number;
  lng: number;
};

type TerminalOption = {
  id: string;
  terminal_name: string;
  lat: number;
  lng: number;
};

const MAP_CENTER = { lat: 10.3313, lng: 123.9362 }; // Parkmall Mandaue area
const MAP_ZOOM = 14.5;
const BUS_ICON_MARKUP = renderToStaticMarkup(<FaBus size={14} color="#fff" />);

type AddRouteModalProps = {
  onRouteAdded?: () => void | Promise<void>;
};

export default function AddRouteModal({ onRouteAdded }: AddRouteModalProps) {
  const [open, setOpen] = useState(false);
  const [droppedMarkers, setDroppedMarkers] = useState<DroppedMarker[]>([]);
  const [selectedTool, setSelectedTool] = useState<MarkerType>("start");
  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);
  const [terminalOptions, setTerminalOptions] = useState<TerminalOption[]>([]);
  const [isLoadingTerminalOptions, setIsLoadingTerminalOptions] =
    useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [assignedTerminalId, setAssignedTerminalId] = useState("");
  const [assignedTerminalName, setAssignedTerminalName] = useState("");
  const advancedMarkersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>(
    [],
  );
  const dialogRef = useRef<HTMLDialogElement>(null);
  const { getTerminalNames } = useGetTerminalNames();
  const { postRoutes, error: postRoutesError } = usePostRoutes();
  const { postRouteStop, error: postRouteStopError } = usePostRouteStop();
  const { isLoaded: isGoogleMapsLoaded, loadError: googleMapsLoadError } =
    useJsApiLoader({
      id: GOOGLE_MAPS_SCRIPT_ID,
      googleMapsApiKey: isGoogleMapsConfigured ? googleMapsApiKey : "",
      libraries: GOOGLE_MAPS_LIBRARIES,
    });

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<AddRouteFormData>({
    resolver: yupResolver(addRouteSchema),
    mode: "onTouched",
    defaultValues: {
      route_name: "",
      route_code: "",
      start_terminal_id: "",
      end_terminal_id: "",
      start_location: "",
      end_location: "",
      estimated_duration: undefined,
      is_free_ride: false,
    },
  });

  useEffect(() => {
    const terminalId = localStorage.getItem("assigned_terminal") ?? "";
    const terminalName = localStorage.getItem("assigned_terminal_name") ?? "";
    setAssignedTerminalId(terminalId);
    setAssignedTerminalName(terminalName);
    if (terminalId) {
      setValue("start_terminal_id", terminalId, {
        shouldValidate: true,
        shouldTouch: true,
      });
    }
  }, [setValue]);

  useEffect(() => {
    let isMounted = true;

    async function fetchTerminalOptions() {
      setIsLoadingTerminalOptions(true);
      try {
        const response = await getTerminalNames();
        const rawOptions = Array.isArray(response)
          ? response
          : Array.isArray(response?.data)
            ? response.data
            : [];

        if (!isMounted) return;

        const parsedOptions: TerminalOption[] = rawOptions
          .map((terminal: unknown) => {
            const option = terminal as {
              _id?: string | number;
              id?: string | number;
              terminal_name?: string;
              lat?: number | string;
              lng?: number | string;
            };
            const terminalName = String(option.terminal_name ?? "").trim();
            if (!terminalName) return null;
            const terminalId = String(option._id ?? option.id ?? "").trim();
            if (!terminalId) return null;
            return {
              id: terminalId,
              terminal_name: terminalName,
              lat: Number(option.lat ?? 0),
              lng: Number(option.lng ?? 0),
            };
          })
          .filter(
            (option: TerminalOption | null): option is TerminalOption =>
              option !== null,
          );

        setTerminalOptions(parsedOptions);
      } finally {
        if (isMounted) setIsLoadingTerminalOptions(false);
      }
    }

    fetchTerminalOptions();

    return () => {
      isMounted = false;
    };
  }, [getTerminalNames]);

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

  function parseCoordinatePair(
    value: string,
  ): { latitude: number; longitude: number } | null {
    const [latRaw, lngRaw] = value.split(",").map((part) => part.trim());
    const latitude = Number(latRaw);
    const longitude = Number(lngRaw);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return null;
    }
    return { latitude, longitude };
  }

  function openModal() {
    setOpen(true);
    reset();
    if (assignedTerminalId) {
      setValue("start_terminal_id", assignedTerminalId, {
        shouldValidate: true,
        shouldTouch: true,
      });
    }
    setDroppedMarkers([]);
    setSelectedTool("start");
    setSubmitError(null);
  }

  function closeModal() {
    setOpen(false);
    reset();
    setDroppedMarkers([]);
    setSubmitError(null);
  }

  function nearestTerminal(lat: number, lng: number): TerminalOption | null {
    if (terminalOptions.length === 0) return null;

    let best: TerminalOption | null = null;
    let bestDist = Number.POSITIVE_INFINITY;
    for (const t of terminalOptions) {
      if (!Number.isFinite(t.lat) || !Number.isFinite(t.lng)) continue;
      const d = Math.hypot(t.lat - lat, t.lng - lng);
      if (d < bestDist) {
        bestDist = d;
        best = t;
      }
    }
    return best;
  }

  function putMarker(tool: MarkerType, lat: number, lng: number) {
    if (!tool) return;
    console.log(
      `[AddRoute][${tool.toUpperCase()}] lat=${lat.toFixed(6)}, lng=${lng.toFixed(6)}`,
    );

    setDroppedMarkers((prev) => {
      const withoutSingle = prev.filter(
        (m) =>
          !(tool === "start" && m.type === "start") &&
          !(tool === "end" && m.type === "end"),
      );
      return [
        ...withoutSingle,
        { id: `${tool}-${Date.now()}`, type: tool, lat, lng },
      ];
    });

    if (tool === "start" || tool === "end") {
      setValue(
        tool === "start" ? "start_location" : "end_location",
        `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
        { shouldValidate: true, shouldTouch: true },
      );
      if (tool === "end") {
        const nearest = nearestTerminal(lat, lng);
        if (nearest) {
          setValue("end_terminal_id", nearest.id, {
            shouldValidate: true,
            shouldTouch: true,
          });
        }
      }
    }
  }

  function onMapClick(e: google.maps.MapMouseEvent) {
    if (!e.latLng) return;
    putMarker(selectedTool, e.latLng.lat(), e.latLng.lng());
  }

  function removeMarker(id: string) {
    setDroppedMarkers((prev) => prev.filter((m) => m.id !== id));
  }

  useEffect(() => {
    if (!mapInstance || !window.google?.maps?.marker?.AdvancedMarkerElement)
      return;

    // Clear previous markers on each refresh.
    for (const m of advancedMarkersRef.current) {
      m.map = null;
    }
    advancedMarkersRef.current = [];

    droppedMarkers.forEach((m, idx) => {
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
      pin.style.background =
        m.type === "start"
          ? "#16a34a"
          : m.type === "end"
            ? "#dc2626"
            : "#2563eb";
      if (m.type === "start" || m.type === "end") {
        pin.innerHTML = BUS_ICON_MARKUP;
      } else {
        pin.textContent = `${idx + 1}`;
      }

      const marker = new google.maps.marker.AdvancedMarkerElement({
        map: mapInstance,
        position: { lat: m.lat, lng: m.lng },
        title: `${m.type.toUpperCase()} (${m.lat.toFixed(4)}, ${m.lng.toFixed(4)})`,
        content: pin,
      });
      marker.addEventListener("gmp-click", () => removeMarker(m.id));
      advancedMarkersRef.current.push(marker);
    });

    return () => {
      for (const m of advancedMarkersRef.current) m.map = null;
      advancedMarkersRef.current = [];
    };
  }, [mapInstance, droppedMarkers]);

  useEffect(() => {
    if (!open || !mapInstance || !window.google?.maps) return;
    // Ensure map renders correctly after dialog becomes visible.
    window.google.maps.event.trigger(mapInstance, "resize");
    mapInstance.setCenter(MAP_CENTER);
  }, [open, mapInstance]);

  const startMarker = droppedMarkers.find((m) => m.type === "start");
  const endMarker = droppedMarkers.find((m) => m.type === "end");
  const stopMarkers = droppedMarkers.filter((m) => m.type === "stop");

  const routeCoverageLabel =
    startMarker && endMarker
      ? `Start (${startMarker.lat.toFixed(4)}, ${startMarker.lng.toFixed(4)}) → End (${endMarker.lat.toFixed(4)}, ${endMarker.lng.toFixed(4)})`
      : "Place start and end points on the map (end point optional).";

  async function onSubmit(data: AddRouteFormData) {
    setSubmitError(null);

    const typedStartLocation = parseCoordinatePair(data.start_location);
    const typedEndLocation = parseCoordinatePair(data.end_location);

    const startLocation = startMarker
      ? {
          latitude: Number(startMarker.lat.toFixed(6)),
          longitude: Number(startMarker.lng.toFixed(6)),
        }
      : typedStartLocation;
    const endLocation = endMarker
      ? {
          latitude: Number(endMarker.lat.toFixed(6)),
          longitude: Number(endMarker.lng.toFixed(6)),
        }
      : typedEndLocation;

    if (!startLocation || !endLocation) {
      alert(
        "Please provide valid start and end locations (map marker or lat,lng input).",
      );
      return;
    }

    const payload = {
      route_name: data.route_name,
      route_code: data.route_code,
      start_terminal_id: (assignedTerminalId || data.start_terminal_id).trim(),
      end_terminal_id: data.end_terminal_id
        ? data.end_terminal_id.trim()
        : null,
      start_location: startLocation,
      end_location: endLocation,
      estimated_duration:
        data.estimated_duration != null
          ? Number(data.estimated_duration)
          : undefined,
      status: "active" as const,
      route_type: "normal" as const,
      is_free_ride: Boolean(data.is_free_ride),
    };

    const routeStops = stopMarkers.map((stop, index) => {
      const stopOrder = index + 1;
      const nearest = nearestTerminal(stop.lat, stop.lng);
      return {
        stop_name: `${nearest?.terminal_name ?? "Stop"} ${stopOrder}`,
        stop_order: stopOrder,
        latitude: Number(stop.lat.toFixed(6)),
        longitude: Number(stop.lng.toFixed(6)),
      };
    });

    console.log("[AddRoute] form data:", payload);
    console.log("[AddRoute] route stops:", routeStops);

    const response = await postRoutes(payload);
    if (!response?.success) {
      setSubmitError(
        response?.message ??
          postRoutesError ??
          "Failed to create route. Please try again.",
      );
      return;
    }

    const routeId = String(
      response?.data?._id ?? response?.data?.id ?? response?.data?.route_id ?? "",
    ).trim();
    if (!routeId) {
      setSubmitError("Route created, but route ID was missing for stop creation.");
      return;
    }

    for (const routeStop of routeStops) {
      const routeStopPayload = {
        route_id: routeId,
        stop_name: routeStop.stop_name,
        stop_order: routeStop.stop_order,
        latitude: routeStop.latitude,
        longitude: routeStop.longitude,
      };

      const routeStopResponse = await postRouteStop(routeStopPayload);
      if (!routeStopResponse?.success) {
        setSubmitError(
          routeStopResponse?.message ??
            postRouteStopError ??
            `Route was created, but failed to create stop #${routeStop.stop_order}.`,
        );
        return;
      }
    }

    await onRouteAdded?.();
    closeModal();
  }

  return (
    <>
      <button
        type="button"
        className="btn bg-[#0062CA] text-white hover:bg-[#0062CA]/80"
        onClick={openModal}
      >
        Add route
      </button>
      <dialog ref={dialogRef} className="modal">
        <div className="modal-box max-w-6xl rounded-md p-5">
          <h3 className="text-xl font-semibold text-[#222222]">Add route</h3>
          <p className="mt-1 text-sm text-[#6B7280]">
            Build route geometry by selecting a tool, then clicking the map.
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-3">
            <section className="rounded-md border border-[#E5E7EB] p-3.5">
              <h4 className="text-sm font-semibold text-[#4B5563]">Map</h4>
              <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-[1fr_250px]">
                <div className="relative min-h-[360px] overflow-hidden rounded-xl border border-[#D1D5DB] bg-[#F3F4F6]">
                  {isGoogleMapsConfigured ? (
                    googleMapsLoadError ? (
                      <div className="flex h-full items-center justify-center px-6 text-center text-sm text-error">
                        Failed to load Google Maps script. Check your API key
                        and map restrictions.
                      </div>
                    ) : isGoogleMapsLoaded ? (
                      <GoogleMap
                        center={MAP_CENTER}
                        zoom={MAP_ZOOM}
                        mapContainerStyle={{
                          width: "100%",
                          minHeight: "360px",
                        }}
                        options={{
                          mapId: "DEMO_MAP_ID",
                          mapTypeId: "roadmap",
                          streetViewControl: false,
                          mapTypeControl: false,
                          fullscreenControl: false,
                        }}
                        onLoad={(map) => setMapInstance(map)}
                        onUnmount={() => setMapInstance(null)}
                        onClick={onMapClick}
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center px-6 text-center text-sm text-[#6B7280]">
                        Loading map...
                      </div>
                    )
                  ) : (
                    <div className="flex h-full items-center justify-center px-6 text-center text-sm text-[#6B7280]">
                      Add{" "}
                      <code className="mx-1">
                        NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
                      </code>
                      to show Google Map preview.
                    </div>
                  )}
                </div>

                <aside className="rounded-xl border border-[#D1D5DB] bg-white p-3">
                  <p className="text-sm font-semibold text-[#374151]">
                    Marker Toolbox
                  </p>
                  <p className="mt-1 text-xs text-[#6B7280]">
                    Choose marker type, then click on the map.
                  </p>
                  <div className="mt-3 space-y-2">
                    <button
                      type="button"
                      onClick={() => setSelectedTool("start")}
                      className={`w-full rounded-md border px-3 py-2 text-left text-sm ${
                        selectedTool === "start"
                          ? "border-green-500 bg-green-100 text-green-900"
                          : "border-green-300 bg-green-50 text-green-800"
                      }`}
                    >
                      Start point
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedTool("stop")}
                      className={`w-full rounded-md border px-3 py-2 text-left text-sm ${
                        selectedTool === "stop"
                          ? "border-blue-500 bg-blue-100 text-blue-900"
                          : "border-blue-300 bg-blue-50 text-blue-800"
                      }`}
                    >
                      Bus stop
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedTool("end")}
                      className={`w-full rounded-md border px-3 py-2 text-left text-sm ${
                        selectedTool === "end"
                          ? "border-red-500 bg-red-100 text-red-900"
                          : "border-red-300 bg-red-50 text-red-800"
                      }`}
                    >
                      End point
                    </button>
                  </div>
                  <div className="mt-3 rounded-md bg-[#F9FAFB] p-2 text-xs text-[#4B5563]">
                    Stops: {stopMarkers.length}
                    <br />
                    {routeCoverageLabel}
                  </div>
                </aside>
              </div>
            </section>

            <section className="rounded-md border border-[#E5E7EB] p-3.5">
              <h4 className="text-sm font-semibold text-[#4B5563]">
                Route identity
              </h4>
              <div className="mt-3 grid grid-cols-1 gap-2.5 md:grid-cols-3">
                <div>
                  <label className="mb-1.5 block text-base font-medium text-[#2D2D2D]">
                    Route name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. North Terminal - South Terminal"
                    className={`input input-bordered h-10 min-h-10 w-full rounded-md text-sm ${errors.route_name ? "input-error" : ""}`}
                    {...register("route_name")}
                  />
                  {errors.route_name && (
                    <p className="mt-1 text-sm text-error">
                      {errors.route_name.message}
                    </p>
                  )}
                </div>
                <div>
                  <label className="mb-1.5 block text-base font-medium text-[#2D2D2D]">
                    Route code
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. PITX-QC-05"
                    className={`input input-bordered h-10 min-h-10 w-full rounded-md text-sm ${errors.route_code ? "input-error" : ""}`}
                    {...register("route_code")}
                  />
                  {errors.route_code && (
                    <p className="mt-1 text-sm text-error">
                      {errors.route_code.message}
                    </p>
                  )}
                </div>
                <div>
                  <label className="mb-1.5 block text-base font-medium text-[#2D2D2D]">
                    ETA (minutes)
                  </label>
                  <input
                    type="number"
                    min={1}
                    step={1}
                    className={`input input-bordered h-10 min-h-10 w-full rounded-md text-sm ${errors.estimated_duration ? "input-error" : ""}`}
                    {...register("estimated_duration", { valueAsNumber: true })}
                  />
                  {errors.estimated_duration && (
                    <p className="mt-1 text-sm text-error">
                      {errors.estimated_duration.message}
                    </p>
                  )}
                </div>
              </div>
              <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm font-medium text-[#2D2D2D]">
                <input type="checkbox" className="checkbox checkbox-sm rounded border-[#D1D5DB]" {...register("is_free_ride")} />
                Free ride
              </label>
            </section>

            <section className="rounded-md border border-[#E5E7EB] p-3.5">
              <h4 className="text-sm font-semibold text-[#4B5563]">
                Route coverage
              </h4>
              <div className="mt-3 grid grid-cols-1 gap-2.5 md:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-base font-medium text-[#2D2D2D]">
                    Start terminal
                  </label>
                  <select
                    className={`input input-bordered h-10 min-h-10 w-full rounded-md text-sm ${errors.start_terminal_id ? "input-error" : ""}`}
                    {...register("start_terminal_id")}
                    disabled
                  >
                    <option value={assignedTerminalId || ""}>
                      {assignedTerminalName || "Assigned terminal"}
                    </option>
                  </select>
                  {errors.start_terminal_id && (
                    <p className="mt-1 text-sm text-error">
                      {errors.start_terminal_id.message}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-[#6B7280]">
                    Start terminal is fixed to your assigned terminal.
                  </p>
                </div>
                <div>
                  <label className="mb-1.5 block text-base font-medium text-[#2D2D2D]">
                    End terminal (optional)
                  </label>
                  <select
                    className={`input input-bordered h-10 min-h-10 w-full rounded-md text-sm ${errors.end_terminal_id ? "input-error" : ""}`}
                    {...register("end_terminal_id")}
                    disabled={isLoadingTerminalOptions}
                  >
                    <option value="">
                      {isLoadingTerminalOptions
                        ? "Loading terminals..."
                        : "Select end terminal (optional)"}
                    </option>
                    {terminalOptions.map((terminal) => (
                      <option key={terminal.id} value={terminal.id}>
                        {terminal.terminal_name}
                      </option>
                    ))}
                  </select>
                  {errors.end_terminal_id && (
                    <p className="mt-1 text-sm text-error">
                      {errors.end_terminal_id.message}
                    </p>
                  )}
                </div>
              </div>
              <div className="mt-2 rounded-md bg-[#F9FAFB] p-2 text-xs text-[#6B7280]">
                {routeCoverageLabel}
              </div>
              <div className="mt-3 grid grid-cols-1 gap-2.5 md:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-base font-medium text-[#2D2D2D]">
                    Start location (lat, lng)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 14.554700, 120.984200"
                    className={`input input-bordered h-10 min-h-10 w-full rounded-md text-sm ${errors.start_location ? "input-error" : ""}`}
                    {...register("start_location")}
                  />
                  {errors.start_location && (
                    <p className="mt-1 text-sm text-error">
                      {errors.start_location.message}
                    </p>
                  )}
                </div>
                <div>
                  <label className="mb-1.5 block text-base font-medium text-[#2D2D2D]">
                    End location (lat, lng)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 14.733300, 121.050000"
                    className={`input input-bordered h-10 min-h-10 w-full rounded-md text-sm ${errors.end_location ? "input-error" : ""}`}
                    {...register("end_location")}
                  />
                  {errors.end_location && (
                    <p className="mt-1 text-sm text-error">
                      {errors.end_location.message}
                    </p>
                  )}
                </div>
              </div>
            </section>

            {errors.route_name && (
              <p className="text-sm text-error">{errors.route_name.message}</p>
            )}
            {submitError && <p className="text-sm text-error">{submitError}</p>}

            <div className="mt-5 flex items-center justify-end gap-3">
              <button
                type="button"
                className="text-sm font-semibold text-[#242424] hover:text-[#111111]"
                onClick={closeModal}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn h-10 min-h-10 rounded-md border-none bg-[#0062CA] px-5 text-sm font-semibold text-white hover:bg-[#0052A8]"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Adding…" : "Add route"}
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
