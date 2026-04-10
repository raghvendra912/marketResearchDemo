import { NextRequest, NextResponse } from "next/server";
import { getSessionFromCookieValue, SESSION_COOKIE } from "@/lib/auth";
import { createLocalFeedback, listLocalFeedback } from "@/lib/local-db";
import { sanitizeText } from "@/lib/sanitize";

type Payload = {
  page?: string;
  featurePosition?: string;
  featureTitle?: string;
  currentBehavior?: string;
  expectedBehavior?: string;
  impact?: string;
  comment?: string;
};

export async function GET(request: NextRequest) {
  const session = getSessionFromCookieValue(request.cookies.get(SESSION_COOKIE)?.value);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const feedback = await listLocalFeedback();
    return NextResponse.json({ feedback });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load feedback.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = getSessionFromCookieValue(request.cookies.get(SESSION_COOKIE)?.value);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: Payload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  const page = sanitizeText(String(payload.page ?? ""), 120);
  const featurePosition = sanitizeText(String(payload.featurePosition ?? ""), 160) || null;
  const comment = sanitizeText(String(payload.comment ?? ""), 2000);
  const featureTitle = sanitizeText(String(payload.featureTitle ?? ""), 180) || "General Feedback";
  const currentBehavior = sanitizeText(String(payload.currentBehavior ?? ""), 2000) || comment;
  const expectedBehavior = sanitizeText(String(payload.expectedBehavior ?? ""), 2000) || comment;
  const impact = sanitizeText(String(payload.impact ?? ""), 1200);

  if (!page || !currentBehavior || !expectedBehavior) {
    return NextResponse.json(
      { error: "page and a comment are required." },
      { status: 400 },
    );
  }

  try {
    const created = await createLocalFeedback({
      page,
      featurePosition,
      featureTitle,
      currentBehavior,
      expectedBehavior,
      impact,
      createdByName: session.name,
      createdByEmail: session.email,
      createdByRole: session.role,
    });

    return NextResponse.json({ success: true, item: created }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create feedback.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
