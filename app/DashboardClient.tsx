"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import type { ProjectItem, ProjectPlatform } from "@/types/project";
import type { QuestionType } from "@/types/survey";
import type { SessionUser } from "@/lib/auth";
import FeedbackBoard from "./FeedbackBoard";

type CreateProjectResponse = {
  success: boolean;
  alternateLink: string;
};

type SurveyItem = {
  id: string;
  title: string;
  created_at: string;
};

type SurveyDraftQuestion = {
  text: string;
  type: QuestionType;
  isRequired: boolean;
  options: string[] | null;
};

type ViewMode = "project_center" | "create_project";
type DashboardPage =
  | "home"
  | "project-center"
  | "project-details"
  | "supplier-center"
  | "client"
  | "flamingo-tool"
  | "settings"
  | "end-link"
  | "feedback";

const platformOptions: { label: string; value: ProjectPlatform }[] = [
  { label: "Cint", value: "cint" },
  { label: "Prime Sample", value: "prime_sample" },
  { label: "Other", value: "other" },
];

const defaultSurveyTemplate = [
  "What is your age? | number | true",
  "What is your gender? | multiple-choice | true | Male,Female,Non-binary,Prefer not to say",
  "Which city do you live in? | text | true",
  "Any additional feedback? | textarea | false",
].join("\n");

function toDisplayPlatform(platform: ProjectPlatform) {
  if (platform === "prime_sample") {
    return "Prime Sample";
  }
  if (platform === "cint") {
    return "Cint";
  }
  return "Other";
}

function parseQuestions(questionTemplate: string): { questions?: SurveyDraftQuestion[]; error?: string } {
  const lines = questionTemplate
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return { error: "Add at least one question line." };
  }

  const questions: SurveyDraftQuestion[] = [];

  for (const line of lines) {
    const parts = line.split("|").map((part) => part.trim());
    const text = parts[0] ?? "";
    const type = (parts[1] ?? "text") as QuestionType;
    const isRequired = (parts[2] ?? "true").toLowerCase() !== "false";

    if (!text) {
      return { error: `Invalid line: ${line}` };
    }

    if (![
      "text",
      "textarea",
      "multiple-choice",
      "number",
    ].includes(type)) {
      return { error: `Unsupported type in line: ${line}` };
    }

    const optionsRaw = parts[3] ?? "";
    const options =
      type === "multiple-choice"
        ? optionsRaw
            .split(",")
            .map((option) => option.trim())
            .filter(Boolean)
        : null;

    if (type === "multiple-choice" && (!options || options.length < 2)) {
      return { error: `Multiple-choice needs 2+ options: ${line}` };
    }

    questions.push({ text, type, isRequired, options });
  }

  return { questions };
}

