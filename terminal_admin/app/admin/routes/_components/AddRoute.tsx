"use client";

import { useEffect, useRef, useState } from "react";
import * as yup from "yup";
import { GoogleMap, LoadScript } from "@react-google-maps/api";

import { buildAddRouteSchema, yupErrorsToFieldMap, type AddRouteFormValues } from "../addRouteSchema";
import { useCreateRoute } from "../_hooks/useCreateRoute";
import { useGetTerminalNames } from "../_hooks/useGetTerminalNames";
import { googleMapsApiKey, isGoogleMapsConfigured } from "@/lib/firebaseClient";
import type { RouteRow } from "./Routes";

type NewRouteForm = {
  route_code: string;
  route_name: string;
  start_terminal_id: string;
  end_terminal_id: string;
};

type AddRouteProps = {
  routes: RouteRow[];
  setRoutes: React.Dispatch<React.SetStateAction<RouteRow[]>>;
  setToast: React.Dispatch<React.SetStateAction<string | null>>;
  onCreated?: () => void | Promise<void>;
};

const EMPTY_FORM: NewRouteForm = {
  route_code: "",
  route_name: "",
  start_terminal_id: "",
  end_terminal_id: "",
};

type TerminalNameRow = { _id?: string; terminal_name?: string };
type MarkerType = "start" | "end" | "stop";
type DroppedMarker = {
  id: string;
  type: MarkerType;
  lat: number;
  lng: number;
};

const MAP_CENTER = { lat: 12.8797, lng: 121.774 };
const MAP_ZOOM = 6;
const GOOGLE_MAPS_LIBRARIES: ("marker")[] = ["marker"];

