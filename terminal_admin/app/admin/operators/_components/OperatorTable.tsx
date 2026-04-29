"use client";

import { useState } from "react";

type Operator = {
  id: number;
  name: string;
  email: string;
  terminal: string;
  status: "Active" | "Suspended";
};

const initialOperators: Operator[] = [
  {
    id: 1,
    name: "Mark Alonzo",
    email: "mark.alonzo@pasahero.com",
    terminal: "Cubao Terminal",
    status: "Active",
  },
  {
    id: 2,
    name: "Jenna Cruz",
    email: "jenna.cruz@pasahero.com",
    terminal: "Pasay Terminal",
    status: "Active",
  },
  {
    id: 3,
    name: "Carlo Reyes",
    email: "carlo.reyes@pasahero.com",
    terminal: "Baguio Terminal",
    status: "Suspended",
  },
];

export default function OperatorTable() {
  const [operators, setOperators] = useState<Operator[]>(initialOperators);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | Operator["status"]>(
    "All",
  );

  function handleSuspend(operatorId: number) {
    setOperators((prev) =>
      prev.map((operator) =>
        operator.id === operatorId
          ? { ...operator, status: "Suspended" }
          : operator,
      ),
    );
  }

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredOperators = operators.filter((operator) => {
    const matchesStatus =
      statusFilter === "All" ? true : operator.status === statusFilter;
    const matchesSearch =
      normalizedSearch.length === 0
        ? true
        : operator.name.toLowerCase().includes(normalizedSearch) ||
          operator.email.toLowerCase().includes(normalizedSearch) ||
          operator.terminal.toLowerCase().includes(normalizedSearch);

    return matchesStatus && matchesSearch;
  });

  return (
    <div className="rounded-xl border border-base-300 bg-base-100 overflow-x-auto">
      <div className="p-4 border-b border-base-300 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <input
          type="text"
          placeholder="Search operator, email, terminal"
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
            <th>Status</th>
            <th className="text-right">Action</th>
          </tr>
        </thead>
        <tbody>
          {filteredOperators.length > 0 ? (
            filteredOperators.map((operator) => (
              <tr key={operator.id}>
                <td className="font-medium">{operator.name}</td>
                <td>{operator.email}</td>
                <td>{operator.terminal}</td>
                <td>
                  <span
                    className={`badge ${operator.status === "Active" ? "badge-success" : "badge-error"}`}
                  >
                    {operator.status}
                  </span>
                </td>
                <td className="text-right">
                  <button
                    type="button"
                    className="btn btn-sm btn-outline btn-error"
                    disabled={operator.status === "Suspended"}
                    onClick={() => handleSuspend(operator.id)}
                  >
                    Suspend
                  </button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={5} className="text-center py-8 text-base-content/70">
                No operators found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
