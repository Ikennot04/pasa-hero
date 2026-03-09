"use client";

import { useState } from "react";

export default function SecuritySettings() {
  const [sessionTimeout, setSessionTimeout] = useState(60);

  return (
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
      </div>
    </section>
  );
}
