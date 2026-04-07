type RunAgentInput = {
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

export async function runExternalAgent(input: RunAgentInput): Promise<{ ok: boolean; message: string }> {
  const webhookUrl = process.env.AGENT_AUTOMATION_WEBHOOK_URL;
  const webhookToken = process.env.AGENT_AUTOMATION_BEARER_TOKEN;

  if (!webhookUrl) {
    return {
      ok: false,
      message:
        "No AGENT_AUTOMATION_WEBHOOK_URL configured. Add webhook to trigger real automated code changes.",
    };
  }

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(webhookToken ? { Authorization: `Bearer ${webhookToken}` } : {}),
      },
      body: JSON.stringify({
        event: "feedback-approved",
        feedback: input,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      return { ok: false, message: `Agent webhook failed (${res.status}): ${body}` };
    }

    const deployHook = process.env.VERCEL_DEPLOY_HOOK_URL;
    if (deployHook) {
      await fetch(deployHook, { method: "POST" });
    }

    return { ok: true, message: "Agent webhook executed. Deploy hook triggered (if configured)." };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Unknown automation error." };
  }
}
