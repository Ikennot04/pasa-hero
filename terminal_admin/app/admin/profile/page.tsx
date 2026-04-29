"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { useGetUserDetails } from "./_hooks/useGetUserDetails";
import { useUpdateUser } from "./_hooks/useUpdateUser";

const AUTH_TOKEN_KEY = "terminal_admin_auth_token";
const PROFILE_NAME_KEY = "f_name";
const PROFILE_ROLE_KEY = "terminal_admin_role";
const PROFILE_EMAIL_KEY = "terminal_admin_email";

type ApiUser = {
  _id?: string;
  f_name?: string;
  l_name?: string;
  email?: string;
  role?: string;
  status?: string;
};

function decodeJwtUserId(token: string): string | null {
  try {
    const segment = token.split(".")[1];
    if (!segment) return null;
    const json = atob(segment.replace(/-/g, "+").replace(/_/g, "/"));
    const payload = JSON.parse(json) as { userId?: unknown };
    const raw = payload.userId;
    if (raw == null) return null;
    return String(raw);
  } catch {
    return null;
  }
}

function displayNameFromUser(user: ApiUser): string {
  return [user.f_name, user.l_name].filter(Boolean).join(" ").trim() || "Admin";
}

function splitFullName(full: string): { f_name: string; l_name: string } {
  const t = full.trim();
  if (!t) return { f_name: "Admin", l_name: "" };
  const parts = t.split(/\s+/);
  return { f_name: parts[0] ?? "", l_name: parts.slice(1).join(" ") };
}

