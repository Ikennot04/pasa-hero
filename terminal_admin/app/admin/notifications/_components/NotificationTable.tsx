"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import {
  busRefLabel,
  routeRefLabel,
  senderRefLabel,
  terminalRefLabel,
  type NotificationFields,
  type NotificationPriority,
} from "../terminalBroadcastCatalog";

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const TYPE_LABEL: Record<NotificationFields["notification_type"], string> = {
  full: "Full",
  skipped_stop: "Skipped stop",
  info: "Info",
  arrival_reported: "Arrival reported",
  arrival_rejected: "Arrival rejected",
  departure_reported: "Departure reported",
  departure_rejected: "Departure rejected",
  route_free: "Route free",
  occupancy_update: "Occupancy update",
  other: "Other",
  custom: "Custom",
};

function notificationTypeLabel(t: NotificationFields["notification_type"]) {
  return TYPE_LABEL[t] ?? String(t).replace(/_/g, " ");
}

export type PriorityFilter = "all" | NotificationPriority;

function priorityBadge(p: NotificationPriority) {
  if (p === "high") return <span className="badge badge-error">High</span>;
  if (p === "medium") return <span className="badge badge-warning">Medium</span>;
  return <span className="badge badge-ghost badge-sm">Low</span>;
}

export type NotificationTableProps = {
  sorted: NotificationFields[];
  scopedLength: number;
  search: string;
  onSearchChange: (value: string) => void;
  priorityFilter: PriorityFilter;
  onPriorityFilterChange: (value: PriorityFilter) => void;
  onBulkDelete?: (ids: string[]) => void;
};

const BULK_DELETE_MODAL_ID = "terminal-notification-bulk-delete-modal";

