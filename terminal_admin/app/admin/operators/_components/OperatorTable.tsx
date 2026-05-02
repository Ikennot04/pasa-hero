"use client";

import { useEffect, useMemo, useState } from "react";
import { useGetOperators } from "../_hooks/useGetOperators";
import { useSuspendOperator } from "../_hooks/useSuspendOperator";
import SuspendOperator, {
  CONFIRM_SUSPEND_OPERATOR_MODAL_ID,
  type ConfirmOperatorStatusModalMode,
} from "./SuspendOperator";
import { MdOutlinePerson, MdOutlinePersonOff } from "react-icons/md";

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
  pageSize?: number;
};

export default function OperatorTable({
  refreshSignal = 0,
  pageSize = 10,
}: OperatorTableProps) {
  const { getOperators, error } = useGetOperators();
  const { suspendOperator, unsuspendOperator } = useSuspendOperator();
  const [operators, setOperators] = useState<Operator[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | Operator["status"]>(
    "All",
  );
  const [statusConfirm, setStatusConfirm] = useState<{
    operator: Operator;
    mode: ConfirmOperatorStatusModalMode;
  } | null>(null);
  const [page, setPage] = useState(1);

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

  const totalRows = filteredOperators.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
  const activePage = Math.min(Math.max(1, page), totalPages);

  const pageOperators = useMemo(() => {
    const start = (activePage - 1) * pageSize;
    return filteredOperators.slice(start, start + pageSize);
  }, [filteredOperators, activePage, pageSize]);

  const pageNumbers = useMemo(() => {
    const pages: number[] = [];
    const lo = Math.max(1, activePage - 2);
    const hi = Math.min(totalPages, activePage + 2);
    for (let i = lo; i <= hi; i += 1) pages.push(i);
    return pages;
  }, [activePage, totalPages]);

  const goToPage = (next: number) => {
    setPage(Math.max(1, Math.min(totalPages, next)));
  };

  const openStatusModal = (
    operator: Operator,
    mode: ConfirmOperatorStatusModalMode,
  ) => {
    setStatusConfirm({ operator, mode });
    (
      document.getElementById(
        CONFIRM_SUSPEND_OPERATOR_MODAL_ID,
      ) as HTMLDialogElement
    )?.showModal();
  };

  const handleConfirmStatusChange = async (operator: Operator) => {
    const ctx = statusConfirm;
    if (!ctx || ctx.operator.id !== operator.id) return;

    if (ctx.mode === "unsuspend") {
      await unsuspendOperator(operator.id);
    } else {
      await suspendOperator(operator.id);
    }

    setOperators((current) =>
      current.map((row) =>
        row.id === operator.id
          ? {
              ...row,
              status: ctx.mode === "unsuspend" ? "Active" : "Suspended",
            }
          : row,
      ),
    );
  };

  return (
    <>
      <div className="rounded-xl border border-base-300 bg-base-100 overflow-x-auto">
        <div className="p-4 border-b border-base-300 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <input
            type="text"
            placeholder="Search operator, email, terminal, creator"
            className="input input-bordered w-full md:max-w-sm"
            value={searchTerm}
            onChange={(event) => {
              setPage(1);
              setSearchTerm(event.target.value);
            }}
          />
          <select
            className="select select-bordered w-full md:w-52"
            value={statusFilter}
            onChange={(event) => {
              setPage(1);
              setStatusFilter(event.target.value as "All" | Operator["status"]);
            }}
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
            ) : totalRows > 0 ? (
              pageOperators.map((operator) => (
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
                  <td className="text-right">
                    <div className="flex justify-end">
                      {operator.status === "Suspended" ? (
                        <button
                          type="button"
                          className="btn btn-sm btn-success text-white"
                          onClick={() => openStatusModal(operator, "unsuspend")}
                        >
                          <MdOutlinePerson className="w-4 h-4" />
                          Unsuspend
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-sm bg-[#D0393A] hover:bg-[#D0393A]/90 text-white"
                          onClick={() => openStatusModal(operator, "suspend")}
                        >
                          <MdOutlinePersonOff className="w-4 h-4" />
                          Suspend
                        </button>
                      )}
                    </div>
                  </td>
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
        {!isLoading && !error && totalRows > 0 ? (
          <div className="flex flex-col items-stretch gap-3 border-t border-base-300 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-base-content/70">
              {(activePage - 1) * pageSize + 1}-
              {Math.min(activePage * pageSize, totalRows)} of {totalRows}
            </p>
            <div className="join flex-wrap justify-center">
              <button
                type="button"
                className="btn join-item btn-sm"
                disabled={activePage <= 1}
                onClick={() => goToPage(1)}
              >
                First
              </button>
              <button
                type="button"
                className="btn join-item btn-sm"
                disabled={activePage <= 1}
                onClick={() => goToPage(activePage - 1)}
              >
                Prev
              </button>
              {pageNumbers.map((p) => (
                <button
                  key={p}
                  type="button"
                  className={`btn join-item btn-sm ${p === activePage ? "btn-active" : ""}`}
                  onClick={() => goToPage(p)}
                >
                  {p}
                </button>
              ))}
              <button
                type="button"
                className="btn join-item btn-sm"
                disabled={activePage >= totalPages}
                onClick={() => goToPage(activePage + 1)}
              >
                Next
              </button>
              <button
                type="button"
                className="btn join-item btn-sm"
                disabled={activePage >= totalPages}
                onClick={() => goToPage(totalPages)}
              >
                Last
              </button>
            </div>
          </div>
        ) : null}
      </div>
      <SuspendOperator
        operator={statusConfirm?.operator ?? null}
        mode={statusConfirm?.mode ?? "suspend"}
        onConfirm={handleConfirmStatusChange}
      />
    </>
  );
}
