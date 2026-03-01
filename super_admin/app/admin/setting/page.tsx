"use client";

import { useState } from "react";
import GeneralsSettings from "./_components/Generals";
import Notifications from "./_components/Notifications";
import Security from "./_components/Security";
import Display from "./_components/Display";

export default function Settings() {
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
        <Security />
        <Display />
      </div>
    </div>
  );
}
