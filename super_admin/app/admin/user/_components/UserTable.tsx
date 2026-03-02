"use client";

import { useState } from "react";
import EditUser, { EDIT_USER_MODAL_ID } from "./EditUser";

export type UserRow = {
  id: number;
  f_name: string;
  l_name: string;
  email: string;
  role: string;
  status: string;
};

type UserTableProps = {
  users: UserRow[];
};

export default function UserTable({ users }: UserTableProps) {
  const [userToEdit, setUserToEdit] = useState<UserRow | null>(null);

  const openEditModal = (user: UserRow) => {
    setUserToEdit(user);
    (document.getElementById(EDIT_USER_MODAL_ID) as HTMLDialogElement)?.showModal();
  };

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
            {users.map((user, i) => (
              <tr key={user.id ?? i}>
                <th>{user.id}</th>
                <td>
                  {user.f_name} {user.l_name}
                </td>
                <td>{user.email}</td>
                <td>{user.role}</td>
                <td>{user.status}</td>
                <td className="flex gap-2">
                  <button
                    type="button"
                    className="btn"
                    onClick={() => openEditModal(user)}
                  >
                    Edit
                  </button>
                <button type="button" className="btn">
                  Suspend
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    <EditUser user={userToEdit} />
    </>
  );
}
