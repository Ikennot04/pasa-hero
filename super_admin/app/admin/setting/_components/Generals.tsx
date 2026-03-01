"use client";

import { useState } from "react";

export default function GeneralsSettings() {
  const [appName, setAppName] = useState("Pasahero Admin");
  const [timezone, setTimezone] = useState("Asia/Manila");
  const [dateFormat, setDateFormat] = useState("short");
  const [language, setLanguage] = useState("en");

  return (
    <section className="rounded-xl border border-base-content/10 bg-base-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-base-content/10 bg-base-200/50">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-base-content/70">
          General
        </h2>
      </div>
      <div className="p-5 space-y-4">
        <div className="form-control">
          <label className="label py-1">
            <span className="label-text font-medium">App name</span>
          </label>
          <input
            type="text"
            className="input input-bordered w-full"
            value={appName}
            onChange={(e) => setAppName(e.target.value)}
            placeholder="Pasahero Admin"
          />
        </div>
        <div className="form-control">
          <label className="label py-1">
            <span className="label-text font-medium">Timezone</span>
          </label>
          <select
            className="select select-bordered w-full"
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
          >
            <option value="Asia/Manila">Asia/Manila</option>
            <option value="UTC">UTC</option>
          </select>
        </div>
        <div className="form-control">
          <label className="label py-1">
            <span className="label-text font-medium">Date format</span>
          </label>
          <select
            className="select select-bordered w-full"
            value={dateFormat}
            onChange={(e) => setDateFormat(e.target.value)}
          >
            <option value="short">Short (3/1/25, 8:30 AM)</option>
            <option value="medium">Medium (Mar 1, 2025)</option>
          </select>
        </div>
        <div className="form-control">
          <label className="label py-1">
            <span className="label-text font-medium">Language</span>
          </label>
          <select
            className="select select-bordered w-full"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
          >
            <option value="en">English</option>
            <option value="fil">Filipino</option>
          </select>
        </div>
      </div>
    </section>
  );
}
