"use client";

import { useState, useMemo } from "react";
import CreateOperator from "./_components/CreateOperator";
import CreateTerminalAdmin from "./_components/CreateTerminalAdmin";
import UserTable from "./_components/UserTable";

const ROLES = ["user", "super admin", "operator", "terminal admin"] as const;
const STATUSES = ["active", "inactive", "suspended"] as const;

const MOCK_USERS = [
    {
      id: 1,
      f_name: "Cy",
      l_name: "Ganderton",
      email: "cy.ganderton@example.com",
      role: "super admin",
      status: "active",
    },
    {
      id: 2,
      f_name: "Hart",
      l_name: "Hagerty",
      email: "hart.hagerty@example.com",
      role: "operator",
      status: "active",
    },
    {
      id: 3,
      f_name: "Brice",
      l_name: "Swyre",
      email: "brice.swyre@example.com",
      role: "user",
      status: "inactive",
    },
    {
      id: 4,
      f_name: "John",
      l_name: "Doe",
      email: "john.doe@example.com",
      role: "user",
      status: "inactive",
    },
    {
      id: 5,
      f_name: "Jane",
      l_name: "Smith",
      email: "jane.smith@example.com",
      role: "terminal admin",
      status: "suspended",
    },
  ];

export default function Users() {
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return MOCK_USERS.filter((user) => {
      const matchRole = roleFilter === "all" || user.role === roleFilter;
      const matchStatus = statusFilter === "all" || user.status === statusFilter;
      const matchSearch =
        !q ||
        `${user.f_name} ${user.l_name}`.toLowerCase().includes(q) ||
        user.email.toLowerCase().includes(q);
      return matchRole && matchStatus && matchSearch;
    });
  }, [roleFilter, statusFilter, searchQuery]);

  return (
    <div className="space-y-4 pt-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="form-control border w-64">
            <input
              type="text"
              placeholder="Name or email..."
              className="input input-bordered w-full"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="form-control w-32">
            <select
            className="select select-bordered w-full max-w-xs"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="all">All roles</option>
            {ROLES.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
        </div>
        <div className="form-control w-40">
          <select
            className="select select-bordered w-full max-w-xs"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All statuses</option>
            {STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end pb-2">
          <span className="text-sm text-base-content/70">
            Showing {filteredUsers.length} of {MOCK_USERS.length} users
          </span>
        </div>
        </div>
        <div className="flex items-end gap-2">
          <CreateOperator />
          <CreateTerminalAdmin />
        </div>
      </div>
      <UserTable users={filteredUsers} />
    </div>
  );
}
