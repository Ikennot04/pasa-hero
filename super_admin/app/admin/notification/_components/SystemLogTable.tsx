"use client";

import { useState, useRef, useEffect } from "react";
import { SystemLogProps } from "./SystemLogProps";

function formatDate(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    dateStyle: "short",
    timeStyle: "short",
  });
}

const BULK_DELETE_MODAL_ID = "system-log-bulk-delete-modal";

export default function SystemLogTable({
  logs,
  onBulkDelete,
}: {
  logs: SystemLogProps[];
  onBulkDelete?: (ids: string[]) => void;
}) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

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

  const allIds = logs.map((l) => l.id);
  const allSelected =
    allIds.length > 0 && allIds.every((id) => selectedIds.has(id));

  function toggleAll() {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(allIds));
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
  const canBulkDelete = onBulkDelete && selectedCount > 0;

  return (
    <>
      <div className="space-y-2">
        {canBulkDelete && (
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
        )}
        <div className="overflow-x-auto rounded-box border border-base-content/5 bg-base-100 max-h-220">
          <table className="table">
            <thead>
              <tr>
                <th className="w-10">#</th>
                <th>User</th>
                <th>Action</th>
                <th>Description</th>
                <th>Date</th>
                {onBulkDelete && (
                  <th className="w-10">
                    <input
                      type="checkbox"
                      className="checkbox checkbox-sm"
                      checked={allSelected}
                      onChange={toggleAll}
                      aria-label="Select all"
                    />
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {logs.map((log, i) => (
                <tr key={log.id}>
                  <th>{i + 1}</th>
                  <td className="font-medium">
                    {log.user_name ?? log.user_id}
                    {log.user_email && (
                      <span className="text-sm text-base-content/60 block">
                        {log.user_email}
                      </span>
                    )}
                  </td>
                  <td>
                    <span className="badge badge-sm badge-ghost">
                      {log.action.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="max-w-md">
                    <span
                      className="line-clamp-2"
                      title={log.description ?? undefined}
                    >
                      {log.description ?? "—"}
                    </span>
                  </td>
                  <td className="text-sm text-base-content/70 whitespace-nowrap">
                    {formatDate(log.createdAt)}
                  </td>
                  {onBulkDelete && (
                    <td className="text-right">
                      <input
                        type="checkbox"
                        className="checkbox checkbox-sm"
                        checked={selectedIds.has(log.id)}
                        onChange={() => toggleOne(log.id)}
                        aria-label={`Select log ${log.id}`}
                      />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <dialog
        ref={dialogRef}
        id={BULK_DELETE_MODAL_ID}
        className="modal"
        aria-labelledby="system-log-bulk-delete-title"
        aria-describedby="system-log-bulk-delete-desc"
      >
        <div className="modal-box">
          <h3
            id="system-log-bulk-delete-title"
            className="font-bold text-lg"
          >
            Delete selected logs?
          </h3>
          <p
            id="system-log-bulk-delete-desc"
            className="py-4 text-base-content/80"
          >
            Are you sure you want to delete {selectedCount} log
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
              Delete {selectedCount} log{selectedCount !== 1 ? "s" : ""}
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
