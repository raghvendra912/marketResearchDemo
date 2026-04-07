import { NextRequest, NextResponse } from "next/server";

type DispatchPayload = {
  event?: string;
  feedback?: {
    feedbackId: string;
    page: string;
    featureTitle: string;
    currentBehavior: string;
    expectedBehavior: string;
    impact: string;
    approvalComment: string | null;
    requestedBy: string;
    approvedBy: string;
  };
};

export async function POST(request: NextRequest) {
  const bearerToken = process.env.AGENT_AUTOMATION_BEARER_TOKEN;
  const githubToken = process.env.GITHUB_DISPATCH_TOKEN;
  const githubOwner = process.env.GITHUB_OWNER;
  const githubRepo = process.env.GITHUB_REPO;

  if (!bearerToken || !githubToken || !githubOwner || !githubRepo) {
    return NextResponse.json(
      {
        error:
          "Missing one or more env vars: AGENT_AUTOMATION_BEARER_TOKEN, GITHUB_DISPATCH_TOKEN, GITHUB_OWNER, GITHUB_REPO",
      },
      { status: 500 },
    );
  }

  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${bearerToken}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: DispatchPayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  if (!payload.feedback?.feedbackId || !payload.feedback.expectedBehavior) {
    return NextResponse.json({ error: "Missing feedback payload." }, { status: 400 });
  }

  const response = await fetch(
    `https://api.github.com/repos/${githubOwner}/${githubRepo}/dispatches`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${githubToken}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: JSON.stringify({
        event_type: "feedback-approved",
        client_payload: {
          source: "market-research-local",
          feedback: payload.feedback,
          requested_at: new Date().toISOString(),
        },
      }),
    },
  );

  if (!response.ok) {
    const body = await response.text();
    return NextResponse.json(
      { error: `GitHub dispatch failed (${response.status})`, details: body },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true, message: "GitHub automation workflow dispatched." });
}
