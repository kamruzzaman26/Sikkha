// A browser can hold an old sign-in cookie whose refresh token no longer
// exists (signed out elsewhere, user deleted, project reset). Supabase then
// answers with an AuthApiError. That means "nobody is signed in", not a
// server failure, so callers should treat it like a missing session.
const staleSessionCodes = new Set([
  "refresh_token_not_found",
  "refresh_token_already_used",
  "session_not_found",
  "session_expired",
  "user_not_found",
  "bad_jwt",
]);

export function isNoActiveSessionError(
  error: { name?: string; code?: string; message?: string } | null | undefined,
): boolean {
  if (!error) {
    return false;
  }
  if (error.name === "AuthSessionMissingError") {
    return true;
  }
  if (error.code && staleSessionCodes.has(error.code)) {
    return true;
  }
  return /refresh token/i.test(error.message ?? "");
}
