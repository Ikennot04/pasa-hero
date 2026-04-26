"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  FaArrowLeft,
  FaUser,
  FaRoute,
  FaClipboardList,
  FaClock,
} from "react-icons/fa6";
import type { AssignmentProps } from "../../_components/assignmens/AssignmentProps";
import { useGetBusAssignmentDetails } from "../../_hooks/useGetBusAssignmentDetails";
import {
  mapApiBusAssignmentToProps,
  type ApiBusAssignmentRow,
} from "../../_lib/apiMappers";

type ApiAssignmentEnvelope =
  | { success: true; data: ApiBusAssignmentRow }
  | { success: false; message: string }
  | { success?: boolean; data?: ApiBusAssignmentRow; message?: string };

function StatusBadge({ status }: { status: string }) {
  const classMap: Record<string, string> = {
    active: "badge-success",
    inactive: "badge-ghost",
    pending: "badge-warning",
    completed: "badge-success",
    cancelled: "badge-error",
    arrival_pending: "badge-warning",
    arrived: "badge-success",
    departure_pending: "badge-warning",
    departed: "badge-success",
    arrival: "badge-info",
    departure: "badge-secondary",
    confirmed: "badge-success",
    rejected: "badge-error",
  };
  return (
    <span className={`badge badge-lg ${classMap[status] ?? "badge-ghost"}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

function formatDate(s: string | null) {
  if (!s) return "—";
  const d = new Date(s);
  return d.toLocaleString(undefined, {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function InfoRow({
  label,
  value,
  children,
}: {
  label: string;
  value?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2 py-3 border-b border-base-content/5 last:border-0">
      <span className="text-base font-medium text-base-content/70">
        {label}
      </span>
      {children !== undefined ? (
        children
      ) : (
        <span className="text-base font-medium">{value}</span>
      )}
    </div>
  );
}

type AssignmentDetailsClientProps = {
  assignmentId: string;
};

export default function AssignmentDetailsClient({
  assignmentId,
}: AssignmentDetailsClientProps) {
  const { getBusAssignmentDetails, error: hookError } =
    useGetBusAssignmentDetails();
  const [assignment, setAssignment] = useState<AssignmentProps | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      const res = (await getBusAssignmentDetails(
        assignmentId,
      )) as ApiAssignmentEnvelope | null;
      if (cancelled) return;

      if (res && res.success === true && res.data) {
        setAssignment(mapApiBusAssignmentToProps(res.data));
        setLoadError(null);
      } else {
        setAssignment(null);
        const msg =
          res && "message" in res && typeof res.message === "string"
            ? res.message
            : "Could not load this assignment.";
        setLoadError(msg);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [assignmentId, getBusAssignmentDetails]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24">
        <span className="loading loading-spinner loading-lg text-primary" />
        <p className="text-base-content/70">Loading assignment…</p>
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="space-y-6 pt-6">
        <Link
          href="/admin/driver"
          className="btn btn-ghost btn-sm gap-2"
          aria-label="Back to drivers"
        >
          <FaArrowLeft className="h-4 w-4" />
          Back to drivers
        </Link>
        <div role="alert" className="alert alert-error text-sm">
          <span>{loadError ?? hookError ?? "Assignment not found."}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pt-6">
      <div className="relative overflow-hidden rounded-2xl bg-linear-to-br from-[#0062CA]/15 via-base-100 to-base-100 border border-base-content/5 p-6 shadow-lg">
        <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-10">
          <FaClipboardList className="h-32 w-32 text-[#0062CA]" />
        </div>
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link
              href="/admin/driver"
              className="btn btn-ghost btn-sm btn-square hover:scale-110 transition-all duration-200 rounded-xl"
              aria-label="Back to drivers"
            >
              <FaArrowLeft className="w-7 h-7" />
            </Link>
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[#0062CA]/20 text-[#0062CA]">
                <FaClipboardList className="h-7 w-7" />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight">
                  Assignment {assignment.id}
                </h1>
                <p className="text-base text-base-content/60 mt-0.5">
                  {assignment.driver_name} · {assignment.operator_name} ·{" "}
                  {assignment.bus_number} · {assignment.route_name}
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={assignment.assignment_status} />
            <StatusBadge status={assignment.assignment_result} />
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="group rounded-2xl border border-base-content/5 bg-base-100 p-5 shadow-md shadow-base-content/5 transition-shadow hover:shadow-lg">
          <div className="mb-4 flex items-center gap-3 border-b border-base-content/10 pb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <FaUser className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-semibold">Driver &amp; Route</h2>
          </div>
          <div className="space-y-0">
            <InfoRow label="Driver" value={assignment.driver_name} />
            <InfoRow label="Operator" value={assignment.operator_name} />
            <InfoRow label="Bus" value={assignment.bus_number} />
            <InfoRow label="Route" value={assignment.route_name} />
          </div>
        </div>

        <div className="group rounded-2xl border border-base-content/5 bg-base-100 p-5 shadow-md shadow-base-content/5 transition-shadow hover:shadow-lg">
          <div className="mb-4 flex items-center gap-3 border-b border-base-content/10 pb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary/15 text-secondary">
              <FaRoute className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-semibold">Status</h2>
          </div>
          <div className="space-y-0">
            <InfoRow label="Assignment status">
              <StatusBadge status={assignment.assignment_status} />
            </InfoRow>
            <InfoRow label="Result">
              <StatusBadge status={assignment.assignment_result} />
            </InfoRow>
            <InfoRow label="Arrival">
              <span className="flex flex-wrap items-center gap-2">
                <StatusBadge status={assignment.arrival_status} />
                {assignment.arrival_confirmed_at && (
                  <span className="text-sm text-base-content/60">
                    {formatDate(assignment.arrival_confirmed_at)}
                  </span>
                )}
              </span>
            </InfoRow>
            <InfoRow label="Departure">
              <span className="flex flex-wrap items-center gap-2">
                <StatusBadge status={assignment.departure_status} />
                {assignment.departure_confirmed_at && (
                  <span className="text-sm text-base-content/60">
                    {formatDate(assignment.departure_confirmed_at)}
                  </span>
                )}
              </span>
            </InfoRow>
          </div>
        </div>

        <div className="group rounded-2xl border border-base-content/5 bg-base-100 p-5 shadow-md shadow-base-content/5 transition-shadow hover:shadow-lg md:col-span-2">
          <div className="mb-4 flex items-center gap-3 border-b border-base-content/10 pb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/20 text-accent">
              <FaClock className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-semibold">Latest terminal log</h2>
          </div>
          {assignment.last_terminal_log ? (
            <div className="space-y-0 rounded-xl bg-base-200/50 p-4">
              <InfoRow label="Event">
                <StatusBadge status={assignment.last_terminal_log.event_type} />
              </InfoRow>
              <InfoRow label="Terminal" value={assignment.last_terminal_log.terminal_name} />
              <InfoRow label="Event time" value={formatDate(assignment.last_terminal_log.event_time)} />
              {assignment.last_terminal_log.log_status != null && (
                <InfoRow label="Log status">
                  <StatusBadge status={assignment.last_terminal_log.log_status} />
                </InfoRow>
              )}
            </div>
          ) : (
            <p className="text-base text-base-content/60 py-2">
              No terminal log is linked to this assignment yet.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
