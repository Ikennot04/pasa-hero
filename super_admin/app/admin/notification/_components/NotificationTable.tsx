"use client";

import { useState, useRef, useEffect } from "react";
import { NotificationProps } from "../NotificationProps";

function TypeBadge({ type }: { type: string }) {
  const map: Record<string, string> = {
    delay: "badge-warning",
    full: "badge-error",
    skipped_stop: "badge-warning",
    info: "badge-info",
  };
  return (
    <span className={`badge badge-sm ${map[type] ?? "badge-ghost"}`}>
      {type.replace(/_/g, " ")}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const map: Record<string, string> = {
    high: "badge-error",
    medium: "badge-warning",
    low: "badge-ghost",
  };
  return (
    <span className={`badge badge-sm ${map[priority] ?? "badge-ghost"}`}>
      {priority}
    </span>
  );
}

function ScopeBadge({ scope }: { scope: string }) {
  const map: Record<string, string> = {
    bus: "badge-primary",
    route: "badge-secondary",
    terminal: "badge-accent",
    system: "badge-neutral",
  };
  return (
    <span className={`badge badge-sm ${map[scope] ?? "badge-ghost"}`}>
      {scope}
    </span>
  );
}

function formatDate(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    dateStyle: "short",
    timeStyle: "short",
  });
}

const BULK_DELETE_MODAL_ID = "notification-bulk-delete-modal";

export default function NotificationTable({
  notifications,
  onBulkDelete,
}: {
  notifications: NotificationProps[];
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

  const allIds = notifications.map((n) => n.id);
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
              className="btn btn-ghost btn-sm"
              onClick={() => setSelectedIds(new Set())}
            >
              Clear selection
            </button>
            <button
              type="button"
              className="btn btn-error btn-sm"
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
                <th>Title</th>
                <th>Message</th>
                <th>Type</th>
                <th>Priority</th>
                <th>Scope</th>
                <th>Target</th>
                <th>Created</th>
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
              {notifications.map((n, i) => (
                <tr key={n.id}>
                  <th>{i + 1}</th>
                  <td className="font-medium max-w-[180px] truncate" title={n.title}>
                    {n.title}
                  </td>
                  <td className="max-w-[200px] truncate" title={n.message}>
                    {n.message}
                  </td>
                  <td>
                    <TypeBadge type={n.notification_type} />
                  </td>
                  <td>
                    <PriorityBadge priority={n.priority} />
                  </td>
                  <td>
                    <ScopeBadge scope={n.scope} />
                  </td>
                  <td className="text-sm">
                    {n.bus_number && <span>Bus: {n.bus_number}</span>}
                    {n.route_name && (
                      <span>{n.bus_number ? " · " : ""}Route: {n.route_name}</span>
                    )}
                    {n.terminal_name && (
                      <span>
                        {n.bus_number || n.route_name ? " · " : ""}Terminal:{" "}
                        {n.terminal_name}
                      </span>
                    )}
                    {!n.bus_number && !n.route_name && !n.terminal_name && "—"}
                  </td>
                  <td className="text-sm text-base-content/70">
                    {formatDate(n.createdAt)}
                  </td>
                  {onBulkDelete && (
                    <td className="text-right">
                      <input
                        type="checkbox"
                        className="checkbox checkbox-sm"
                        checked={selectedIds.has(n.id)}
                        onChange={() => toggleOne(n.id)}
                        aria-label={`Select ${n.title}`}
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
        aria-labelledby="bulk-delete-title"
        aria-describedby="bulk-delete-desc"
      >
        <div className="modal-box">
          <h3 id="bulk-delete-title" className="font-bold text-lg">
            Delete selected notifications?
          </h3>
          <p id="bulk-delete-desc" className="py-4 text-base-content/80">
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