export default function DashboardClient({
  currentUser,
  activePage,
}: {
  currentUser: SessionUser;
  activePage: DashboardPage;
}) {
  const [viewMode, setViewMode] = useState<ViewMode>("project_center");
  const canCreate = currentUser.role === "admin" || currentUser.role === "pm";
  const [filterClient, setFilterClient] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterProjectId, setFilterProjectId] = useState("");
  const [filterSearch, setFilterSearch] = useState("");
  const [filterProjectManager, setFilterProjectManager] = useState("");
  const [filterSalesPerson, setFilterSalesPerson] = useState("");

  const [name, setName] = useState("");
  const [surveyInput, setSurveyInput] = useState("");
  const [platform, setPlatform] = useState<ProjectPlatform>("cint");
  const [sourceUrl, setSourceUrl] = useState("");

  const [surveyTitle, setSurveyTitle] = useState("New GenPop Survey");
  const [questionTemplate, setQuestionTemplate] = useState(defaultSurveyTemplate);

  const [isCreatingSurvey, setIsCreatingSurvey] = useState(false);
  const [surveyError, setSurveyError] = useState<string | null>(null);
  const [createdSurveyUrl, setCreatedSurveyUrl] = useState<string | null>(null);

  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createdLink, setCreatedLink] = useState<string | null>(null);

  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [surveys, setSurveys] = useState<SurveyItem[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [isLoadingSurveys, setIsLoadingSurveys] = useState(true);
  const [origin, setOrigin] = useState("");

  const totalLinks = useMemo(
    () => projects.reduce((sum, project) => sum + (project.project_links?.length ?? 0), 0),
    [projects],
  );
  const showProjectDashboard =
    activePage === "home" || activePage === "project-center" || activePage === "project-details";

  const projectTableRows = useMemo(() => {
    return projects.map((project, index) => ({
      ...project,
      code: `QLB-${String(index + 1).padStart(4, "0")}${new Date(project.created_at).getFullYear()}`,
      cc: ["IPS", "AZK", "PDS"][index % 3],
      ccPo: `25-03494${index + 1}-01-06`,
      st: 20 + index * 3,
      rc: 15 + index * 4,
      l24: index * 2,
      co: `${Math.max(0, index * 2)}/999`,
      te: 10 + index,
      oq: 1 + index,
      qt: 15 + index * 4,
      ab: 9 + index,
      ir: 45 + index * 4,
      coRate: 10 + index * 3,
      cpi: 7 + index,
      statusLabel: project.status === "published" ? "Live" : "Pending",
      pm: ["AR", "AY", "AM/HP"][index % 3],
      sales: ["Krista", "Scott", "Maya"][index % 3],
      supplier: toDisplayPlatform(project.platform),
      luDate: new Date(project.created_at).toLocaleDateString("en-GB"),
      lastComplete: index === 0 ? "8 minutes ago" : `${index + 1} hours ago`,
    }));
  }, [projects]);

  const filteredRows = useMemo(() => {
    return projectTableRows.filter((row) => {
      if (filterClient && row.cc.toLowerCase() !== filterClient.toLowerCase()) {
        return false;
      }
      if (filterStatus && row.statusLabel.toLowerCase() !== filterStatus.toLowerCase()) {
        return false;
      }
      if (filterProjectManager && !row.pm.toLowerCase().includes(filterProjectManager.toLowerCase())) {
        return false;
      }
      if (filterSalesPerson && !row.sales.toLowerCase().includes(filterSalesPerson.toLowerCase())) {
        return false;
      }
      if (filterProjectId && !row.code.toLowerCase().includes(filterProjectId.toLowerCase())) {
        return false;
      }
      if (
        filterSearch &&
        !`${row.name} ${row.ccPo} ${row.code} ${row.sales} ${row.pm}`.toLowerCase().includes(filterSearch.toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [filterClient, filterProjectId, filterProjectManager, filterSalesPerson, filterSearch, filterStatus, projectTableRows]);

  async function loadProjects() {
    setIsLoadingProjects(true);
    try {
      const res = await fetch("/api/projects", { cache: "no-store" });
      const body = await res.json();
      if (res.ok) {
        setProjects(body.projects ?? []);
      }
    } finally {
      setIsLoadingProjects(false);
    }
  }

  async function loadSurveys() {
    setIsLoadingSurveys(true);
    try {
      const res = await fetch("/api/surveys", { cache: "no-store" });
      const body = await res.json();
      if (res.ok) {
        setSurveys(body.surveys ?? []);
      }
    } finally {
      setIsLoadingSurveys(false);
    }
  }

  useEffect(() => {
    setOrigin(window.location.origin);
    void loadProjects();
    void loadSurveys();
  }, []);

  async function onLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  async function onCreateSurvey(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSurveyError(null);
    setCreatedSurveyUrl(null);

    const parsed = parseQuestions(questionTemplate);
    if (parsed.error || !parsed.questions) {
      setSurveyError(parsed.error ?? "Invalid question format.");
      return;
    }

    setIsCreatingSurvey(true);

    try {
      const res = await fetch("/api/surveys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: surveyTitle,
          questions: parsed.questions,
        }),
      });

      const body = (await res.json()) as { error?: string; survey?: SurveyItem };

      if (!res.ok || !body.survey) {
        setSurveyError(body.error ?? "Could not create survey.");
        return;
      }

      const newSurveyUrl = `${window.location.origin}/s/${body.survey.id}`;
      setCreatedSurveyUrl(newSurveyUrl);
      setSurveyInput(newSurveyUrl);
      await loadSurveys();
    } catch {
      setSurveyError("Network error. Please retry.");
    } finally {
      setIsCreatingSurvey(false);
    }
  }

  async function onCreateProject(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCreateError(null);
    setCreatedLink(null);
    setIsCreating(true);

    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          surveyInput,
          platform,
          sourceUrl,
        }),
      });
      const body = (await res.json()) as Partial<CreateProjectResponse> & { error?: string };
      if (!res.ok) {
        setCreateError(body.error ?? "Could not create project.");
        return;
      }

      setCreatedLink(body.alternateLink ?? null);
      setName("");
      setSourceUrl("");
      await loadProjects();
      setViewMode("project_center");
    } catch {
      setCreateError("Network error. Please retry.");
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#eef3f8] text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-4 py-3">
          <div className="flex items-center gap-6">
            <div>
              <p className="text-lg font-bold text-blue-900">Vault Local</p>
              <p className="text-[11px] uppercase tracking-wide text-slate-500">Ops Dashboard</p>
            </div>
            <nav className="hidden gap-4 text-sm font-semibold md:flex">
              <Link
                href="/"
                className={`rounded px-2 py-1 ${activePage === "home" ? "text-blue-900" : "text-slate-700"}`}
              >
                Home
              </Link>
              <Link
                href="/project-center"
                className={`rounded px-2 py-1 ${activePage === "project-center" ? "text-blue-900" : "text-slate-700"}`}
              >
                Project Center
              </Link>
              {(currentUser.role === "admin" || currentUser.role === "pm") ? (
                <Link
                  href="/supplier-center"
                  className={`rounded px-2 py-1 ${activePage === "supplier-center" ? "text-blue-900" : "text-slate-700"}`}
                >
                  Supplier Center
                </Link>
              ) : null}
              <Link
                href="/client"
                className={`rounded px-2 py-1 ${activePage === "client" ? "text-blue-900" : "text-slate-700"}`}
              >
                Client
              </Link>
              <Link
                href="/flamingo-tool"
                className={`rounded px-2 py-1 ${activePage === "flamingo-tool" ? "text-blue-900" : "text-slate-700"}`}
              >
                Flamingo Tool
              </Link>
              {currentUser.role === "admin" ? (
                <Link
                  href="/settings"
                  className={`rounded px-2 py-1 ${activePage === "settings" ? "text-blue-900" : "text-slate-700"}`}
                >
                  Settings
                </Link>
              ) : null}
              <Link
                href="/end-link"
                className={`rounded px-2 py-1 ${activePage === "end-link" ? "text-blue-900" : "text-slate-700"}`}
              >
                End Link
              </Link>
              <Link
                href="/feedback"
                className={`rounded px-2 py-1 ${activePage === "feedback" ? "text-blue-900" : "text-slate-700"}`}
              >
                Feedback
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
              {currentUser.name} ({currentUser.role.toUpperCase()})
            </span>
            <button onClick={onLogout} className="rounded bg-blue-700 px-3 py-2 text-xs font-semibold text-white">
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1400px] px-4 py-5">
        {showProjectDashboard ? (
          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid gap-3 md:grid-cols-6">
            <input className="rounded border border-slate-300 px-3 py-2 text-sm" placeholder="dd-mm-yyyy" />
            <input className="rounded border border-slate-300 px-3 py-2 text-sm" placeholder="dd-mm-yyyy" />
            <select className="rounded border border-slate-300 px-3 py-2 text-sm">
              <option>Search By Create Date</option>
            </select>
            <input
              className="rounded border border-slate-300 px-3 py-2 text-sm"
              placeholder="Project Manager"
              value={filterProjectManager}
              onChange={(e) => setFilterProjectManager(e.target.value)}
            />
            <select
              className="rounded border border-slate-300 px-3 py-2 text-sm"
              value={filterSalesPerson}
              onChange={(e) => setFilterSalesPerson(e.target.value)}
            >
              <option>-Sales Person-</option>
              <option>Krista</option>
              <option>Scott</option>
              <option>Maya</option>
            </select>
            <div className="flex gap-2">
              <button className="rounded bg-blue-800 px-3 py-2 text-sm font-semibold text-white" title="Search">
                🔍
              </button>
              <button
                className="rounded bg-blue-800 px-3 py-2 text-sm font-semibold text-white"
                title="Download"
              >
                ⬇
              </button>
              <button className="rounded bg-blue-800 px-3 py-2 text-sm font-semibold text-white" title="Finance">
                $
              </button>
              <button
                className="rounded bg-blue-800 px-3 py-2 text-sm font-semibold text-white"
                title="Refresh"
                onClick={() => {
                  setFilterClient("");
                  setFilterStatus("");
                  setFilterProjectId("");
                  setFilterSearch("");
                  setFilterProjectManager("");
                  setFilterSalesPerson("");
                }}
              >
                ↻
              </button>
            </div>
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-6">
            <input
              className="rounded border border-slate-300 px-3 py-2 text-sm"
              placeholder="Select Client"
              value={filterClient}
              onChange={(e) => setFilterClient(e.target.value)}
            />
            <input
              className="rounded border border-slate-300 px-3 py-2 text-sm"
              placeholder="Project Status"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            />
            <input
              className="rounded border border-slate-300 px-3 py-2 text-sm"
              placeholder="Project Id"
              value={filterProjectId}
              onChange={(e) => setFilterProjectId(e.target.value)}
            />
            <input
              className="rounded border border-slate-300 px-3 py-2 text-sm md:col-span-2"
              placeholder="Search"
              value={filterSearch}
              onChange={(e) => setFilterSearch(e.target.value)}
            />
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Link
              href="/project-details"
              className={`rounded px-3 py-2 text-sm font-semibold ${
                activePage === "project-details" ? "bg-blue-700 text-white" : "bg-slate-200 text-slate-800"
              }`}
            >
              Project Details
            </Link>
            {canCreate ? (
              <button
                onClick={() => setViewMode("create_project")}
                className={`rounded px-3 py-2 text-sm font-semibold ${
                  viewMode === "create_project" ? "bg-blue-700 text-white" : "bg-slate-200 text-slate-800"
                }`}
              >
                Create Project
              </button>
            ) : null}
            <p className="ml-auto text-xs text-slate-500">Surveys: {surveys.length} | Projects: {projects.length} | Links: {totalLinks}</p>
          </div>
          </section>
        ) : (
          <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">
              {activePage === "supplier-center" ? "Supplier Center" : null}
              {activePage === "client" ? "Client" : null}
              {activePage === "flamingo-tool" ? "Flamingo Tool" : null}
              {activePage === "settings" ? "Settings" : null}
              {activePage === "end-link" ? "End Link" : null}
              {activePage === "feedback" ? "Feedback Hub" : null}
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              This section is routed and ready. We can now build the exact workflow screen for this module next.
            </p>
          </section>
        )}

        {showProjectDashboard && (viewMode === "project_center" || activePage === "project-details") ? (
          <section className="mt-4 overflow-auto rounded-lg border border-slate-200 bg-white shadow-sm">
            <table className="min-w-[1200px] text-sm">
              <thead className="bg-slate-100 text-left text-xs uppercase tracking-wide text-slate-700">
                <tr>
                  <th className="px-3 py-3">Project Id</th>
                  <th className="px-3 py-3">Project Name</th>
                  <th className="px-3 py-3">CC</th>
                  <th className="px-3 py-3">CC PO#</th>
                  <th className="px-3 py-3">ST</th>
                  <th className="px-3 py-3">RC</th>
                  <th className="px-3 py-3">L24</th>
                  <th className="px-3 py-3">CO</th>
                  <th className="px-3 py-3">TE</th>
                  <th className="px-3 py-3">OQ</th>
                  <th className="px-3 py-3">QT</th>
                  <th className="px-3 py-3">AB(%)</th>
                  <th className="px-3 py-3">IR(%)</th>
                  <th className="px-3 py-3">CO(%)</th>
                  <th className="px-3 py-3">($) CPI</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3">PM/SPM</th>
                  <th className="px-3 py-3">LU-Date</th>
                  <th className="px-3 py-3">Last Complete</th>
                  <th className="px-3 py-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {isLoadingProjects ? (
                  <tr>
                    <td className="px-3 py-4" colSpan={22}>
                      Loading projects...
                    </td>
                  </tr>
                ) : filteredRows.length === 0 ? (
                  <tr>
                    <td className="px-3 py-4" colSpan={22}>
                      No projects yet. Create one from Create Project tab.
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row) => {
                    const slug = row.project_links?.[0]?.slug;
                    const altLink = slug && origin ? `${origin}/l/${slug}` : "-";
                    return (
                      <tr key={row.id} className="border-t border-slate-100">
                        <td className="px-3 py-3 font-semibold">{row.code}</td>
                        <td className="px-3 py-3">{row.name}</td>
                        <td className="px-3 py-3">{row.cc}</td>
                        <td className="px-3 py-3">{row.ccPo}</td>
                        <td className="px-3 py-3">{row.st}</td>
                        <td className="px-3 py-3">{row.rc}</td>
                        <td className="px-3 py-3">{row.l24}</td>
                        <td className="px-3 py-3">{row.co}</td>
                        <td className="px-3 py-3">{row.te}</td>
                        <td className="px-3 py-3">{row.oq}</td>
                        <td className="px-3 py-3">{row.qt}</td>
                        <td className="px-3 py-3">{row.ab}%</td>
                        <td className="px-3 py-3">{row.ir}%</td>
                        <td className="px-3 py-3">{row.coRate}%</td>
                        <td className="px-3 py-3">${row.cpi}</td>
                        <td className="px-3 py-3">{row.statusLabel}</td>
                        <td className="px-3 py-3">{row.pm}</td>
                        <td className="px-3 py-3">{row.luDate}</td>
                        <td className="px-3 py-3">{row.lastComplete}</td>
                        <td className="px-3 py-3">
                          <div className="flex flex-wrap gap-1">
                            <a className="rounded bg-blue-700 px-2 py-1 text-xs font-semibold text-white" href={origin ? `${origin}/s/${row.survey_id}` : "#"} target="_blank" rel="noreferrer">✎</a>
                            <a className="rounded bg-blue-700 px-2 py-1 text-xs font-semibold text-white" href={altLink !== "-" ? altLink : "#"} target="_blank" rel="noreferrer">🔗</a>
                            <button className="rounded bg-blue-700 px-2 py-1 text-xs font-semibold text-white">👤</button>
                            {currentUser.role === "admin" ? (
                              <button className="rounded bg-blue-700 px-2 py-1 text-xs font-semibold text-white">$</button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </section>
        ) : null}

        {showProjectDashboard && viewMode === "create_project" ? (
          <section className="mt-4 grid gap-4 lg:grid-cols-2">
            {!canCreate ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                Your role is read-only. Contact Admin to create surveys or project links.
              </div>
            ) : null}
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="text-lg font-semibold">Create Survey</h2>
              <p className="mt-1 text-xs text-slate-500">Line format: Question | type | required | options (for multiple-choice)</p>
              <form className="mt-3 grid gap-3" onSubmit={onCreateSurvey}>
                <input
                  required
                  value={surveyTitle}
                  onChange={(e) => setSurveyTitle(e.target.value)}
                  placeholder="Survey Name"
                  className="rounded border border-slate-300 px-3 py-2 text-sm"
                />
                <textarea
                  required
                  rows={7}
                  value={questionTemplate}
                  onChange={(e) => setQuestionTemplate(e.target.value)}
                  className="rounded border border-slate-300 px-3 py-2 text-sm"
                />
                <button type="submit" disabled={isCreatingSurvey || !canCreate} className="w-fit rounded bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
                  {isCreatingSurvey ? "Creating..." : "Create Survey"}
                </button>
              </form>
              {surveyError ? <p className="mt-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{surveyError}</p> : null}
              {createdSurveyUrl ? (
                <p className="mt-3 rounded bg-green-50 px-3 py-2 text-sm text-green-700">
                  Survey created: <a href={createdSurveyUrl} target="_blank" rel="noreferrer" className="font-semibold underline">{createdSurveyUrl}</a>
                </p>
              ) : null}
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="text-lg font-semibold">Create Project Link</h2>
              <form className="mt-3 grid gap-3" onSubmit={onCreateProject}>
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Project Name"
                  className="rounded border border-slate-300 px-3 py-2 text-sm"
                />
                <input
                  required
                  value={surveyInput}
                  onChange={(e) => setSurveyInput(e.target.value)}
                  placeholder="Survey UUID or Survey URL"
                  className="rounded border border-slate-300 px-3 py-2 text-sm"
                />
                <select
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value as ProjectPlatform)}
                  className="rounded border border-slate-300 px-3 py-2 text-sm"
                >
                  {platformOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <input
                  value={sourceUrl}
                  onChange={(e) => setSourceUrl(e.target.value)}
                  placeholder="Source platform link (optional)"
                  className="rounded border border-slate-300 px-3 py-2 text-sm"
                />
                <button type="submit" disabled={isCreating || !canCreate} className="w-fit rounded bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
                  {isCreating ? "Creating..." : "Create Project & Link"}
                </button>
              </form>
              {createError ? <p className="mt-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{createError}</p> : null}
              {createdLink ? (
                <p className="mt-3 rounded bg-green-50 px-3 py-2 text-sm text-green-700">
                  Alternate link: <a href={createdLink} target="_blank" rel="noreferrer" className="font-semibold underline">{createdLink}</a>
                </p>
              ) : null}
              <div className="mt-4 rounded border border-slate-200 p-3">
                <p className="text-xs font-semibold text-slate-600">Available Surveys</p>
                {isLoadingSurveys ? <p className="mt-2 text-xs text-slate-500">Loading...</p> : null}
                <div className="mt-2 max-h-44 space-y-2 overflow-auto">
                  {surveys.map((survey) => (
                    <button
                      key={survey.id}
                      onClick={() => setSurveyInput(origin ? `${origin}/s/${survey.id}` : survey.id)}
                      className="block w-full rounded border border-slate-200 px-2 py-2 text-left text-xs hover:bg-slate-50"
                    >
                      <p className="font-semibold">{survey.title}</p>
                      <p className="text-slate-500">{survey.id}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>
        ) : null}

        {activePage === "feedback" ? <FeedbackBoard currentUser={currentUser} currentPage={activePage} /> : null}
      </div>
    </main>
  );
}
