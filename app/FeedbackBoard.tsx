"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { SessionUser } from "@/lib/auth";

type FeedbackItem = {
  id: string;
  page: string;
  feature_title: string;
  current_behavior: string;
  expected_behavior: string;
  impact: string;
  status: "open" | "planned" | "in_progress" | "done";
  created_by_name: string;
  created_by_email: string;
  created_by_role: string;
  developer_note: string | null;
  updated_by_name: string | null;
  created_at: string;
  updated_at: string;
  agent_requested: boolean;
  agent_request_note: string | null;
  agent_approved: boolean;
  agent_approval_comment: string | null;
  agent_approved_by_name: string | null;
  agent_run_status: "idle" | "queued" | "running" | "done" | "failed";
  agent_run_log: string | null;
};

const statuses: Array<FeedbackItem["status"]> = ["open", "planned", "in_progress", "done"];

export default function FeedbackBoard({ currentUser, currentPage }: { currentUser: SessionUser; currentPage: string }) {
  const canModerate = currentUser.role === "admin" || currentUser.role === "pm";

  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [page, setPage] = useState(currentPage);
  const [featureTitle, setFeatureTitle] = useState("");
  const [currentBehavior, setCurrentBehavior] = useState("");
  const [expectedBehavior, setExpectedBehavior] = useState("");
  const [impact, setImpact] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [agentNoteById, setAgentNoteById] = useState<Record<string, string>>({});
  const [approvalById, setApprovalById] = useState<Record<string, string>>({});

  async function loadFeedback() {
    setLoading(true);
    try {
      const res = await fetch("/api/feedback", { cache: "no-store" });
      const body = await res.json().catch(() => ({}));
      if (res.ok) {
        setItems(body.feedback ?? []);
      } else if (body?.error) {
        setError(String(body.error));
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadFeedback();
  }, []);

  async function submitFeedback(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const res = await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ page, featureTitle, currentBehavior, expectedBehavior, impact }),
    });
    try {
      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(body?.error ?? "Failed to submit feedback.");
        return;
      }

      if (body?.item) {
        setItems((prev) => [body.item as FeedbackItem, ...prev]);
      }

      setFeatureTitle("");
      setCurrentBehavior("");
      setExpectedBehavior("");
      setImpact("");
      setSuccess("Feedback submitted and shared with the team.");
    } catch {
      setError("Failed to submit feedback.");
    }
  }

  async function updateFeedback(id: string, nextStatus: FeedbackItem["status"], developerNote: string) {
    const res = await fetch(`/api/feedback/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus, developerNote }),
    });

    if (res.ok) {
      await loadFeedback();
    }
  }

  async function requestAgentChange(id: string) {
    await fetch(`/api/feedback/${id}/request-agent`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestNote: agentNoteById[id] ?? "" }),
    });
    await loadFeedback();
  }

  async function approveAgentChange(id: string) {
    await fetch(`/api/feedback/${id}/approve-agent`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ approvalComment: approvalById[id] ?? "" }),
    });
    await loadFeedback();
  }

  async function runAgentNow(id: string) {
    await fetch(`/api/feedback/${id}/run-agent`, { method: "POST" });
    await loadFeedback();
  }

  return (
    <section className="mt-4 grid gap-4 lg:grid-cols-2">
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold">Feature Feedback</h2>
        <p className="mt-1 text-xs text-slate-500">Describe how this feature should work. Everyone can view this board.</p>

        <form onSubmit={submitFeedback} className="mt-3 grid gap-3">
          <input
            value={page}
            onChange={(e) => setPage(e.target.value)}
            placeholder="Page (example: project-details)"
            className="rounded border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            value={featureTitle}
            onChange={(e) => setFeatureTitle(e.target.value)}
            placeholder="Feature title"
            className="rounded border border-slate-300 px-3 py-2 text-sm"
          />
          <textarea
            value={currentBehavior}
            onChange={(e) => setCurrentBehavior(e.target.value)}
            rows={3}
            placeholder="Current behavior"
            className="rounded border border-slate-300 px-3 py-2 text-sm"
          />
          <textarea
            value={expectedBehavior}
            onChange={(e) => setExpectedBehavior(e.target.value)}
            rows={3}
            placeholder="Expected behavior"
            className="rounded border border-slate-300 px-3 py-2 text-sm"
          />
          <textarea
            value={impact}
            onChange={(e) => setImpact(e.target.value)}
            rows={2}
            placeholder="Business impact (optional)"
            className="rounded border border-slate-300 px-3 py-2 text-sm"
          />
          <button className="w-fit rounded bg-blue-700 px-4 py-2 text-sm font-semibold text-white" type="submit">
            Submit Feedback
          </button>
        </form>

        {error ? <p className="mt-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
        {success ? <p className="mt-3 rounded bg-green-50 px-3 py-2 text-sm text-green-700">{success}</p> : null}
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold">Shared Feedback Queue</h2>
        {loading ? <p className="mt-3 text-sm text-slate-600">Loading feedback...</p> : null}
        {!loading && items.length === 0 ? <p className="mt-3 text-sm text-slate-600">No feedback yet.</p> : null}

        <div className="mt-3 max-h-[520px] space-y-3 overflow-auto pr-1">
          {items.map((item) => (
            <article key={item.id} className="rounded border border-slate-200 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">{item.page}</span>
                <span className="rounded bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-700">{item.status}</span>
                <span className="ml-auto text-xs text-slate-500">{new Date(item.created_at).toLocaleString()}</span>
              </div>

              <p className="mt-2 text-sm font-semibold text-slate-900">{item.feature_title}</p>
              <p className="mt-1 text-xs text-slate-600"><span className="font-semibold">Current:</span> {item.current_behavior}</p>
              <p className="mt-1 text-xs text-slate-600"><span className="font-semibold">Expected:</span> {item.expected_behavior}</p>
              {item.impact ? <p className="mt-1 text-xs text-slate-600"><span className="font-semibold">Impact:</span> {item.impact}</p> : null}
              <p className="mt-1 text-xs text-slate-500">
                By {item.created_by_name} ({item.created_by_role})
              </p>
              <p className="mt-1 text-xs text-slate-500">Email: {item.created_by_email}</p>
              <p className="mt-1 text-xs text-slate-500">
                Agent: {item.agent_run_status}
                {item.agent_run_log ? ` | ${item.agent_run_log}` : ""}
              </p>

              {!item.agent_requested ? (
                <div className="mt-2 rounded border border-slate-200 bg-slate-50 p-2">
                  <textarea
                    rows={2}
                    value={agentNoteById[item.id] ?? ""}
                    onChange={(e) => setAgentNoteById((prev) => ({ ...prev, [item.id]: e.target.value }))}
                    className="w-full rounded border border-slate-300 px-2 py-1 text-xs"
                    placeholder="Request note for agent (optional)"
                  />
                  <button
                    className="mt-2 rounded bg-blue-700 px-2 py-1 text-xs font-semibold text-white"
                    onClick={() => void requestAgentChange(item.id)}
                  >
                    Request Agent Change
                  </button>
                </div>
              ) : (
                <p className="mt-2 text-xs text-blue-700">
                  Agent request submitted{item.agent_request_note ? `: ${item.agent_request_note}` : "."}
                </p>
              )}

              {canModerate ? (
                <div className="mt-3 grid gap-2 rounded border border-slate-200 bg-slate-50 p-2">
                  <select
                    className="rounded border border-slate-300 px-2 py-1 text-xs"
                    defaultValue={item.status}
                    onChange={(e) => {
                      void updateFeedback(item.id, e.target.value as FeedbackItem["status"], item.developer_note ?? "");
                    }}
                  >
                    {statuses.map((status) => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                  <textarea
                    defaultValue={item.developer_note ?? ""}
                    rows={2}
                    className="rounded border border-slate-300 px-2 py-1 text-xs"
                    placeholder="Developer note / implementation plan"
                    onBlur={(e) => {
                      void updateFeedback(item.id, item.status, e.target.value);
                    }}
                  />

                  {!item.agent_approved ? (
                    <>
                      <textarea
                        value={approvalById[item.id] ?? ""}
                        onChange={(e) => setApprovalById((prev) => ({ ...prev, [item.id]: e.target.value }))}
                        rows={2}
                        className="rounded border border-slate-300 px-2 py-1 text-xs"
                        placeholder="Admin approval comment for agent"
                      />
                      <button
                        onClick={() => void approveAgentChange(item.id)}
                        className="w-fit rounded bg-emerald-700 px-2 py-1 text-xs font-semibold text-white"
                      >
                        Approve Agent Run
                      </button>
                    </>
                  ) : (
                    <p className="text-xs text-emerald-700">
                      Approved by {item.agent_approved_by_name}
                      {item.agent_approval_comment ? `: ${item.agent_approval_comment}` : ""}
                    </p>
                  )}

                  {item.agent_approved ? (
                    <button
                      onClick={() => void runAgentNow(item.id)}
                      className="w-fit rounded bg-violet-700 px-2 py-1 text-xs font-semibold text-white"
                    >
                      Run Agent Now
                    </button>
                  ) : null}
                </div>
              ) : item.developer_note ? (
                <p className="mt-2 rounded bg-slate-50 px-2 py-1 text-xs text-slate-700">
                  <span className="font-semibold">Developer note:</span> {item.developer_note}
                </p>
              ) : null}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
