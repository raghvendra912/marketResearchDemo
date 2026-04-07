import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionFromCookieValue, SESSION_COOKIE, type SessionUser } from "@/lib/auth";

export async function requireSession(): Promise<SessionUser> {
  const cookieStore = await cookies();
  const session = getSessionFromCookieValue(cookieStore.get(SESSION_COOKIE)?.value);
  if (!session) {
    redirect("/login");
  }
  return session;
}