export default function NotificationTable({
  sorted,
  scopedLength,
  search,
  onSearchChange,
  priorityFilter,
  onPriorityFilterChange,
  onBulkDelete,
}: NotificationTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const totalRows = sorted.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
  const clampedPage = Math.min(currentPage, totalPages);

  const paginatedRows = useMemo(() => {
    const start = (clampedPage - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, clampedPage, pageSize]);

  const rangeStart = totalRows === 0 ? 0 : (clampedPage - 1) * pageSize + 1;
  const rangeEnd = totalRows === 0 ? 0 : Math.min(clampedPage * pageSize, totalRows);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (showDeleteModal) el.showModal();
    else el.close();
  }, [showDeleteModal]);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    const onClose = () => setShowDeleteModal(false);
    el.addEventListener("close", onClose);
    return () => el.removeEventListener("close", onClose);
  }, []);

  const pageIds = paginatedRows.map((n) => n.id);
  const allSelectedOnPage =
    pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id));

  function toggleAllOnPage() {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelectedOnPage) {
        for (const id of pageIds) next.delete(id);
      } else {
        for (const id of pageIds) next.add(id);
      }
      return next;
    });
  }

  function toggleOne(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleConfirmBulkDelete() {
    if (onBulkDelete && selectedIds.size > 0) {
      onBulkDelete(Array.from(selectedIds));
      setSelectedIds(new Set());
    }
    setShowDeleteModal(false);
  }

  const selectedCount = selectedIds.size;
  const canBulkDelete = Boolean(onBulkDelete) && selectedCount > 0;
  const showCheckboxColumn = Boolean(onBulkDelete);
  const emptyColSpan = showCheckboxColumn ? 11 : 10;

  return (
    <>
      <div className="rounded-xl border border-base-300 bg-base-100 p-4 shadow-sm">
        <div className="flex flex-col gap-3 xl:flex-row xl:flex-wrap xl:items-end">
          <label className="form-control w-full max-w-xs">
            <span className="label-text text-sm font-medium">Search</span>
            <input
              type="search"
              placeholder="Title, message, sender, terminal, route, bus…"
              className="input input-bordered w-full"
              value={search}
              onChange={(e) => {
                setCurrentPage(1);
                onSearchChange(e.target.value);
              }}
            />
          </label>

          <label className="form-control w-full max-w-xs">
            <span className="label-text text-sm font-medium">Priority</span>
            <select
              className="select select-bordered w-full"
              value={priorityFilter}
              onChange={(e) => {
                setCurrentPage(1);
                onPriorityFilterChange(e.target.value as PriorityFilter);
              }}
            >
              <option value="all">All</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </label>

          <label className="form-control w-full max-w-40">
            <span className="label-text text-sm font-medium">Rows per page</span>
            <select
              className="select select-bordered w-full"
              value={pageSize}
              onChange={(e) => {
                setCurrentPage(1);
                setPageSize(Number(e.target.value));
              }}
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </label>

          <p className="text-sm text-base-content/70 xl:pb-2">
            Showing <span className="font-medium">{rangeStart}</span>-{" "}
            <span className="font-medium">{rangeEnd}</span> of{" "}
            <span className="font-medium">{totalRows}</span> filtered (
            <span className="font-medium">{scopedLength}</span> total)
          </p>
        </div>
      </div>

      {canBulkDelete ? (
        <div className="flex items-center justify-end gap-3 flex-wrap">
          <span className="text-sm text-base-content/70">
            {selectedCount} selected
          </span>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setSelectedIds(new Set())}
          >
            Clear selection
          </button>
          <button
            type="button"
            className="btn btn-error"
            onClick={() => setShowDeleteModal(true)}
          >
            Delete selected
          </button>
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-base-300 bg-base-100 shadow-sm">
        <table className="table">
          <thead>
            <tr className="border-base-300">
              <th>Created</th>
              <th>Updated</th>
              <th>Sender</th>
              <th>Terminal</th>
              <th>Route</th>
              <th>Bus</th>
              <th>Title</th>
              <th>Message</th>
              <th>Type</th>
              <th>Priority</th>
              {showCheckboxColumn ? (
                <th className="w-10">
                  <input
                    type="checkbox"
                    className="checkbox checkbox-sm"
                    checked={allSelectedOnPage}
                    onChange={toggleAllOnPage}
                    aria-label="Select all on page"
                  />
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {paginatedRows.length === 0 ? (
              <tr>
                <td colSpan={emptyColSpan} className="text-center text-sm text-base-content/60 py-12">
                  Nothing matches your filters.
                </td>
              </tr>
            ) : (
              paginatedRows.map((n) => (
                <tr key={n.id} className="border-base-200 align-top">
                  <td className="whitespace-nowrap text-sm">{formatDateTime(n.createdAt)}</td>
                  <td className="whitespace-nowrap text-sm text-base-content/80">
                    {formatDateTime(n.updatedAt)}
                  </td>
                  <td className="max-w-40 text-sm">{senderRefLabel(n.sender_id)}</td>
                  <td className="max-w-36 text-sm">{terminalRefLabel(n.terminal_id)}</td>
                  <td className="max-w-40 text-sm">{routeRefLabel(n.route_id)}</td>
                  <td className="max-w-28 text-sm">{busRefLabel(n.bus_id)}</td>
                  <td className="max-w-44 text-sm font-medium">{n.title}</td>
                  <td className="max-w-56 text-sm text-base-content/80">
                    <span className="line-clamp-3">{n.message}</span>
                  </td>
                  <td>
                    <span className="badge badge-ghost ">{notificationTypeLabel(n.notification_type)}</span>
                  </td>
                  <td>{priorityBadge(n.priority)}</td>
                  {showCheckboxColumn ? (
                    <td className="text-right">
                      <input
                        type="checkbox"
                        className="checkbox checkbox-sm"
                        checked={selectedIds.has(n.id)}
                        onChange={() => toggleOne(n.id)}
                        aria-label={`Select ${n.title}`}
                      />
                    </td>
                  ) : null}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-base-300 bg-base-100 px-4 py-3 shadow-sm">
        <p className="text-sm text-base-content/70">
          Page <span className="font-medium">{totalRows === 0 ? 0 : clampedPage}</span> of{" "}
          <span className="font-medium">{totalRows === 0 ? 0 : totalPages}</span>
        </p>
        <div className="join">
          <button
            type="button"
            className="btn btn-sm join-item"
            onClick={() => setCurrentPage(Math.max(1, clampedPage - 1))}
            disabled={clampedPage <= 1 || totalRows === 0}
          >
            Prev
          </button>
          <button type="button" className="btn btn-sm join-item btn-ghost pointer-events-none">
            {totalRows === 0 ? 0 : clampedPage}
          </button>
          <button
            type="button"
            className="btn btn-sm join-item"
            onClick={() => setCurrentPage(Math.min(totalPages, clampedPage + 1))}
            disabled={clampedPage >= totalPages || totalRows === 0}
          >
            Next
          </button>
        </div>
      </div>

      <dialog
        ref={dialogRef}
        id={BULK_DELETE_MODAL_ID}
        className="modal"
        aria-labelledby="terminal-bulk-delete-title"
        aria-describedby="terminal-bulk-delete-desc"
      >
        <div className="modal-box">
          <h3 id="terminal-bulk-delete-title" className="font-bold text-lg">
            Delete selected notifications?
          </h3>
          <p id="terminal-bulk-delete-desc" className="py-4 text-base-content/80">
            Are you sure you want to delete {selectedCount} notification
            {selectedCount !== 1 ? "s" : ""}? This action cannot be undone.
          </p>
          <div className="modal-action">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setShowDeleteModal(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-error"
              onClick={handleConfirmBulkDelete}
            >
              Delete {selectedCount} notification{selectedCount !== 1 ? "s" : ""}
            </button>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button type="submit" tabIndex={-1} aria-hidden>
            close
          </button>
        </form>
      </dialog>
    </>
  );
}
