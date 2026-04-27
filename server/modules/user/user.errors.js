/**
 * Maps MongoDB write errors (e.g. duplicate unique index) to safe user-facing text.
 */
export function friendlyUserWriteError(error) {
  const raw =
    typeof error?.message === "string" ? error.message.trim() : "";
  const code = error?.code;
  const isDup =
    code === 11000 ||
    code === "11000" ||
    /E11000 duplicate key/i.test(raw);

  if (!isDup) {
    return raw || "Something went wrong.";
  }

  const keyPattern = error?.keyPattern;
  const keys =
    keyPattern && typeof keyPattern === "object"
      ? Object.keys(keyPattern)
      : [];

  if (
    keys.includes("email") ||
    /index:\s*email_|dup key:\s*\{\s*email:/i.test(raw)
  ) {
    return "This email address is already registered.";
  }

  return "That value is already in use. Please choose another.";
}
