"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import CreateTerminalAdmin from "./_components/CreateTerminalAdmin";
import UserTable, {
  type UserRow,
  USER_TABLE_EXCLUDED_ROLES,
} from "./_components/UserTable";
import { useGetUsers } from "./_hooks/useGetUsers";

const ROLES = ["user", "operator", "terminal admin"] as const;
const STATUSES = ["active", "inactive", "suspended"] as const;

type ApiUser = {
  _id: string;
  f_name: string;
  l_name: string;
  email: string;
  role: string;
  status: string;
};

export default function Users() {
  const { getUsers, error } = useGetUsers();
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshUsers = useCallback(async () => {
    const res = await getUsers();
    if (res?.success === true && Array.isArray(res.data)) {
      setUsers(res.data);
    } else {
      setUsers([]);
    }
  }, [getUsers]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      await refreshUsers();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshUsers]);

  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  useEffect(() => {
    if (roleFilter === "all") return;
    if (!(ROLES as readonly string[]).includes(roleFilter)) {
      setRoleFilter("all");
    }
  }, [roleFilter]);

  const listableUsers = useMemo(
    () =>
      users.filter(
        (u) => !USER_TABLE_EXCLUDED_ROLES.has(u.role.trim().toLowerCase()),
      ),
    [users],
  );

  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return listableUsers.filter((user) => {
      const matchRole = roleFilter === "all" || user.role === roleFilter;
      const matchStatus = statusFilter === "all" || user.status === statusFilter;
      const matchSearch =
        !q ||
        `${user.f_name} ${user.l_name}`.toLowerCase().includes(q) ||
        user.email.toLowerCase().includes(q);
      return matchRole && matchStatus && matchSearch;
    });
  }, [listableUsers, roleFilter, statusFilter, searchQuery]);

  const tableRows: UserRow[] = useMemo(
    () =>
      filteredUsers.map((u) => ({
        id: String(u._id),
        f_name: u.f_name,
        l_name: u.l_name,
        email: u.email,
        role: u.role,
        status: u.status,
      })),
    [filteredUsers],
  );

  return (
    <div className="space-y-4 pt-6">
      {error ? (
        <div role="alert" className="alert alert-error text-sm">
          {error}
        </div>
      ) : null}
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
              Showing {filteredUsers.length} of {listableUsers.length} users
            </span>
          </div>
        </div>
        <div className="flex items-end gap-2">
          <CreateTerminalAdmin onCreated={refreshUsers} />
        </div>
      </div>
      {loading ? (
        <div className="flex justify-center py-16">
          <span className="loading loading-spinner loading-lg text-primary" />
        </div>
      ) : (
        <UserTable users={tableRows} />
      )}
    </div>
  );
}
