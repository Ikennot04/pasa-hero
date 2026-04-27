"use client";

import { useMemo, useState } from "react";
import { useSuspendUser } from "../_hooks/useSuspendUser";
import EditUserModal from "./EditUser";
import ConfirmSuspendModal, {
  CONFIRM_SUSPEND_MODAL_ID,
  type ConfirmStatusModalMode,
} from "./ConfirmSuspend";

// ICONS
import { MdOutlinePerson, MdOutlinePersonOff } from "react-icons/md";

export type UserRow = {
  id: string;
  f_name: string;
  l_name: string;
  email: string;
  role: string;
  status: string;
};

const DEFAULT_PAGE_SIZE = 10;

const USER_STATUS_BADGE_CLASS: Record<string, string> = {
  active: "badge-success",
  suspended: "badge-warning",
  inactive: "badge-ghost",
};

function UserStatusBadge({ status }: { status: string }) {
  const key = status.trim().toLowerCase();
  const cls = USER_STATUS_BADGE_CLASS[key] ?? "badge-ghost";
  const label =
    key.length > 0
      ? key.charAt(0).toUpperCase() + key.slice(1)
      : "—";
  return <span className={`badge badge-sm ${cls}`}>{label}</span>;
}

/** Roles not shown in this table (matches API enum values). */
export const USER_TABLE_EXCLUDED_ROLES = new Set(["super admin", "admin"]);

type UserTableProps = {
  users: UserRow[];
  pageSize?: number;
  onUserUpdated?: () => void | Promise<void>;
};

export default function UserTable({
  users,
  pageSize = DEFAULT_PAGE_SIZE,
  onUserUpdated,
}: UserTableProps) {
  const { suspendUser, unsuspendUser } = useSuspendUser();
  const [statusConfirm, setStatusConfirm] = useState<{
    user: UserRow;
    mode: ConfirmStatusModalMode;
  } | null>(null);
  const [page, setPage] = useState(1);

  const visibleUsers = useMemo(
    () =>
      users.filter(
        (u) => !USER_TABLE_EXCLUDED_ROLES.has(u.role.trim().toLowerCase()),
      ),
    [users],
  );

  const totalPages = Math.max(1, Math.ceil(visibleUsers.length / pageSize));
  const activePage = Math.min(Math.max(1, page), totalPages);

  const pageUsers = useMemo(() => {
    const start = (activePage - 1) * pageSize;
    return visibleUsers.slice(start, start + pageSize);
  }, [visibleUsers, activePage, pageSize]);

  const openStatusModal = (user: UserRow, mode: ConfirmStatusModalMode) => {
    setStatusConfirm({ user, mode });
    (
      document.getElementById(CONFIRM_SUSPEND_MODAL_ID) as HTMLDialogElement
    )?.showModal();
  };

  const go = (next: number) => {
    setPage(Math.min(Math.max(1, next), totalPages));
  };

  const handleConfirmStatusChange = async (user: UserRow) => {
    const ctx = statusConfirm;
    if (!ctx || ctx.user.id !== user.id) return;
    if (ctx.mode === "unsuspend") {
      await unsuspendUser(user.id);
    } else {
      await suspendUser(user.id);
    }
    await onUserUpdated?.();
  };

  const pageNumbers = useMemo(() => {
    const window = 2;
    const lo = Math.max(1, activePage - window);
    const hi = Math.min(totalPages, activePage + window);
    const nums: number[] = [];
    for (let p = lo; p <= hi; p++) nums.push(p);
    return nums;
  }, [activePage, totalPages]);

  return (
    <>
      <div className="overflow-x-auto rounded-box border border-base-content/5 bg-base-100">
        <table className="table text-base">
          <thead>
            <tr>
              <th></th>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {pageUsers.map((user, i) => (
              <tr key={user.id ?? i}>
                <th>{(activePage - 1) * pageSize + i + 1}</th>
                <td>
                  {user.f_name} {user.l_name}
                </td>
                <td>{user.email}</td>
                <td>{user.role}</td>
                <td>
                  <UserStatusBadge status={user.status} />
                </td>
                <td className="flex flex-wrap gap-2">
                  <EditUserModal user={user} onUpdated={onUserUpdated} />
                  {user.status.trim().toLowerCase() === "suspended" ? (
                    <button
                      type="button"
                      className="btn btn-success text-white"
                      onClick={() => openStatusModal(user, "unsuspend")}
                    >
                      <MdOutlinePerson className="w-5 h-5" />
                      Unsuspend
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn bg-[#D0393A] hover:bg-[#D0393A]/90 text-white"
                      onClick={() => openStatusModal(user, "suspend")}
                    >
                      <MdOutlinePersonOff className="w-5 h-5" />
                      Suspend
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {visibleUsers.length > 0 ? (
        <div className="flex flex-col items-stretch gap-3 border-t border-base-content/10 bg-base-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-base-content/70">
            {(activePage - 1) * pageSize + 1}–
            {Math.min(activePage * pageSize, visibleUsers.length)} of{" "}
            {visibleUsers.length}
          </p>
          <div className="join flex-wrap justify-center">
            <button
              type="button"
              className="btn join-item btn-sm"
              disabled={activePage <= 1}
              onClick={() => go(1)}
            >
              First
            </button>
            <button
              type="button"
              className="btn join-item btn-sm"
              disabled={activePage <= 1}
              onClick={() => go(activePage - 1)}
            >
              Prev
            </button>
            {pageNumbers.map((p) => (
              <button
                key={p}
                type="button"
                className={`btn join-item btn-sm ${p === activePage ? "btn-active" : ""}`}
                onClick={() => go(p)}
              >
                {p}
              </button>
            ))}
            <button
              type="button"
              className="btn join-item btn-sm"
              disabled={activePage >= totalPages}
              onClick={() => go(activePage + 1)}
            >
              Next
            </button>
            <button
              type="button"
              className="btn join-item btn-sm"
              disabled={activePage >= totalPages}
              onClick={() => go(totalPages)}
            >
              Last
            </button>
          </div>
        </div>
      ) : null}

      <ConfirmSuspendModal
        user={statusConfirm?.user ?? null}
        mode={statusConfirm?.mode ?? "suspend"}
        onConfirm={handleConfirmStatusChange}
      />
    </>
  );
}
