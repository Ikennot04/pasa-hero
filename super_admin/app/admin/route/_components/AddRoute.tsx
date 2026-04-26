"use client";

import { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { GoogleMap, LoadScript } from "@react-google-maps/api";
import { addRouteSchema, type AddRouteFormData } from "./addRouteSchema";
import { googleMapsApiKey, isGoogleMapsConfigured } from "@/lib/firebaseClient";

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

// Terminal options for dropdowns (ids align with backend/terminal static data)
const TERMINAL_OPTIONS: TerminalOption[] = [
  {
    id: "1",
    terminal_name: "PITX (Parañaque Integrated Terminal Exchange)",
    lat: 14.5547,
    lng: 120.9842,
  },
  { id: "2", terminal_name: "SM North EDSA", lat: 14.6568, lng: 121.0312 },
  { id: "3", terminal_name: "Monumento", lat: 14.6548, lng: 120.9845 },
  { id: "4", terminal_name: "Fairview", lat: 14.7333, lng: 121.05 },
  { id: "5", terminal_name: "Tamiya Terminal", lat: 10.3157, lng: 123.8854 },
  { id: "6", terminal_name: "Pacific Terminal", lat: 10.3128, lng: 123.8912 },
];

const MAP_CENTER = { lat: 12.8797, lng: 121.774 };
const MAP_ZOOM = 6;
const GOOGLE_MAPS_LIBRARIES: ("marker")[] = ["marker"];

export default function AddRouteModal() {
  const [open, setOpen] = useState(false);
  const [droppedMarkers, setDroppedMarkers] = useState<DroppedMarker[]>([]);
  const [selectedTool, setSelectedTool] = useState<MarkerType>("start");
  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);
  const advancedMarkersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<AddRouteFormData>({
    resolver: yupResolver(addRouteSchema),
    mode: "onTouched",
    defaultValues: {
      route_name: "",
      route_code: "",
      start_terminal_id: "",
      end_terminal_id: "",
      estimated_duration: undefined,
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

  const startTerminalValue = watch("start_terminal_id");
  const endTerminalValue = watch("end_terminal_id");

  function resolveTerminalId(value: string) {
    const normalized = value.trim().toLowerCase();
    if (!normalized) return "";

    const match = TERMINAL_OPTIONS.find((t) => {
      const terminalName = t.terminal_name.toLowerCase();
      return (
        t.id.toLowerCase() === normalized ||
        terminalName === normalized ||
        terminalName.includes(normalized)
      );
    });

    return match?.id ?? value.trim();
  }

  useEffect(() => {
    const generatedRouteName =
      startTerminalValue.trim() && endTerminalValue.trim()
        ? `${startTerminalValue.trim()} - ${endTerminalValue.trim()}`
        : "";
    setValue("route_name", generatedRouteName, { shouldValidate: false });
  }, [endTerminalValue, setValue, startTerminalValue]);

  function openModal() {
    setOpen(true);
    reset();
    setDroppedMarkers([]);
    setSelectedTool("start");
  }

  function closeModal() {
    setOpen(false);
    reset();
    setDroppedMarkers([]);
  }

  function nearestTerminal(lat: number, lng: number): TerminalOption | null {
    let best: TerminalOption | null = null;
    let bestDist = Number.POSITIVE_INFINITY;
    for (const t of TERMINAL_OPTIONS) {
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
        (m) => !(tool === "start" && m.type === "start") && !(tool === "end" && m.type === "end"),
      );
      return [
        ...withoutSingle,
        { id: `${tool}-${Date.now()}`, type: tool, lat, lng },
      ];
    });

    if (tool === "start" || tool === "end") {
      const nearest = nearestTerminal(lat, lng);
      if (nearest) {
        setValue(
          tool === "start" ? "start_terminal_id" : "end_terminal_id",
          nearest.terminal_name,
          { shouldValidate: true, shouldTouch: true },
        );
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
    if (!mapInstance || !window.google?.maps?.marker?.AdvancedMarkerElement) return;

    // Clear previous markers on each refresh.
    for (const m of advancedMarkersRef.current) {
      m.map = null;
    }
    advancedMarkersRef.current = [];

    droppedMarkers.forEach((m, idx) => {
      const label =
        m.type === "stop" ? `${idx + 1}` : m.type === "start" ? "S" : "E";
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
        m.type === "start" ? "#16a34a" : m.type === "end" ? "#dc2626" : "#2563eb";
      pin.textContent = label;

      const marker = new google.maps.marker.AdvancedMarkerElement({
        map: mapInstance,
        position: { lat: m.lat, lng: m.lng },
        title: `${m.type.toUpperCase()} (${m.lat.toFixed(4)}, ${m.lng.toFixed(4)})`,
        content: pin,
      });
      marker.addListener("click", () => removeMarker(m.id));
      advancedMarkersRef.current.push(marker);
    });

    return () => {
      for (const m of advancedMarkersRef.current) m.map = null;
      advancedMarkersRef.current = [];
    };
  }, [mapInstance, droppedMarkers]);

  const startMarker = droppedMarkers.find((m) => m.type === "start");
  const endMarker = droppedMarkers.find((m) => m.type === "end");
  const stopMarkers = droppedMarkers.filter((m) => m.type === "stop");

  const routeCoverageLabel =
    startMarker && endMarker
      ? `Start (${startMarker.lat.toFixed(4)}, ${startMarker.lng.toFixed(4)}) → End (${endMarker.lat.toFixed(4)}, ${endMarker.lng.toFixed(4)})`
      : "Place start and end points on the map.";

  async function onSubmit(data: AddRouteFormData) {
    const startPoint = startMarker
      ? {
          latitude: Number(startMarker.lat.toFixed(6)),
          longitude: Number(startMarker.lng.toFixed(6)),
        }
      : null;
    const endPoint = endMarker
      ? {
          latitude: Number(endMarker.lat.toFixed(6)),
          longitude: Number(endMarker.lng.toFixed(6)),
        }
      : null;
    const busStops = stopMarkers.map((s, idx) => ({
      name: `Stop ${idx + 1}`,
      latitude: Number(s.lat.toFixed(6)),
      longitude: Number(s.lng.toFixed(6)),
    }));

    const routeName =
      startMarker && endMarker
        ? `${data.start_terminal_id.trim()} - ${data.end_terminal_id.trim()}`
        : data.route_name;

    if (!startMarker || !endMarker) {
      alert("Please drag and drop both start and end markers on the map.");
      return;
    }

    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
      const res = await fetch(`${baseUrl}/routes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          route_name: routeName,
          route_code: data.route_code,
          start_terminal_id: resolveTerminalId(data.start_terminal_id),
          end_terminal_id: resolveTerminalId(data.end_terminal_id),
          estimated_duration:
            data.estimated_duration != null ? data.estimated_duration : undefined,
          status: "active",
          route_type: "normal",
          pointA: startPoint,
          pointB: endPoint,
          busStops,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.message || "Failed to add route");
      }
      closeModal();
      window.location.reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to add route");
    }
  }

  return (
    <>
      <button type="button" className="btn bg-[#0062CA] text-white hover:bg-[#0062CA]/80" onClick={openModal}>
        Add route
      </button>
      <dialog ref={dialogRef} className="modal">
        <div className="modal-box max-w-6xl rounded-md p-5">
          <h3 className="text-xl font-semibold text-[#222222]">Add route</h3>
          <p className="mt-1 text-sm text-[#6B7280]">
            Build route geometry by selecting a tool, then clicking the map.
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-3">
            <input type="hidden" {...register("route_name")} />

            <section className="rounded-md border border-[#E5E7EB] p-3.5">
              <h4 className="text-sm font-semibold text-[#4B5563]">Map</h4>
              <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-[1fr_250px]">
                <div
                  className="relative min-h-[360px] overflow-hidden rounded-xl border border-[#D1D5DB] bg-[#F3F4F6]"
                >
                  {isGoogleMapsConfigured ? (
                    <LoadScript
                      googleMapsApiKey={googleMapsApiKey}
                      libraries={GOOGLE_MAPS_LIBRARIES}
                    >
                      <GoogleMap
                        center={MAP_CENTER}
                        zoom={MAP_ZOOM}
                        mapContainerStyle={{ width: "100%", minHeight: "360px" }}
                        options={{
                          mapId: "DEMO_MAP_ID",
                          streetViewControl: false,
                          mapTypeControl: false,
                          fullscreenControl: false,
                        }}
                        onLoad={(map) => setMapInstance(map)}
                        onUnmount={() => setMapInstance(null)}
                        onClick={onMapClick}
                      />
                    </LoadScript>
                  ) : (
                    <div className="flex h-full items-center justify-center px-6 text-center text-sm text-[#6B7280]">
                      Add <code className="mx-1">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code>
                      to show Google Map preview.
                    </div>
                  )}
                </div>

                <aside className="rounded-xl border border-[#D1D5DB] bg-white p-3">
                  <p className="text-sm font-semibold text-[#374151]">Marker Toolbox</p>
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
                      onClick={() => setSelectedTool("end")}
                      className={`w-full rounded-md border px-3 py-2 text-left text-sm ${
                        selectedTool === "end"
                          ? "border-red-500 bg-red-100 text-red-900"
                          : "border-red-300 bg-red-50 text-red-800"
                      }`}
                    >
                      End point
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
              <h4 className="text-sm font-semibold text-[#4B5563]">Route identity</h4>
              <div className="mt-3">
                <label className="mb-1.5 block text-base font-medium text-[#2D2D2D]">Route code</label>
                <input
                  type="text"
                  placeholder="e.g. PITX-QC-05"
                  className={`input input-bordered h-10 min-h-10 w-full rounded-md text-sm ${errors.route_code ? "input-error" : ""}`}
                  {...register("route_code")}
                />
                {errors.route_code && <p className="mt-1 text-sm text-error">{errors.route_code.message}</p>}
              </div>
            </section>

            <section className="rounded-md border border-[#E5E7EB] p-3.5">
              <h4 className="text-sm font-semibold text-[#4B5563]">Route coverage</h4>
              <div className="mt-3 grid grid-cols-1 gap-2.5 md:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-base font-medium text-[#2D2D2D]">Start route</label>
                  <input
                    type="text"
                    placeholder="e.g. PITX"
                    className={`input input-bordered h-10 min-h-10 w-full rounded-md text-sm ${errors.start_terminal_id ? "input-error" : ""}`}
                    {...register("start_terminal_id")}
                  />
                  {errors.start_terminal_id && <p className="mt-1 text-sm text-error">{errors.start_terminal_id.message}</p>}
                </div>
                <div>
                  <label className="mb-1.5 block text-base font-medium text-[#2D2D2D]">End route</label>
                  <input
                    type="text"
                    placeholder="e.g. Fairview"
                    className={`input input-bordered h-10 min-h-10 w-full rounded-md text-sm ${errors.end_terminal_id ? "input-error" : ""}`}
                    {...register("end_terminal_id")}
                  />
                  {errors.end_terminal_id && <p className="mt-1 text-sm text-error">{errors.end_terminal_id.message}</p>}
                </div>
              </div>
              <div className="mt-2 rounded-md bg-[#F9FAFB] p-2 text-xs text-[#6B7280]">
                {routeCoverageLabel}
              </div>
            </section>

            <section className="rounded-md border border-[#E5E7EB] p-3.5">
              <h4 className="text-sm font-semibold text-[#4B5563]">Operations setup</h4>
              <div className="mt-3">
                <label className="mb-1.5 block text-base font-medium text-[#2D2D2D]">ETA (minutes)</label>
                <input
                  type="number"
                  min={1}
                  step={1}
                  className={`input input-bordered h-10 min-h-10 w-full rounded-md text-sm ${errors.estimated_duration ? "input-error" : ""}`}
                  {...register("estimated_duration", { valueAsNumber: true })}
                />
                {errors.estimated_duration && (
                  <p className="mt-1 text-sm text-error">{errors.estimated_duration.message}</p>
                )}
              </div>
            </section>

            {errors.route_name && <p className="text-sm text-error">{errors.route_name.message}</p>}

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
