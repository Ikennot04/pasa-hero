"use client";

import { useState } from "react";
import GeneralsSettings from "./_components/Generals";
import Notifications from "./_components/Notifications";

export default function Settings() {
  const [sessionTimeout, setSessionTimeout] = useState(60);
  const [requireReauth, setRequireReauth] = useState(true);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [saved, setSaved] = useState(false);

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="pt-6 pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-base-content/70 text-sm mt-1">
            Manage app and system preferences.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-primary shrink-0"
          onClick={handleSave}
          disabled={saved}
        >
          {saved ? "Saved" : "Save changes"}
        </button>
      </div>

      {/* Sections grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GeneralsSettings />
        <Notifications />

        {/* Security */}
        <section className="rounded-xl border border-base-content/10 bg-base-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-base-content/10 bg-base-200/50">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-base-content/70">
              Security
            </h2>
          </div>
          <div className="p-5 space-y-4">
            <div className="form-control">
              <label className="label py-1 pr-2">
                <span className="label-text font-medium">Session timeout (minutes)</span>
              </label>
              <input
                type="number"
                min={5}
                max={480}
                className="input input-bordered w-full max-w-32"
                value={sessionTimeout}
                onChange={(e) => setSessionTimeout(Number(e.target.value) || 60)}
              />
              <span className="label-text-alt text-base-content/60 mt-1">5–480</span>
            </div>
            <div className="flex items-center justify-between gap-4 py-2">
              <div>
                <span className="text-sm font-medium block">Require re-auth for sensitive actions</span>
                <span className="text-xs text-base-content/60">e.g. delete user, change role</span>
              </div>
              <input
                type="checkbox"
                className="toggle toggle-primary toggle-sm"
                checked={requireReauth}
                onChange={(e) => setRequireReauth(e.target.checked)}
              />
            </div>
          </div>
        </section>

        {/* Display */}
        <section className="rounded-xl border border-base-content/10 bg-base-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-base-content/10 bg-base-200/50">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-base-content/70">
              Display
            </h2>
          </div>
          <div className="p-5 space-y-4">
            <div className="form-control">
              <label className="label py-1 pr-2">
                <span className="label-text font-medium">Table rows per page</span>
              </label>
              <select
                className="select select-bordered select-sm w-full max-w-32"
                value={rowsPerPage}
                onChange={(e) => setRowsPerPage(Number(e.target.value))}
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
