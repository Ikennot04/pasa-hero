import Link from "next/link";
import { notFound } from "next/navigation";
import {
  FaArrowLeft,
  FaUser,
  FaRoute,
  FaClipboardList,
  FaClock,
} from "react-icons/fa6";
import type { AssignmentProps } from "../../_components/assignmens/AssignmentProps";

// Static data for assignments (matches driver page; replace with API fetch when ready)
const ASSIGNMENTS_STATIC: AssignmentProps[] = [
  {
    id: "a1",
    bus_id: "b1",
    driver_id: "1",
    operator_user_id: "op1",
    route_id: "r1",
    driver_name: "Juan Dela Cruz",
    operator_name: "Carlos Reyes",
    bus_number: "BUS-101",
    route_name: "EDSA – Monumento to PITX",
    assignment_status: "active",
    assignment_result: "pending",
    arrival_status: "arrival_pending",
    departure_status: "departed",
    arrival_confirmed_at: null,
    departure_confirmed_at: "2025-02-27T06:30:00",
  },
  {
    id: "a2",
    bus_id: "b2",
    driver_id: "2",
    operator_user_id: "op2",
    route_id: "r2",
    driver_name: "Maria Santos",
    operator_name: "Elena Torres",
    bus_number: "BUS-102",
    route_name: "Commonwealth – Fairview to SM North",
    assignment_status: "active",
    assignment_result: "pending",
    arrival_status: "arrived",
    departure_status: "departure_pending",
    arrival_confirmed_at: "2025-02-27T07:15:00",
    departure_confirmed_at: null,
  },
  {
    id: "a3",
    bus_id: "b3",
    driver_id: "3",
    operator_user_id: "op3",
    route_id: "r1",
    driver_name: "Pedro Reyes",
    operator_name: "Miguel Santos",
    bus_number: "BUS-103",
    route_name: "EDSA – Monumento to PITX",
    assignment_status: "active",
    assignment_result: "completed",
    arrival_status: "arrived",
    departure_status: "departed",
    arrival_confirmed_at: "2025-02-27T08:00:00",
    departure_confirmed_at: "2025-02-27T08:45:00",
  },
  {
    id: "a4",
    bus_id: "b4",
    driver_id: "4",
    operator_user_id: "op2",
    route_id: "r3",
    driver_name: "Ana Garcia",
    operator_name: "Elena Torres",
    bus_number: "BUS-104",
    route_name: "Quezon Ave – QC Circle to Quiapo",
    assignment_status: "inactive",
    assignment_result: "cancelled",
    arrival_status: "arrival_pending",
    departure_status: "departure_pending",
    arrival_confirmed_at: null,
    departure_confirmed_at: null,
  },
  {
    id: "a5",
    bus_id: "b5",
    driver_id: "5",
    operator_user_id: "op1",
    route_id: "r2",
    driver_name: "Roberto Mendoza",
    operator_name: "Carlos Reyes",
    bus_number: "BUS-105",
    route_name: "Commonwealth – Fairview to SM North",
    assignment_status: "active",
    assignment_result: "pending",
    arrival_status: "arrival_pending",
    departure_status: "departure_pending",
    arrival_confirmed_at: null,
    departure_confirmed_at: null,
  },
];

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

export default async function AssignmentDetailsPage({
  params,
}: {
  params: Promise<{ assignment_id: string }>;
}) {
  const { assignment_id } = await params;
  const assignment: AssignmentProps | undefined = ASSIGNMENTS_STATIC.find(
    (a) => a.id === assignment_id,
  );

  if (!assignment) {
    notFound();
  }

  return (
    <div className="space-y-8 pt-6">
      {/* Hero header */}
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
        {/* Driver & route */}
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

        {/* Assignment status */}
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

        {/* Timestamps */}
        {(assignment.arrival_confirmed_at ||
          assignment.departure_confirmed_at ||
          assignment.createdAt ||
          assignment.updatedAt) && (
          <div className="group rounded-2xl border border-base-content/5 bg-base-100 p-5 shadow-md shadow-base-content/5 transition-shadow hover:shadow-lg md:col-span-2">
            <div className="mb-4 flex items-center gap-3 border-b border-base-content/10 pb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/20 text-accent">
                <FaClock className="h-5 w-5" />
              </div>
              <h2 className="text-xl font-semibold">Timeline</h2>
            </div>
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-0 rounded-xl bg-base-200/50 p-4">
                <InfoRow
                  label="Arrival confirmed"
                  value={formatDate(assignment.arrival_confirmed_at)}
                />
                <InfoRow
                  label="Departure confirmed"
                  value={formatDate(assignment.departure_confirmed_at)}
                />
              </div>
              <div className="space-y-0 rounded-xl bg-base-200/50 p-4">
                <InfoRow
                  label="Created"
                  value={
                    assignment.createdAt
                      ? formatDate(assignment.createdAt)
                      : "—"
                  }
                />
                <InfoRow
                  label="Last updated"
                  value={
                    assignment.updatedAt
                      ? formatDate(assignment.updatedAt)
                      : "—"
                  }
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
