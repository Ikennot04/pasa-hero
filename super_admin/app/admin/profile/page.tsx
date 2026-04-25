"use client";

import { useMemo, useState } from "react";

const PROFILE_NAME_KEY = "super_admin_f_name";
const PROFILE_ROLE_KEY = "super_admin_role";
const PROFILE_EMAIL_KEY = "super_admin_email";

export default function Profile() {
  const [fullName, setFullName] = useState(() => {
    if (typeof window === "undefined") return "Admin";
    const localName = localStorage.getItem(PROFILE_NAME_KEY);
    return localName?.trim() ? localName : "Admin";
  });
  const [role] = useState(() => {
    if (typeof window === "undefined") return "Administrator";
    const localRole = localStorage.getItem(PROFILE_ROLE_KEY);
    return localRole?.trim() ? localRole : "Administrator";
  });
  const [email, setEmail] = useState(() => {
    if (typeof window === "undefined") return "admin@pasahero.com";
    const localEmail = localStorage.getItem(PROFILE_EMAIL_KEY);
    return localEmail?.trim() ? localEmail : "admin@pasahero.com";
  });
  const [isEditing, setIsEditing] = useState(false);
  const [draftName, setDraftName] = useState(fullName);
  const [draftEmail, setDraftEmail] = useState(email);
  const [saveMessage, setSaveMessage] = useState("");

  const initials = useMemo(() => {
    return fullName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0]?.toUpperCase())
      .join("");
  }, [fullName]);

  const handleStartEdit = () => {
    setDraftName(fullName);
    setDraftEmail(email);
    setSaveMessage("");
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setDraftName(fullName);
    setDraftEmail(email);
    setSaveMessage("");
    setIsEditing(false);
  };

  const handleSaveProfile = () => {
    const nextName = draftName.trim() || "Admin";
    const nextEmail = draftEmail.trim() || "admin@pasahero.com";

    setFullName(nextName);
    setEmail(nextEmail);
    localStorage.setItem(PROFILE_NAME_KEY, nextName);
    localStorage.setItem(PROFILE_EMAIL_KEY, nextEmail);

    setIsEditing(false);
    setSaveMessage("Profile updated.");
  };

  return (
    <div className="py-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <section className="rounded-2xl bg-base-200 p-6 shadow-sm">
          <p className="text-sm font-medium text-base-content/70">
            Admin account
          </p>
          <div className="mt-4 flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="flex size-16 items-center justify-center rounded-full bg-[#0062CA] text-xl font-bold text-white">
              {initials || "A"}
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold tracking-tight">{fullName}</h1>
              <p className="mt-1 text-base-content/70">{email}</p>
              <span className="badge badge-primary mt-3 capitalize">{role}</span>
            </div>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleStartEdit}
            >
              Edit profile
            </button>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-2xl bg-base-200 p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Profile information</h2>
            {saveMessage ? (
              <p className="mt-3 text-sm font-medium text-success">{saveMessage}</p>
            ) : null}
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-3 border-b border-base-300 pb-2">
                <span className="text-base-content/70">Full name</span>
                <span className="font-medium">{fullName}</span>
              </div>
              <div className="flex justify-between gap-3 border-b border-base-300 pb-2">
                <span className="text-base-content/70">Email</span>
                <span className="font-medium">{email}</span>
              </div>
              <div className="flex justify-between gap-3 border-b border-base-300 pb-2">
                <span className="text-base-content/70">Role</span>
                <span className="font-medium capitalize">{role}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-base-content/70">Status</span>
                <span className="font-medium text-success">Active</span>
              </div>
            </div>

            {isEditing ? (
              <div className="mt-6 space-y-3 rounded-xl bg-base-100 p-4">
                <h3 className="text-sm font-semibold">Edit admin profile</h3>
                <label className="form-control w-full">
                  <span className="label-text text-sm text-base-content/70">
                    Full name
                  </span>
                  <input
                    type="text"
                    className="input input-bordered w-full"
                    value={draftName}
                    onChange={(event) => setDraftName(event.target.value)}
                  />
                </label>
                <label className="form-control w-full">
                  <span className="label-text text-sm text-base-content/70">
                    Email
                  </span>
                  <input
                    type="email"
                    className="input input-bordered w-full"
                    value={draftEmail}
                    onChange={(event) => setDraftEmail(event.target.value)}
                  />
                </label>
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleSaveProfile}
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={handleCancelEdit}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : null}
          </div>

          <div className="rounded-2xl bg-base-200 p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Admin overview</h2>
            <p className="mt-1 text-sm text-base-content/70">
              Quick account snapshot for your admin session.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-base-100 p-4">
                <p className="text-xs text-base-content/60">Managed module</p>
                <p className="mt-1 font-semibold">System control</p>
              </div>
              <div className="rounded-xl bg-base-100 p-4">
                <p className="text-xs text-base-content/60">Access level</p>
                <p className="mt-1 font-semibold capitalize">{role}</p>
              </div>
              <div className="rounded-xl bg-base-100 p-4">
                <p className="text-xs text-base-content/60">Last activity</p>
                <p className="mt-1 font-semibold">Today</p>
              </div>
              <div className="rounded-xl bg-base-100 p-4">
                <p className="text-xs text-base-content/60">Session</p>
                <p className="mt-1 font-semibold text-success">Secure</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
