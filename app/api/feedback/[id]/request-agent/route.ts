import { NextRequest, NextResponse } from "next/server";
import { getSessionFromCookieValue, SESSION_COOKIE } from "@/lib/auth";
import { requestFeedbackAgent } from "@/lib/local-db";
import { sanitizeText } from "@/lib/sanitize";

type Context = {
  params: Promise<{ id: string }>;
};

type Payload = { requestNote?: string };

export async function POST(request: NextRequest, context: Context) {
  const session = getSessionFromCookieValue(request.cookies.get(SESSION_COOKIE)?.value);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  let payload: Payload = {};
  try {
    payload = await request.json();
  } catch {
    payload = {};
  }

  const item = await requestFeedbackAgent({
    id,
    requestNote: sanitizeText(String(payload.requestNote ?? ""), 1200) || null,
  });

  if (!item) {
    return NextResponse.json({ error: "Feedback not found." }, { status: 404 });
  }

  return NextResponse.json({ success: true, item });
}