export default function AddRoute({ routes, setRoutes, setToast, onCreated }: AddRouteProps) {
  const [openAddModal, setOpenAddModal] = useState(false);
  const [form, setForm] = useState<NewRouteForm>(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof NewRouteForm, string>>>({});
  const [endTerminalOptions, setEndTerminalOptions] = useState<TerminalNameRow[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [droppedMarkers, setDroppedMarkers] = useState<DroppedMarker[]>([]);
  const [selectedTool, setSelectedTool] = useState<MarkerType>("start");
  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);
  const advancedMarkersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const { getTerminalNames } = useGetTerminalNames();
  const { createRoute } = useCreateRoute();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (openAddModal) dialog.showModal();
    else dialog.close();
    const onClose = () => setOpenAddModal(false);
    dialog.addEventListener("close", onClose);
    return () => dialog.removeEventListener("close", onClose);
  }, [openAddModal]);

  async function onOpenAddModal() {
    setFieldErrors({});
    setForm({
      ...EMPTY_FORM,
      start_terminal_id: localStorage.getItem("assigned_terminal") ?? "",
    });
    setDroppedMarkers([]);
    setSelectedTool("start");
    setOpenAddModal(true);
    const assignedId = localStorage.getItem("assigned_terminal") ?? "";
    const res = await getTerminalNames();
    if (res?.success && Array.isArray(res.data)) {
      const rows = (res.data as TerminalNameRow[])
        .filter((row) => {
          const id = row._id != null ? String(row._id) : "";
          return id && id !== assignedId && Boolean(row.terminal_name?.trim());
        })
        .sort((a, b) => (a.terminal_name ?? "").localeCompare(b.terminal_name ?? ""));
      setEndTerminalOptions(rows);
    } else {
      setEndTerminalOptions([]);
      const message =
        typeof res === "object" && res !== null && "message" in res
          ? String((res as { message: unknown }).message)
          : "Could not load terminal names.";
      setToast(message);
    }
  }

  function onChange<K extends keyof NewRouteForm>(key: K, value: NewRouteForm[K]) {
    setFieldErrors((prev) => ({ ...prev, [key]: undefined }));
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function putMarker(tool: MarkerType, lat: number, lng: number) {
    if (!tool) return;
    console.log(
      `[TerminalAddRoute][${tool.toUpperCase()}] lat=${lat.toFixed(6)}, lng=${lng.toFixed(6)}`,
    );
    setDroppedMarkers((prev) => {
      const withoutSingle = prev.filter(
        (m) => !(tool === "start" && m.type === "start") && !(tool === "end" && m.type === "end"),
      );
      return [...withoutSingle, { id: `${tool}-${Date.now()}`, type: tool, lat, lng }];
    });
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

    for (const m of advancedMarkersRef.current) {
      m.map = null;
    }
    advancedMarkersRef.current = [];

    droppedMarkers.forEach((m, idx) => {
      const stopIndex = droppedMarkers.slice(0, idx + 1).filter((x) => x.type === "stop").length;
      const label = m.type === "stop" ? `${stopIndex}` : m.type === "start" ? "S" : "E";
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

  async function onCreateRoute(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const assignedId = localStorage.getItem("assigned_terminal") ?? "";
    if (!assignedId) {
      setToast("Assigned terminal is missing. Please sign in again.");
      return;
    }

    const endIds = endTerminalOptions
      .map((t) => (t._id != null ? String(t._id) : ""))
      .filter(Boolean);
    const schema = buildAddRouteSchema(routes, endIds, assignedId);

    try {
      const validated = schema.validateSync(form, {
        abortEarly: false,
        stripUnknown: true,
      }) as AddRouteFormValues;
      setFieldErrors({});

      const route_code = validated.route_code.trim().toUpperCase();
      const assignedName = localStorage.getItem("assigned_terminal_name")?.trim() ?? "";
      const endName =
        endTerminalOptions.find((t) => String(t._id) === validated.end_terminal_id)?.terminal_name?.trim() ??
        validated.end_terminal_id;
      const route_name =
        validated.route_name?.trim() ||
        (assignedName && endName ? `${assignedName} – ${endName}` : `${validated.start_terminal_id} – ${endName}`);

      const startMarker = droppedMarkers.find((m) => m.type === "start");
      const endMarker = droppedMarkers.find((m) => m.type === "end");
      const stopMarkers = droppedMarkers.filter((m) => m.type === "stop");
      if (!startMarker || !endMarker) {
        setToast("Please place both start and end markers on the map.");
        return;
      }

      const payload = {
        route_name,
        route_code,
        start_terminal_id: validated.start_terminal_id,
        end_terminal_id: validated.end_terminal_id,
        status: "active",
        route_type: "normal",
        pointA: {
          latitude: Number(startMarker.lat.toFixed(6)),
          longitude: Number(startMarker.lng.toFixed(6)),
        },
        pointB: {
          latitude: Number(endMarker.lat.toFixed(6)),
          longitude: Number(endMarker.lng.toFixed(6)),
        },
        busStops: stopMarkers.map((s, idx) => ({
          name: `Stop ${idx + 1}`,
          latitude: Number(s.lat.toFixed(6)),
          longitude: Number(s.lng.toFixed(6)),
        })),
      };

      setIsSubmitting(true);
      try {
        const res = await createRoute(payload);
        if (res && typeof res === "object" && "success" in res && res.success === true) {
          const doc = res.data as
            | { _id?: string; route_code?: string; route_name?: string; status?: string; updatedAt?: string }
            | undefined;
          await onCreated?.();
          if (!onCreated && doc?._id) {
            const next: RouteRow = {
              id: String(doc._id),
              routeCode: doc.route_code ?? route_code,
              routeName: doc.route_name ?? route_name,
              startRoute: assignedName || validated.start_terminal_id,
              endRoute: endName,
              status: doc.status === "active" ? "active" : "paused",
              active_buses_count: 0,
              updatedAt: doc.updatedAt ?? new Date().toISOString(),
            };
            setRoutes((prev) => [next, ...prev]);
          }
          setOpenAddModal(false);
          setToast(`Route ${route_code} added.`);
          return;
        }
        const message =
          res && typeof res === "object" && "message" in res
            ? String((res as { message: unknown }).message)
            : "Could not create route.";
        setToast(message);
      } finally {
        setIsSubmitting(false);
      }
    } catch (err) {
      if (err instanceof yup.ValidationError) {
        setFieldErrors(yupErrorsToFieldMap(err) as Partial<Record<keyof NewRouteForm, string>>);
        setToast(err.errors[0] ?? "Please fix the form errors.");
        return;
      }
      throw err;
    }
  }

  return (
    <>
      <button type="button" className="btn bg-[#0062CA] text-white" onClick={onOpenAddModal}>
        Add route
      </button>

      <dialog ref={dialogRef} className="modal">
        <div className="modal-box max-w-6xl rounded-md p-5">
          <h3 className="text-xl font-bold">Add route</h3>
          <p className="mt-1 text-sm text-base-content/70">
            Build route geometry by selecting a tool, then clicking the map.
          </p>

          <form className="mt-4 space-y-3" onSubmit={onCreateRoute}>
            <section className="rounded-md border border-base-300 p-3.5">
              <h4 className="text-sm font-semibold text-base-content/80">Map</h4>
              <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-[1fr_250px]">
                <div className="relative min-h-[360px] overflow-hidden rounded-xl border border-base-300 bg-base-200">
                  {isGoogleMapsConfigured ? (
                    <LoadScript googleMapsApiKey={googleMapsApiKey} libraries={GOOGLE_MAPS_LIBRARIES}>
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
                    <div className="flex h-full items-center justify-center px-6 text-center text-sm text-base-content/70">
                      Add <code className="mx-1">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code>
                      to show Google Map preview.
                    </div>
                  )}
                </div>

                <aside className="rounded-xl border border-base-300 bg-base-100 p-3">
                  <p className="text-sm font-semibold text-base-content/80">Marker Toolbox</p>
                  <p className="mt-1 text-xs text-base-content/60">
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
                  <div className="mt-3 rounded-md bg-base-200 p-2 text-xs text-base-content/80">
                    Stops: {droppedMarkers.filter((m) => m.type === "stop").length}
                    <br />
                    {(() => {
                      const s = droppedMarkers.find((m) => m.type === "start");
                      const e = droppedMarkers.find((m) => m.type === "end");
                      if (!s || !e) return "Place start and end points on the map.";
                      return `Start (${s.lat.toFixed(4)}, ${s.lng.toFixed(4)}) -> End (${e.lat.toFixed(4)}, ${e.lng.toFixed(4)})`;
                    })()}
                  </div>
                </aside>
              </div>
            </section>

            <section className="rounded-md border border-base-300 p-3.5">
              <h4 className="text-sm font-semibold text-base-content/80">Route identity</h4>
              <div className="mt-3">
                <label className="label-text font-medium">Route code</label>
                <input
                  className={`input input-bordered mt-1 w-full${fieldErrors.route_code ? " input-error" : ""}`}
                  placeholder="e.g. PITX-QC-05"
                  value={form.route_code}
                  onChange={(e) => onChange("route_code", e.target.value)}
                  aria-invalid={fieldErrors.route_code ? true : undefined}
                />
                {fieldErrors.route_code ? (
                  <span className="label-text-alt text-error">{fieldErrors.route_code}</span>
                ) : null}
              </div>
              <div className="mt-3">
                <label className="label-text font-medium">Route name (optional)</label>
                <input
                  className={`input input-bordered mt-1 w-full${fieldErrors.route_name ? " input-error" : ""}`}
                  placeholder="e.g. PITX - Fairview; leave blank to use start - end"
                  value={form.route_name}
                  onChange={(e) => onChange("route_name", e.target.value)}
                  aria-invalid={fieldErrors.route_name ? true : undefined}
                />
                {fieldErrors.route_name ? (
                  <span className="label-text-alt text-error">{fieldErrors.route_name}</span>
                ) : null}
              </div>
            </section>

            <section className="rounded-md border border-base-300 p-3.5">
              <h4 className="text-sm font-semibold text-base-content/80">Route coverage</h4>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="form-control w-full">
                  <span className="label-text font-medium">Start terminal</span>
                  <input
                    className={`input input-bordered w-full${fieldErrors.start_terminal_id ? " input-error" : ""}`}
                    placeholder="Assigned terminal"
                    value={
                      typeof window !== "undefined"
                        ? localStorage.getItem("assigned_terminal_name")?.trim() || form.start_terminal_id
                        : form.start_terminal_id
                    }
                    disabled
                    readOnly
                    aria-invalid={fieldErrors.start_terminal_id ? true : undefined}
                  />
                  {fieldErrors.start_terminal_id ? (
                    <span className="label-text-alt text-error">{fieldErrors.start_terminal_id}</span>
                  ) : null}
                </label>
                <label className="form-control w-full">
                  <span className="label-text font-medium">End terminal</span>
                  <select
                    className={`select select-bordered w-full${fieldErrors.end_terminal_id ? " select-error" : ""}`}
                    value={form.end_terminal_id}
                    onChange={(e) => onChange("end_terminal_id", e.target.value)}
                    aria-invalid={fieldErrors.end_terminal_id ? true : undefined}
                  >
                    <option value="">Select end terminal</option>
                    {endTerminalOptions.map((row) => {
                      const id = row._id != null ? String(row._id) : "";
                      if (!id) return null;
                      return (
                        <option key={id} value={id}>
                          {row.terminal_name?.trim() ?? id}
                        </option>
                      );
                    })}
                  </select>
                  {fieldErrors.end_terminal_id ? (
                    <span className="label-text-alt text-error">{fieldErrors.end_terminal_id}</span>
                  ) : null}
                </label>
              </div>
            </section>

            <div className="modal-action flex-wrap gap-2">
              <button
                type="button"
                className="btn btn-ghost"
                disabled={isSubmitting}
                onClick={() => setOpenAddModal(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className={`btn bg-[#0062CA] text-white${isSubmitting ? " loading" : ""}`}
                disabled={isSubmitting}
              >
                Add route
              </button>
            </div>
          </form>
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
