"use client";

import { useMemo, useState } from "react";
import EditUserModal from "./EditUser";
import ConfirmSuspendModal, {
  CONFIRM_SUSPEND_MODAL_ID,
} from "./ConfirmSuspend";

// ICONS
import { MdOutlinePersonOff } from "react-icons/md";

export type UserRow = {
  id: string;
  f_name: string;
  l_name: string;
  email: string;
  role: string;
  status: string;
};

const DEFAULT_PAGE_SIZE = 10;

type UserTableProps = {
  users: UserRow[];
  pageSize?: number;
};

export default function UserTable({
  users,
  pageSize = DEFAULT_PAGE_SIZE,
}: UserTableProps) {
  const [userToSuspend, setUserToSuspend] = useState<UserRow | null>(null);
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(users.length / pageSize));
  const activePage = Math.min(Math.max(1, page), totalPages);

  const pageUsers = useMemo(() => {
    const start = (activePage - 1) * pageSize;
    return users.slice(start, start + pageSize);
  }, [users, activePage, pageSize]);

  const openSuspendModal = (user: UserRow) => {
    setUserToSuspend(user);
    (
      document.getElementById(CONFIRM_SUSPEND_MODAL_ID) as HTMLDialogElement
    )?.showModal();
  };

  const go = (next: number) => {
    setPage(Math.min(Math.max(1, next), totalPages));
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
                <td>{user.status}</td>
                <td className="flex gap-2">
                  <EditUserModal user={user} />
                  <button
                    type="button"
                    className="btn bg-[#D0393A] hover:bg-[#D0393A]/90 text-white"
                    onClick={() => openSuspendModal(user)}
                  >
                    <MdOutlinePersonOff className="w-5 h-5" />
                    Suspend
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {users.length > 0 ? (
        <div className="flex flex-col items-stretch gap-3 border-t border-base-content/10 bg-base-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-base-content/70">
            {(activePage - 1) * pageSize + 1}–
            {Math.min(activePage * pageSize, users.length)} of {users.length}
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

      <ConfirmSuspendModal user={userToSuspend} />
    </>
  );
}
