"use client";

import Link from "next/link";
import { useState } from "react";
import type { SessionUser } from "@/lib/auth";
import type { DashboardPage } from "@/types/navigation";

type Props = {
  currentUser: SessionUser;
  activePage: DashboardPage;
};

function navItemClass(isActive: boolean) {
  return `rounded-full border px-3 py-1.5 text-sm font-semibold transition ${
    isActive
      ? "border-blue-700 bg-white text-blue-900 ring-2 ring-blue-200 shadow-sm"
      : "border-transparent text-slate-700 hover:border-slate-300 hover:bg-slate-100"
  }`;
}

export default function OpsHeader({ currentUser, activePage }: Props) {
  const [loggingOut, setLoggingOut] = useState(false);

  async function onLogout() {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      window.location.href = "/login";
    }
  }

  const projectCenterActive = [
    "project-center",
    "project-details",
    "project-create",
    "project-edit",
    "project-id-locator",
    "dfiq-report",
  ].includes(activePage);

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-[1400px] items-center justify-between px-4 py-3">
        <div className="flex items-center gap-6">
          <div>
            <p className="text-lg font-bold text-blue-900">Vault Local</p>
            <p className="text-[11px] uppercase tracking-wide text-slate-500">Ops Dashboard</p>
          </div>
          <nav className="hidden items-center gap-3 md:flex">
            <Link href="/" className={navItemClass(activePage === "home")}>
              Home
            </Link>

            <div className="group relative">
              <Link href="/project-details" className={navItemClass(projectCenterActive)}>
                Project Center
              </Link>
              <div className="invisible absolute left-0 top-10 z-30 w-52 rounded-md border border-slate-200 bg-white p-1 opacity-0 shadow-lg transition group-hover:visible group-hover:opacity-100">
                <Link href="/project-center/create" className="block rounded px-3 py-2 text-sm text-slate-700 hover:bg-slate-100">
                  Create Project
                </Link>
                <Link href="/project-details" className="block rounded px-3 py-2 text-sm text-slate-700 hover:bg-slate-100">
                  Project Details
                </Link>
                <Link href="/project-center/project-id-locator" className="block rounded px-3 py-2 text-sm text-slate-700 hover:bg-slate-100">
                  Project ID Locator
                </Link>
                <Link href="/project-center/dfiq-report" className="block rounded px-3 py-2 text-sm text-slate-700 hover:bg-slate-100">
                  DFIQ Report
                </Link>
              </div>
            </div>

            {(currentUser.role === "admin" || currentUser.role === "pm") ? (
              <Link href="/supplier-center" className={navItemClass(activePage === "supplier-center")}>
                Supplier Center
              </Link>
            ) : null}

            <Link href="/client" className={navItemClass(activePage === "client")}>
              Client
            </Link>
            <Link href="/flamingo-tool" className={navItemClass(activePage === "flamingo-tool")}>
              Flamingo Tool
            </Link>
            {currentUser.role === "admin" ? (
              <Link href="/settings" className={navItemClass(activePage === "settings")}>
                Setting
              </Link>
            ) : null}
            <Link href="/end-link" className={navItemClass(activePage === "end-link")}>
              End Link
            </Link>
            <Link href="/feedback" className={navItemClass(activePage === "feedback")}>
              Feedback
            </Link>
            <Link href="/developer-setup" className={navItemClass(activePage === "developer-setup")}>
              Developer Setup
            </Link>
            <Link href="/product-docs" className={navItemClass(activePage === "product-docs")}>
              Product Docs
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
            {currentUser.name} ({currentUser.role.toUpperCase()})
          </span>
          <button
            onClick={() => void onLogout()}
            disabled={loggingOut}
            className="rounded bg-blue-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
          >
            {loggingOut ? "Logging out..." : "Logout"}
          </button>
        </div>
      </div>
    </header>
  );
}
