import Link from "next/link";
import { notFound } from "next/navigation";
import { DRIVERS_STATIC, ASSIGNMENTS_STATIC } from "../driverStaticData";
import type { DriverProps } from "../_components/drivers/DriverProps";
import type { AssignmentProps } from "../_components/assignmens/AssignmentProps";
import {
  FaArrowLeft,
  FaUser,
  FaIdCard,
  FaPhone,
  FaGaugeHigh,
  FaBus,
  FaRoute,
} from "react-icons/fa6";

function DriverStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: "badge-success",
    inactive: "badge-ghost",
  };
  return (
    <span className={`badge badge-lg ${map[status] ?? "badge-ghost"}`}>
      {status}
    </span>
  );
}

function AssignmentBadge({
  assignmentStatus,
  assignmentResult,
}: {
  assignmentStatus: string;
  assignmentResult: string;
}) {
  const statusClass: Record<string, string> = {
    active: "badge-success",
    inactive: "badge-ghost",
  };
  const resultClass: Record<string, string> = {
    pending: "badge-warning",
    completed: "badge-success",
    cancelled: "badge-error",
  };
  return (
    <span className="flex flex-wrap gap-2">
      <span
        className={`badge badge-lg ${statusClass[assignmentStatus] ?? "badge-ghost"}`}
      >
        {assignmentStatus}
      </span>
      <span
        className={`badge badge-lg ${resultClass[assignmentResult] ?? "badge-ghost"}`}
      >
        {assignmentResult}
      </span>
    </span>
  );
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
      <span className="text-base font-medium text-base-content/70">{label}</span>
      {children !== undefined ? (
        children
      ) : (
        <span className="text-base font-medium">{value}</span>
      )}
    </div>
  );
}

export default async function DriverDetailsPage({
  params,
}: {
  params: Promise<{ driver_id: string }>;
}) {
  const { driver_id } = await params;
  const driver: DriverProps | undefined = DRIVERS_STATIC.find(
    (d) => d.id === driver_id,
  );

  if (!driver) {
    notFound();
  }

  const driverAssignments: AssignmentProps[] = ASSIGNMENTS_STATIC.filter(
    (a) => a.driver_id === driver_id,
  );
  const fullName = `${driver.f_name} ${driver.l_name}`;

  return (
    <div className="space-y-8 pt-6">
      {/* Hero header */}
      <div className="relative overflow-hidden rounded-2xl bg-linear-to-br from-primary/15 via-base-100 to-base-100 border border-base-content/5 p-6 shadow-lg">
        <div className="absolute right-16 top-1/2 -translate-y-1/2 opacity-10">
          <FaUser className="h-32 w-32 text-primary" />
        </div>
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link
              href="/admin/driver"
              className="btn btn-ghost btn-sm btn-square hover:scale-110 transition-all duration-200 rounded-xl"
              aria-label="Back to drivers"
            >
              <FaArrowLeft className="w-8 h-8" />
              
            </Link>
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/20 text-primary">
                <FaUser className="h-7 w-7" />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight">{fullName}</h1>
                <p className="text-base text-base-content/60 mt-0.5">
                  License: {driver.license_number} · ID: {driver.id}
                </p>
              </div>
            </div>
          </div>
          <DriverStatusBadge status={driver.status} />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Identification */}
        <div className="group rounded-2xl border border-base-content/5 bg-base-100 p-5 shadow-md shadow-base-content/5 transition-shadow hover:shadow-lg">
          <div className="mb-4 flex items-center gap-3 border-b border-base-content/10 pb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <FaIdCard className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-semibold">Identification</h2>
          </div>
          <div className="space-y-0">
            <InfoRow label="First name" value={driver.f_name} />
            <InfoRow label="Last name" value={driver.l_name} />
            <InfoRow label="License number">
              <span className="rounded-lg bg-base-200 px-3 py-1.5 font-mono text-base font-semibold tracking-wider">
                {driver.license_number}
              </span>
            </InfoRow>
          </div>
        </div>

        {/* Status & contact */}
        <div className="group rounded-2xl border border-base-content/5 bg-base-100 p-5 shadow-md shadow-base-content/5 transition-shadow hover:shadow-lg">
          <div className="mb-4 flex items-center gap-3 border-b border-base-content/10 pb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary/15 text-secondary">
              <FaGaugeHigh className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-semibold">Status & Contact</h2>
          </div>
          <div className="space-y-0">
            <InfoRow label="Driver status">
              <DriverStatusBadge status={driver.status} />
            </InfoRow>
            <InfoRow label="Contact number">
              <span className="flex items-center gap-2">
                {driver.contact_number ? (
                  <>
                    <FaPhone className="h-4 w-4 text-base-content/60" />
                    <span className="font-medium">{driver.contact_number}</span>
                  </>
                ) : (
                  <span className="text-base-content/50">—</span>
                )}
              </span>
            </InfoRow>
          </div>
        </div>

        {/* Assignments */}
        <div className="group rounded-2xl border border-base-content/5 bg-base-100 p-5 shadow-md shadow-base-content/5 transition-shadow hover:shadow-lg md:col-span-2">
          <div className="mb-4 flex items-center gap-3 border-b border-base-content/10 pb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/20 text-accent">
              <FaBus className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-semibold">Assignments</h2>
          </div>
          {driverAssignments.length === 0 ? (
            <p className="text-base-content/60 py-4">
              No assignments for this driver.
            </p>
          ) : (
            <div className="space-y-4">
              {driverAssignments.map((assignment) => (
                <Link
                  key={assignment.id}
                  href={`/admin/driver/${assignment.id}`}
                  className="block rounded-xl border border-base-content/5 bg-base-200/50 p-4 transition-colors hover:bg-base-200/80"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <FaRoute className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium">
                          {assignment.bus_number} · {assignment.route_name}
                        </p>
                        <p className="text-sm text-base-content/60">
                          {assignment.arrival_status} · {assignment.departure_status}
                        </p>
                      </div>
                    </div>
                    <AssignmentBadge
                      assignmentStatus={assignment.assignment_status}
                      assignmentResult={assignment.assignment_result}
                    />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
