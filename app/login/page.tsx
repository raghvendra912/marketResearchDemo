"use client";

import { useEffect, useState, type FormEvent } from "react";

type DemoUser = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "pm" | "sales";
  password: string;
};

export default function LoginPage() {
  const [email, setEmail] = useState("raghvendra@vaultlocal.com");
  const [password, setPassword] = useState("Admin@123");
  const [name, setName] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [demoUsers, setDemoUsers] = useState<DemoUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    async function loadUsers() {
      try {
        const res = await fetch("/api/auth/users", { cache: "no-store" });
        const body = await res.json();
        if (res.ok) {
          setDemoUsers(body.users ?? []);
        }
      } catch {
        setDemoUsers([]);
      }
    }
    void loadUsers();
  }, []);

  async function onLogin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const body = await res.json();
      if (!res.ok) {
        setError(body?.error ?? "Login failed.");
        return;
      }

      window.location.href = "/";
    } catch {
      setError("Network error. Please retry.");
    } finally {
      setLoading(false);
    }
  }

  async function onSignup(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body?.error ?? "Signup failed.");
        return;
      }

      setNotice("User created. Please sign in.");
      setMode("login");
      setName("");

      const usersRes = await fetch("/api/auth/users", { cache: "no-store" });
      const usersBody = await usersRes.json();
      if (usersRes.ok) {
        setDemoUsers(usersBody.users ?? []);
      }
    } catch {
      setError("Network error. Please retry.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-sky-100 to-cyan-200 px-4">
      <section className="w-full max-w-md rounded-2xl border border-blue-100 bg-white p-8 shadow-xl">
        <div className="mb-6 text-center">
          <p className="text-2xl font-bold text-blue-900">Vault Local</p>
          <p className="mt-1 text-xs text-gray-500">Field Operations Console</p>
        </div>

        <div className="mb-4 flex gap-2">
          <button
            type="button"
            onClick={() => setMode("login")}
            className={`rounded px-3 py-1.5 text-xs font-semibold ${mode === "login" ? "bg-blue-700 text-white" : "bg-blue-50 text-blue-700"}`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => setMode("signup")}
            className={`rounded px-3 py-1.5 text-xs font-semibold ${mode === "signup" ? "bg-blue-700 text-white" : "bg-blue-50 text-blue-700"}`}
          >
            Sign Up
          </button>
        </div>

        <form className="space-y-4" onSubmit={mode === "login" ? onLogin : onSignup}>
          {mode === "login" ? (
            <div className="flex flex-wrap gap-2">
              {demoUsers.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => {
                    setEmail(user.email);
                    setPassword(user.password);
                  }}
                  className="rounded border border-blue-200 bg-blue-50 px-2 py-1 text-xs text-blue-700"
                  title={user.role}
                >
                  {user.name}
                </button>
              ))}
            </div>
          ) : null}

          {mode === "signup" ? (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-700"
              />
            </div>
          ) : null}

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-700"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-700"
            />
          </div>

          {mode === "login" ? (
            <div className="rounded-md border border-gray-200 bg-gray-50 p-3 text-xs text-gray-500">
              reCAPTCHA placeholder for local demo
            </div>
          ) : null}

          {error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
          {notice ? <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">{notice}</p> : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-70"
          >
            {loading ? "Please wait..." : mode === "login" ? "SIGN IN" : "CREATE ACCOUNT"}
          </button>
        </form>

        <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
          Demo users: Raghvendra (admin), Amrit (pm), Anubhav (sales), Demo User (sales)
        </div>
      </section>
    </main>
  );
}
