"use client";

import { useEffect, useMemo, useState } from "react";
import { useGetOperators } from "../_hooks/useGetOperators";

type Operator = {
  id: string;
  name: string;
  email: string;
  terminal: string;
  createdBy: string;
  status: "Active" | "Suspended";
};

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord | null {
  if (!value || typeof value !== "object") return null;
  return value as UnknownRecord;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function mapStatus(value: unknown): Operator["status"] {
  if (typeof value === "boolean") return value ? "Active" : "Suspended";
  const lower = asString(value).toLowerCase();
  return lower === "active" ? "Active" : "Suspended";
}

function fullNameFromRecord(value: unknown): string {
  const user = asRecord(value);
  if (!user) return "";
  const firstName = asString(user.f_name);
  const lastName = asString(user.l_name);
  const fullName = `${firstName} ${lastName}`.trim();
  return fullName || asString(user.name).trim();
}

function normalizeOperators(payload: unknown): Operator[] {
  const root = asRecord(payload);
  const list =
    (Array.isArray(payload) && payload) ||
    (Array.isArray(root?.data) && root?.data) ||
    (Array.isArray(root?.operators) && root?.operators) ||
    (Array.isArray(root?.results) && root?.results) ||
    [];

  return list
    .map((item, index) => {
      const record = asRecord(item);
      if (!record) return null;

      const firstName = asString(record.f_name);
      const lastName = asString(record.l_name);
      const fullName = `${firstName} ${lastName}`.trim();
      const fallbackName = asString(record.name).trim();

      const assignedTerminal = asRecord(record.assigned_terminal);
      const terminalName =
        asString(assignedTerminal?.terminal_name).trim() ||
        asString(record.terminal_name).trim() ||
        asString(record.terminal).trim() ||
        "—";
      const createdByName =
        fullNameFromRecord(record.created_by) ||
        fullNameFromRecord(record.createdBy) ||
        asString(record.created_by_name).trim() ||
        asString(record.createdByName).trim() ||
        "—";

      const id =
        asString(record._id) ||
        asString(record.id) ||
        asString(record.user_id) ||
        String(index);

      return {
        id,
        name: fullName || fallbackName || "Unnamed operator",
        email: asString(record.email) || "—",
        terminal: terminalName,
        createdBy: createdByName,
        status: mapStatus(record.status ?? record.is_active),
      } satisfies Operator;
    })
    .filter((operator): operator is Operator => operator !== null);
}

type OperatorTableProps = {
  refreshSignal?: number;
};

export default function OperatorTable({ refreshSignal = 0 }: OperatorTableProps) {
  const { getOperators, error } = useGetOperators();
  const [operators, setOperators] = useState<Operator[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | Operator["status"]>(
    "All",
  );

  useEffect(() => {
    const assignedTerminal = localStorage.getItem("assigned_terminal")?.trim();

    if (!assignedTerminal) return;

    const loadOperators = async () => {
      setIsLoading(true);
      const response = await getOperators(assignedTerminal);
      setOperators(normalizeOperators(response));
      setIsLoading(false);
    };

    void loadOperators();
  }, [getOperators, refreshSignal]);

  const filteredOperators = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    return operators.filter((operator) => {
      const matchesStatus =
        statusFilter === "All" ? true : operator.status === statusFilter;
      const matchesSearch =
        normalizedSearch.length === 0
          ? true
          : operator.name.toLowerCase().includes(normalizedSearch) ||
            operator.email.toLowerCase().includes(normalizedSearch) ||
            operator.terminal.toLowerCase().includes(normalizedSearch) ||
            operator.createdBy.toLowerCase().includes(normalizedSearch);

      return matchesStatus && matchesSearch;
    });
  }, [operators, searchTerm, statusFilter]);

  return (
    <div className="rounded-xl border border-base-300 bg-base-100 overflow-x-auto">
      <div className="p-4 border-b border-base-300 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <input
          type="text"
          placeholder="Search operator, email, terminal, creator"
          className="input input-bordered w-full md:max-w-sm"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
        />
        <select
          className="select select-bordered w-full md:w-52"
          value={statusFilter}
          onChange={(event) =>
            setStatusFilter(event.target.value as "All" | Operator["status"])
          }
        >
          <option value="All">All status</option>
          <option value="Active">Active</option>
          <option value="Suspended">Suspended</option>
        </select>
      </div>
      <table className="table w-full">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Assigned terminal</th>
            <th>Created by</th>
            <th>Status</th>
            <th className="text-right">Action</th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <tr>
              <td colSpan={6} className="text-center py-8 text-base-content/70">
                Loading operators...
              </td>
            </tr>
          ) : error ? (
            <tr>
              <td colSpan={6} className="text-center py-8 text-error">
                {error}
              </td>
            </tr>
          ) : filteredOperators.length > 0 ? (
            filteredOperators.map((operator) => (
              <tr key={operator.id}>
                <td className="font-medium">{operator.name}</td>
                <td>{operator.email}</td>
                <td>{operator.terminal}</td>
                <td>{operator.createdBy}</td>
                <td>
                  <span
                    className={`badge ${operator.status === "Active" ? "badge-success" : "badge-error"}`}
                  >
                    {operator.status}
                  </span>
                </td>
                <td className="text-right text-base-content/50">—</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={6} className="text-center py-8 text-base-content/70">
                No operators found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
