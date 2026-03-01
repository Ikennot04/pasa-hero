"use client";

import { useState } from "react";

export default function Notifications() {
  const [notificationsOn, setNotificationsOn] = useState(true);
  const [defaultPriority, setDefaultPriority] = useState("medium");
  const [showSystemLogs, setShowSystemLogs] = useState(true);

  return (
    <section className="rounded-xl border border-base-content/10 bg-base-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-base-content/10 bg-base-200/50">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-base-content/70">
          Notifications
        </h2>
      </div>
      <div className="p-5 space-y-4">
        <div className="flex items-center justify-between gap-4 py-2">
          <span className="text-sm font-medium">Enable notifications</span>
          <input
            type="checkbox"
            className="toggle toggle-primary toggle-sm"
            checked={notificationsOn}
            onChange={(e) => setNotificationsOn(e.target.checked)}
          />
        </div>
        <div className="form-control">
          <label className="label py-1 pr-2">
            <span className="label-text font-medium">Default priority</span>
          </label>
          <select
            className="select select-bordered w-full max-w-xs"
            value={defaultPriority}
            onChange={(e) => setDefaultPriority(e.target.value)}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
        <div className="flex items-center justify-between gap-4 py-2">
          <span className="text-sm font-medium">Show system logs on notification page</span>
          <input
            type="checkbox"
            className="toggle toggle-primary toggle-sm"
            checked={showSystemLogs}
            onChange={(e) => setShowSystemLogs(e.target.checked)}
          />
        </div>
      </div>
    </section>
  );
}