export default function Profile() {
  const { getUserDetails, error: fetchError } = useGetUserDetails();
  const { updateUser, error: updateUserError } = useUpdateUser();

  const [userId, setUserId] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("active");
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [draftEmail, setDraftEmail] = useState("");
  const [saveMessage, setSaveMessage] = useState("");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [changingPassword, setChangingPassword] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const syncLocalProfile = useCallback((user: ApiUser) => {
    const name = displayNameFromUser(user);
    if (name) localStorage.setItem(PROFILE_NAME_KEY, name);
    if (user.role) localStorage.setItem(PROFILE_ROLE_KEY, user.role);
    if (user.email) localStorage.setItem(PROFILE_EMAIL_KEY, user.email);
  }, []);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setSaveMessage("");
    const token =
      typeof window === "undefined" ? null : localStorage.getItem(AUTH_TOKEN_KEY);
    const id = token ? decodeJwtUserId(token) : null;
    setUserId(id);

    if (!token || !id) {
      setLoading(false);
      return;
    }

    const res = await getUserDetails(id);
    if (res?.success === true && res.data) {
      const u = res.data as ApiUser;
      setFullName(displayNameFromUser(u));
      setEmail(u.email?.trim() ? u.email : "");
      setRole(u.role?.trim() ? u.role : "");
      setStatus(u.status?.trim() ? u.status : "active");
      syncLocalProfile(u);
    }
    setLoading(false);
  }, [getUserDetails, syncLocalProfile]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

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
    setSaveError(null);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setDraftName(fullName);
    setDraftEmail(email);
    setSaveMessage("");
    setSaveError(null);
    setIsEditing(false);
  };

  const handleChangePassword = async () => {
    if (!userId) {
      setPasswordError("Not signed in.");
      return;
    }
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) {
      setPasswordError("Not signed in.");
      return;
    }
    if (!oldPassword.trim() || !newPassword.trim() || !confirmPassword.trim()) {
      setPasswordError("All password fields are required.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("New password and confirm password do not match.");
      return;
    }

    setChangingPassword(true);
    setPasswordMessage("");
    setPasswordError(null);

    try {
      const formData = new FormData();
      formData.append(
        "data",
        JSON.stringify({
          old_password: oldPassword,
          password: newPassword,
        }),
      );

      const res = (await updateUser(userId, formData, token)) as
        | { success?: boolean; message?: string }
        | null;

      if (res?.success) {
        setPasswordMessage("Password updated.");
        setOldPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setPasswordError(res?.message ?? updateUserError ?? "Password update failed");
      }
    } catch {
      setPasswordError(updateUserError ?? "Password update failed");
    } finally {
      setChangingPassword(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!userId) {
      setSaveError("Not signed in.");
      return;
    }
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) {
      setSaveError("Not signed in.");
      return;
    }

    const nextEmail = draftEmail.trim() || email;
    const { f_name, l_name } = splitFullName(draftName);

    setSaving(true);
    setSaveError(null);
    try {
      const formData = new FormData();
      formData.append(
        "data",
        JSON.stringify({
          f_name,
          l_name,
          email: nextEmail,
        }),
      );
      const res = (await updateUser(userId, formData, token)) as
        | { success?: boolean; data?: ApiUser; message?: string }
        | null;

      if (res && res.success && res.data) {
        const u = res.data;
        setFullName(displayNameFromUser(u));
        setEmail(u.email?.trim() ? u.email : nextEmail);
        setRole(u.role?.trim() ? u.role : role);
        setStatus(u.status?.trim() ? u.status : status);
        syncLocalProfile(u);
        setIsEditing(false);
        setSaveMessage("Profile updated.");
      } else {
        setSaveError(res?.message ?? updateUserError ?? "Update failed");
      }
    } catch {
      setSaveError(updateUserError ?? "Update failed");
    } finally {
      setSaving(false);
    }
  };

  const statusLabel =
    status === "active"
      ? "Active"
      : status === "inactive"
        ? "Inactive"
        : status === "suspended"
          ? "Suspended"
          : status;

  const statusClass =
    status === "active" ? "text-success" : "text-base-content/70";

  if (loading) {
    return (
      <div className="py-6">
        <div className="mx-auto max-w-5xl">
          <div className="flex justify-center py-20">
            <span className="loading loading-spinner loading-lg text-primary" />
          </div>
        </div>
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="py-6">
        <div className="mx-auto max-w-5xl rounded-2xl bg-base-200 p-6 shadow-sm">
          <p className="text-base-content/80">
            Sign in to view your profile.
          </p>
        </div>
      </div>
    );
  }

  if (fetchError && !fullName && !email) {
    return (
      <div className="py-6">
        <div className="mx-auto max-w-5xl rounded-2xl bg-base-200 p-6 shadow-sm">
          <p className="font-medium text-error">{fetchError}</p>
          <button type="button" className="btn btn-primary mt-4" onClick={() => void loadProfile()}>
            Retry
          </button>
        </div>
      </div>
    );
  }

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

        <section>
          <div className="rounded-2xl bg-base-200 p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Profile information</h2>
            {saveMessage ? (
              <p className="mt-3 text-sm font-medium text-success">{saveMessage}</p>
            ) : null}
            {fetchError ? (
              <p className="mt-3 text-sm text-warning">{fetchError}</p>
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
                <span className={`font-medium capitalize ${statusClass}`}>
                  {statusLabel}
                </span>
              </div>
            </div>

            {isEditing ? (
              <div className="mt-6 space-y-3 rounded-xl bg-base-100 p-4">
                <h3 className="text-sm font-semibold">Edit admin profile</h3>
                {saveError ? (
                  <p className="text-sm text-error">{saveError}</p>
                ) : null}
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
                    disabled={saving}
                    onClick={() => void handleSaveProfile()}
                  >
                    {saving ? (
                      <span className="loading loading-spinner loading-sm" />
                    ) : (
                      "Save"
                    )}
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    disabled={saving}
                    onClick={handleCancelEdit}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : null}

            <div className="mt-6 rounded-xl bg-base-100 p-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold">Change password</h3>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setShowPasswordForm((prev) => !prev)}
                >
                  {showPasswordForm ? "Hide" : "Show"}
                </button>
              </div>
              {passwordMessage ? (
                <p className="mt-2 text-sm text-success">{passwordMessage}</p>
              ) : null}
              {showPasswordForm ? (
                <div className="mt-3 space-y-3">
                  {passwordError ? (
                    <p className="text-sm text-error">{passwordError}</p>
                  ) : null}
                  <label className="form-control w-full">
                    <span className="label-text text-sm text-base-content/70">
                      Current password
                    </span>
                    <div className="relative">
                      <input
                        type={showCurrentPassword ? "text" : "password"}
                        className="input input-bordered w-full pr-12"
                        value={oldPassword}
                        onChange={(event) => setOldPassword(event.target.value)}
                      />
                      <button
                        type="button"
                        className="btn btn-ghost btn-xs absolute right-2 top-1/2 -translate-y-1/2"
                        onClick={() => setShowCurrentPassword((prev) => !prev)}
                        aria-label={
                          showCurrentPassword
                            ? "Hide current password"
                            : "Show current password"
                        }
                      >
                        {showCurrentPassword ? (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            className="h-4 w-4"
                          >
                            <path d="M3 3l18 18" />
                            <path d="M10.6 10.6a2 2 0 102.8 2.8" />
                            <path d="M9.9 5.2A9.8 9.8 0 0112 5c5 0 9.3 3.1 11 7-1 2.3-2.6 4.2-4.6 5.4" />
                            <path d="M6.2 6.2C3.9 7.5 2 9.5 1 12c1.7 3.9 6 7 11 7 1.5 0 3-.3 4.3-.8" />
                          </svg>
                        ) : (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            className="h-4 w-4"
                          >
                            <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </label>
                  <label className="form-control w-full">
                    <span className="label-text text-sm text-base-content/70">
                      New password
                    </span>
                    <div className="relative">
                      <input
                        type={showNewPassword ? "text" : "password"}
                        className="input input-bordered w-full pr-12"
                        value={newPassword}
                        onChange={(event) => setNewPassword(event.target.value)}
                      />
                      <button
                        type="button"
                        className="btn btn-ghost btn-xs absolute right-2 top-1/2 -translate-y-1/2"
                        onClick={() => setShowNewPassword((prev) => !prev)}
                        aria-label={
                          showNewPassword ? "Hide new password" : "Show new password"
                        }
                      >
                        {showNewPassword ? (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            className="h-4 w-4"
                          >
                            <path d="M3 3l18 18" />
                            <path d="M10.6 10.6a2 2 0 102.8 2.8" />
                            <path d="M9.9 5.2A9.8 9.8 0 0112 5c5 0 9.3 3.1 11 7-1 2.3-2.6 4.2-4.6 5.4" />
                            <path d="M6.2 6.2C3.9 7.5 2 9.5 1 12c1.7 3.9 6 7 11 7 1.5 0 3-.3 4.3-.8" />
                          </svg>
                        ) : (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            className="h-4 w-4"
                          >
                            <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </label>
                  <label className="form-control w-full">
                    <span className="label-text text-sm text-base-content/70">
                      Confirm new password
                    </span>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        className="input input-bordered w-full pr-12"
                        value={confirmPassword}
                        onChange={(event) => setConfirmPassword(event.target.value)}
                      />
                      <button
                        type="button"
                        className="btn btn-ghost btn-xs absolute right-2 top-1/2 -translate-y-1/2"
                        onClick={() => setShowConfirmPassword((prev) => !prev)}
                        aria-label={
                          showConfirmPassword
                            ? "Hide confirm password"
                            : "Show confirm password"
                        }
                      >
                        {showConfirmPassword ? (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            className="h-4 w-4"
                          >
                            <path d="M3 3l18 18" />
                            <path d="M10.6 10.6a2 2 0 102.8 2.8" />
                            <path d="M9.9 5.2A9.8 9.8 0 0112 5c5 0 9.3 3.1 11 7-1 2.3-2.6 4.2-4.6 5.4" />
                            <path d="M6.2 6.2C3.9 7.5 2 9.5 1 12c1.7 3.9 6 7 11 7 1.5 0 3-.3 4.3-.8" />
                          </svg>
                        ) : (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            className="h-4 w-4"
                          >
                            <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </label>
                  <div className="flex pt-2">
                    <button
                      type="button"
                      className="btn btn-primary"
                      disabled={changingPassword}
                      onClick={() => void handleChangePassword()}
                    >
                      {changingPassword ? (
                        <span className="loading loading-spinner loading-sm" />
                      ) : (
                        "Update password"
                      )}
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
