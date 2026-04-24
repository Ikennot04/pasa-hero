"use client";

import { useState, useMemo } from "react";
import CreateOperator from "./_components/CreateOperator";
import CreateTerminalAdmin from "./_components/CreateTerminalAdmin";
import UserTable from "./_components/UserTable";
import { useGetUsers } from "./_hooks/useGetUsers";

const ROLES = ["user", "super admin", "operator", "terminal admin"] as const;
const STATUSES = ["active", "inactive", "suspended"] as const;

export default function Users() {
  const { users, loading, error, refetch } = useGetUsers();
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return users.filter((user) => {
      const matchRole = roleFilter === "all" || user.role === roleFilter;
      const matchStatus = statusFilter === "all" || user.status === statusFilter;
      const matchSearch =
        !q ||
        `${user.f_name} ${user.l_name}`.toLowerCase().includes(q) ||
        user.email.toLowerCase().includes(q);
      return matchRole && matchStatus && matchSearch;
    });
  }, [users, roleFilter, statusFilter, searchQuery]);

  return (
    <div className="space-y-4 pt-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="form-control w-64">
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
            {loading
              ? "Loading users…"
              : `Showing ${filteredUsers.length} of ${users.length} users`}
          </span>
        </div>
        </div>
        <div className="flex items-end gap-2">
          <CreateOperator />
          <CreateTerminalAdmin />
        </div>
      </div>
      {error ? (
        <div className="alert alert-error">
          <span>{error}</span>
          <button type="button" className="btn btn-sm" onClick={() => void refetch()}>
            Retry
          </button>
        </div>
      ) : null}
      {loading && !users.length ? (
        <div className="flex justify-center py-12">
          <span className="loading loading-spinner loading-lg" />
        </div>
      ) : error && !users.length ? null : (
        <UserTable
          key={`${roleFilter}-${statusFilter}-${searchQuery}`}
          users={filteredUsers}
        />
      )}
    </div>
  );
}
