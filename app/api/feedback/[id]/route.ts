import { NextRequest, NextResponse } from "next/server";
import { getSessionFromCookieValue, SESSION_COOKIE } from "@/lib/auth";
import { updateLocalFeedback } from "@/lib/local-db";
import { sanitizeText } from "@/lib/sanitize";

type Context = {
  params: Promise<{ id: string }>;
};

type Payload = {
  status?: "open" | "planned" | "in_progress" | "done";
  developerNote?: string;
};

const allowedStatuses = new Set(["open", "planned", "in_progress", "done"]);

export async function PATCH(request: NextRequest, context: Context) {
  const session = getSessionFromCookieValue(request.cookies.get(SESSION_COOKIE)?.value);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.role !== "admin" && session.role !== "pm") {
    return NextResponse.json({ error: "Only Admin/PM can update feedback status." }, { status: 403 });
  }

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "Feedback id is required." }, { status: 400 });
  }

  let payload: Payload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  const nextStatus = payload.status;
  if (nextStatus && !allowedStatuses.has(nextStatus)) {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }

  const updated = await updateLocalFeedback({
    id,
    status: nextStatus,
    developerNote: typeof payload.developerNote === "string" ? sanitizeText(payload.developerNote, 2000) : undefined,
    updatedByName: session.name,
  });

  if (!updated) {
    return NextResponse.json({ error: "Feedback not found." }, { status: 404 });
  }

  return NextResponse.json({ success: true, item: updated });
}
