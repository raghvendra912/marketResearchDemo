import { NextRequest, NextResponse } from "next/server";
import { getSessionFromCookieValue, SESSION_COOKIE } from "@/lib/auth";
import { listLocalFeedback, setFeedbackAgentRunStatus } from "@/lib/local-db";
import { runExternalAgent } from "@/lib/agent-automation";

type Context = {
  params: Promise<{ id: string }>;
};

export async function POST(request: NextRequest, context: Context) {
  const session = getSessionFromCookieValue(request.cookies.get(SESSION_COOKIE)?.value);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.role !== "admin") {
    return NextResponse.json({ error: "Only admin can execute agent runs." }, { status: 403 });
  }

  const { id } = await context.params;
  const feedbackList = await listLocalFeedback();
  const item = feedbackList.find((entry) => entry.id === id);

  if (!item) {
    return NextResponse.json({ error: "Feedback not found." }, { status: 404 });
  }

  if (!item.agent_approved) {
    return NextResponse.json({ error: "Approve this request before running agent." }, { status: 400 });
  }

  await setFeedbackAgentRunStatus({ id, status: "running", log: "Automation started by admin." });

  const result = await runExternalAgent({
    feedbackId: item.id,
    page: item.page,
    featureTitle: item.feature_title,
    currentBehavior: item.current_behavior,
    expectedBehavior: item.expected_behavior,
    impact: item.impact,
    approvalComment: item.agent_approval_comment,
    requestedBy: item.created_by_name,
    approvedBy: session.name,
  });

  await setFeedbackAgentRunStatus({
    id,
    status: result.ok ? "done" : "failed",
    log: result.message,
  });

  return NextResponse.json({ success: result.ok, message: result.message });
}
