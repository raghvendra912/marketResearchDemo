"use client";

import { useEffect, useState, type FormEvent } from "react";
import { usePathname } from "next/navigation";

type FeedbackItem = {
  id: string;
  page: string;
  feature_title: string;
  current_behavior: string;
  status: "open" | "planned" | "in_progress" | "done";
  created_by_name: string;
  created_at: string;
};

export default function FeedbackWidget() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [comment, setComment] = useState("");
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [hidden, setHidden] = useState(false);

  async function loadFeedback() {
    setLoading(true);
    try {
      const res = await fetch("/api/feedback", { cache: "no-store" });
      if (res.status === 401) {
        setHidden(true);
        return;
      }
      const body = await res.json().catch(() => ({}));
      if (res.ok) {
        setItems((body.feedback ?? []).slice(0, 8));
      } else if (body?.error) {
        setError(String(body.error));
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    void loadFeedback();
  }, [isOpen]);

  if (hidden || pathname === "/login") {
    return null;
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setNotice(null);

    const trimmed = comment.trim();
    if (!trimmed) {
      setError("Enter a comment first.");
      return;
    }

    const res = await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        page: pathname || "/",
        comment: trimmed,
      }),
    });
    try {
      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(body?.error ?? "Could not submit feedback.");
        return;
      }

      if (body?.item) {
        setItems((prev) => [body.item as FeedbackItem, ...prev].slice(0, 8));
      }
      setComment("");
      setNotice("Feedback shared.");
    } catch {
      setError("Could not submit feedback.");
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {isOpen ? (
        <section className="w-[360px] rounded-xl border border-slate-200 bg-white shadow-xl">
          <header className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
            <p className="text-sm font-semibold text-slate-900">Feedback Chat</p>
            <button
              onClick={() => setIsOpen(false)}
              className="rounded px-2 py-1 text-xs font-semibold text-slate-600"
            >
              Close
            </button>
          </header>

          <form onSubmit={onSubmit} className="border-b border-slate-100 p-3">
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              placeholder="Describe how this feature should work..."
              className="w-full rounded border border-slate-300 px-2 py-2 text-sm outline-none focus:border-blue-700"
            />
            <div className="mt-2 flex items-center justify-between">
              <p className="text-[11px] text-slate-500">Page: {pathname}</p>
              <button className="rounded bg-blue-700 px-3 py-1.5 text-xs font-semibold text-white" type="submit">
                Send
              </button>
            </div>
            {error ? <p className="mt-2 text-xs text-red-700">{error}</p> : null}
            {notice ? <p className="mt-2 text-xs text-green-700">{notice}</p> : null}
          </form>

          <div className="max-h-72 space-y-2 overflow-auto p-3">
            {loading ? <p className="text-xs text-slate-500">Loading comments...</p> : null}
            {!loading && items.length === 0 ? <p className="text-xs text-slate-500">No comments yet.</p> : null}
            {items.map((item) => (
              <article key={item.id} className="rounded border border-slate-200 p-2">
                <p className="text-[11px] text-slate-500">
                  {item.created_by_name} on {item.page}
                </p>
                <p className="mt-1 text-xs text-slate-800">{item.current_behavior}</p>
                <p className="mt-1 text-[11px] text-slate-500">{new Date(item.created_at).toLocaleString()}</p>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <button
        onClick={() => setIsOpen(true)}
        className="ml-auto rounded-full bg-blue-700 px-4 py-3 text-sm font-semibold text-white shadow-lg"
      >
        Feedback
      </button>
    </div>
  );
}
