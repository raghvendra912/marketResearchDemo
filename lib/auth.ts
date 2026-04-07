export const SESSION_COOKIE = "ops_session";
export type UserRole = "admin" | "pm" | "sales";

export type SessionUser = {
  email: string;
  name: string;
  role: UserRole;
};

export function encodeSession(user: SessionUser): string {
  const payload = JSON.stringify(user);
  return Buffer.from(payload, "utf8").toString("base64url");
}

export function getSessionFromCookieValue(cookieValue: string | undefined): SessionUser | null {
  if (!cookieValue) {
    return null;
  }
  try {
    const decoded = Buffer.from(cookieValue, "base64url").toString("utf8");
    const parsed = JSON.parse(decoded) as SessionUser;
    if (!parsed?.email || !parsed?.name || !parsed?.role) {
      return null;
    }
    if (!["admin", "pm", "sales"].includes(parsed.role)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}
