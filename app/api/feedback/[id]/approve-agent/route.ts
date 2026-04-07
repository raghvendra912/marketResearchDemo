import { NextRequest, NextResponse } from "next/server";
import { getSessionFromCookieValue, SESSION_COOKIE } from "@/lib/auth";
import { approveFeedbackAgent } from "@/lib/local-db";
import { sanitizeText } from "@/lib/sanitize";

type Context = {
  params: Promise<{ id: string }>;
};

type Payload = { approvalComment?: string };

export async function POST(request: NextRequest, context: Context) {
  const session = getSessionFromCookieValue(request.cookies.get(SESSION_COOKIE)?.value);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.role !== "admin") {
    return NextResponse.json({ error: "Only admin can approve agent runs." }, { status: 403 });
  }

  const { id } = await context.params;
  let payload: Payload = {};
  try {
    payload = await request.json();
  } catch {
    payload = {};
  }

  const item = await approveFeedbackAgent({
    id,
    approvalComment: sanitizeText(String(payload.approvalComment ?? ""), 1500) || null,
    approvedByName: session.name,
  });

  if (!item) {
    return NextResponse.json({ error: "Feedback not found." }, { status: 404 });
  }

  return NextResponse.json({ success: true, item });
}
