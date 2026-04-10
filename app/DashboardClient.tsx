
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { ProjectItem } from "@/types/project";
import type { SessionUser } from "@/lib/auth";
import type { DashboardPage } from "@/types/navigation";
import FeedbackBoard from "./FeedbackBoard";
import OpsHeader from "./OpsHeader";

type SurveyItem = {
  id: string;
  title: string;
};

type ProjectTableRow = ProjectItem & {
  code: string;
  cc: string;
  ccPo: string;
  st: number;
  rc: number;
  l24: number;
  co: string;
  te: number;
  oq: number;
  qt: number;
  ab: number;
  irDisplay: number;
  coRate: number;
  cpiDisplay: number;
  statusLabel: string;
  pmLabel: string;
  supplierLabel: string;
  luDate: string;
  lastComplete: string;
};

type SupplierEntry = {
  name: string;
  url: string | null;
};

function toDisplayPlatform(platform: ProjectItem["platform"]) {
  if (platform === "prime_sample") {
    return "Prime Sample";
  }
  if (platform === "cint") {
    return "Cint";
  }
  return "Other";
}

function toWorkflowLabel(status: ProjectItem["workflow_status"]) {
  if (status === "ids_awaited") {
    return "Id's Awaited";
  }
  if (status === "pending") {
    return "Pending";
  }
  if (status === "paused") {
    return "Paused";
  }
  return "Live";
}

function parseSupplierEntries(sourceUrl: string | null, fallbackName: string): SupplierEntry[] {
  if (!sourceUrl || !sourceUrl.trim()) {
    return [{ name: fallbackName, url: null }];
  }

  const lines = sourceUrl
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return [{ name: fallbackName, url: null }];
  }

  return lines.map((line, index) => {
    const parts = line.split("|").map((part) => part.trim());
    if (parts.length >= 2) {
      return {
        name: parts[0] || `${fallbackName} ${index + 1}`,
        url: parts[1] || null,
      };
    }

    const looksLikeUrl = /^https?:\/\//i.test(parts[0] ?? "");
    if (looksLikeUrl) {
      return {
        name: `${fallbackName} ${index + 1}`,
        url: parts[0],
      };
    }

    return {
      name: parts[0] || `${fallbackName} ${index + 1}`,
      url: null,
    };
  });
}

export default function DashboardClient({
  currentUser,
  activePage,
}: {
  currentUser: SessionUser;
  activePage: DashboardPage;
}) {
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [surveys, setSurveys] = useState<SurveyItem[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [isLoadingSurveys, setIsLoadingSurveys] = useState(true);
  const [origin, setOrigin] = useState("");

  const [filterClient, setFilterClient] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterProjectId, setFilterProjectId] = useState("");
  const [filterSearch, setFilterSearch] = useState("");
  const [filterProjectManager, setFilterProjectManager] = useState("");
  const [filterSalesPerson, setFilterSalesPerson] = useState("");
  const [filterFromDate, setFilterFromDate] = useState("");
  const [filterToDate, setFilterToDate] = useState("");

  const [supplierProject, setSupplierProject] = useState<ProjectItem | null>(null);
  const [supplierUrl, setSupplierUrl] = useState("");
  const [supplierSaving, setSupplierSaving] = useState(false);
  const [supplierError, setSupplierError] = useState<string | null>(null);

  const [supplierListProject, setSupplierListProject] = useState<ProjectTableRow | null>(null);

  const [assignProject, setAssignProject] = useState<ProjectItem | null>(null);
  const [assignPm, setAssignPm] = useState("");
  const [assignSales, setAssignSales] = useState("");
  const [assignSaving, setAssignSaving] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);

  const [pricingProject, setPricingProject] = useState<ProjectItem | null>(null);
  const [pricingCpi, setPricingCpi] = useState("");
  const [pricingSupplierCpi, setPricingSupplierCpi] = useState("");
  const [pricingSaving, setPricingSaving] = useState(false);
  const [pricingError, setPricingError] = useState<string | null>(null);

  const showProjectDashboard =
    activePage === "home" || activePage === "project-center" || activePage === "project-details";

  const canEditProjects = currentUser.role === "admin" || currentUser.role === "pm";

  const totalLinks = useMemo(
    () => projects.reduce((sum, project) => sum + (project.project_links?.length ?? 0), 0),
    [projects],
  );

  const projectTableRows = useMemo<ProjectTableRow[]>(() => {
    return projects.map((project, index) => {
      const createdDate = new Date(project.created_at);
      const code = project.project_code ?? `QLB-${String(index + 1).padStart(4, "0")}${createdDate.getFullYear()}`;
      const st = Number(project.quota ?? 20 + index * 3);
      const rc = Math.max(0, Math.floor(st * 0.75));
      const l24 = Math.floor(index / 2);
      const coNum = Number(project.loi ?? Math.max(0, st - rc));
      const co = `${coNum}/${st || 999}`;
      const te = Number(project.number_of_questions ?? 10 + index);
      const oq = 1 + index;
      const qt = Number(project.quota ?? 15 + index * 4);
      const ab = Number(project.ir ?? 9 + index);
      const irDisplay = Number(project.ir ?? 45 + index * 4);
      const coRate = Math.max(0, Math.min(100, Math.round((rc / Math.max(st, 1)) * 100)));
      const cpiDisplay = Number(project.cpi ?? 7 + index);

      return {
        ...project,
        code,
        cc: project.client_name || ["IPS", "AZK", "PDS"][index % 3],
        ccPo: project.client_po_number || `25-03494${index + 1}-01-06`,
        st,
        rc,
        l24,
        co,
        te,
        oq,
        qt,
        ab,
        irDisplay,
        coRate,
        cpiDisplay,
        statusLabel: toWorkflowLabel(project.workflow_status),
        pmLabel: project.project_manager || "AR",
        supplierLabel: project.supplier_name || toDisplayPlatform(project.platform),
        luDate: new Date(project.updated_at || project.created_at).toLocaleDateString("en-GB"),
        lastComplete: index === 0 ? "8 minutes ago" : `${index + 1} hours ago`,
      };
    });
  }, [projects]);

  const clientOptions = useMemo(() => {
    return Array.from(new Set(projectTableRows.map((row) => row.cc))).sort();
  }, [projectTableRows]);

  const statusOptions = useMemo(() => {
    return Array.from(new Set(projectTableRows.map((row) => row.statusLabel))).sort();
  }, [projectTableRows]);

  const filteredRows = useMemo(() => {
    return projectTableRows.filter((row) => {
      if (filterClient && row.cc.toLowerCase() !== filterClient.toLowerCase()) {
        return false;
      }
      if (filterStatus && row.statusLabel.toLowerCase() !== filterStatus.toLowerCase()) {
        return false;
      }
      if (filterProjectManager && !row.pmLabel.toLowerCase().includes(filterProjectManager.toLowerCase())) {
        return false;
      }
      if (filterSalesPerson && !(row.sales_person || "").toLowerCase().includes(filterSalesPerson.toLowerCase())) {
        return false;
      }
      if (filterProjectId && !row.code.toLowerCase().includes(filterProjectId.toLowerCase())) {
        return false;
      }
      if (filterFromDate) {
        const rowDate = new Date(row.created_at);
        const fromDate = new Date(filterFromDate);
        fromDate.setHours(0, 0, 0, 0);
        if (rowDate < fromDate) {
          return false;
        }
      }
      if (filterToDate) {
        const rowDate = new Date(row.created_at);
        const toDate = new Date(filterToDate);
        toDate.setHours(23, 59, 59, 999);
        if (rowDate > toDate) {
          return false;
        }
      }
      if (
        filterSearch &&
        !`${row.name} ${row.code} ${row.ccPo} ${row.supplierLabel}`.toLowerCase().includes(filterSearch.toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [
    filterClient,
    filterFromDate,
    filterProjectId,
    filterProjectManager,
    filterSalesPerson,
    filterSearch,
    filterStatus,
    filterToDate,
    projectTableRows,
  ]);

  function resetFilters() {
    setFilterClient("");
    setFilterStatus("");
    setFilterProjectId("");
    setFilterSearch("");
    setFilterProjectManager("");
    setFilterSalesPerson("");
    setFilterFromDate("");
    setFilterToDate("");
  }

  async function loadProjects() {
    setIsLoadingProjects(true);
    try {
      const res = await fetch("/api/projects", { cache: "no-store" });
      const body = await res.json();
      if (res.ok) {
        setProjects((body.projects ?? []) as ProjectItem[]);
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
        setSurveys((body.surveys ?? []) as SurveyItem[]);
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

  function openSupplierModal(project: ProjectItem) {
    setSupplierProject(project);
    setSupplierUrl(project.source_url ?? "");
    setSupplierError(null);
  }

  async function saveSupplierLink() {
    if (!supplierProject) {
      return;
    }
    setSupplierSaving(true);
    setSupplierError(null);
    try {
      const firstSupplier = parseSupplierEntries(supplierUrl, toDisplayPlatform(supplierProject.platform))[0];
      const res = await fetch(`/api/projects/${supplierProject.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceUrl: supplierUrl,
          supplierName: firstSupplier?.name ?? null,
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        setSupplierError(body?.error ?? "Could not save supplier link.");
        return;
      }
      setSupplierProject(null);
      await loadProjects();
    } catch {
      setSupplierError("Network error. Please retry.");
    } finally {
      setSupplierSaving(false);
    }
  }

  function openAssignModal(project: ProjectItem) {
    setAssignProject(project);
    setAssignPm(project.project_manager ?? "");
    setAssignSales(project.sales_person ?? "");
    setAssignError(null);
  }

  async function saveAssignment() {
    if (!assignProject) {
      return;
    }
    setAssignSaving(true);
    setAssignError(null);
    try {
      const res = await fetch(`/api/projects/${assignProject.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectManager: assignPm,
          salesPerson: assignSales,
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        setAssignError(body?.error ?? "Could not save assignment.");
        return;
      }
      setAssignProject(null);
      await loadProjects();
    } catch {
      setAssignError("Network error. Please retry.");
    } finally {
      setAssignSaving(false);
    }
  }

  function openPricingModal(project: ProjectItem) {
    setPricingProject(project);
    setPricingCpi(project.cpi?.toString() ?? "");
    setPricingSupplierCpi(project.supplier_cpi?.toString() ?? "");
    setPricingError(null);
  }

  async function savePricing() {
    if (!pricingProject) {
      return;
    }
    setPricingSaving(true);
    setPricingError(null);
    try {
      const res = await fetch(`/api/projects/${pricingProject.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cpi: pricingCpi,
          supplierCpi: pricingSupplierCpi,
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        setPricingError(body?.error ?? "Could not save CPI.");
        return;
      }
      setPricingProject(null);
      await loadProjects();
    } catch {
      setPricingError("Network error. Please retry.");
    } finally {
      setPricingSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#eef3f8] text-slate-900">
      <OpsHeader currentUser={currentUser} activePage={activePage} />

      <div className="mx-auto max-w-[1400px] px-4 py-5">
        {showProjectDashboard ? (
          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="grid gap-3 md:grid-cols-6">
              <input
                type="date"
                className="rounded border border-slate-300 px-3 py-2 text-sm"
                value={filterFromDate}
                onChange={(e) => setFilterFromDate(e.target.value)}
              />
              <input
                type="date"
                className="rounded border border-slate-300 px-3 py-2 text-sm"
                value={filterToDate}
                onChange={(e) => setFilterToDate(e.target.value)}
              />
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
                <option value="">-Sales Person-</option>
                <option>AR</option>
                <option>AY</option>
                <option>AM/HP</option>
              </select>
              <div className="flex gap-2">
                <button className="rounded bg-blue-800 px-3 py-2 text-sm font-semibold text-white" title="Search" type="button">
                  Search
                </button>
                <button className="rounded bg-blue-800 px-3 py-2 text-sm font-semibold text-white" title="Download" type="button">
                  Export
                </button>
                <button className="rounded bg-blue-800 px-3 py-2 text-sm font-semibold text-white" title="Finance" type="button">
                  $
                </button>
                <button className="rounded bg-blue-800 px-3 py-2 text-sm font-semibold text-white" title="Refresh" type="button" onClick={resetFilters}>
                  Reset
                </button>
              </div>
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-6">
              <select
                className="rounded border border-slate-300 px-3 py-2 text-sm"
                value={filterClient}
                onChange={(e) => setFilterClient(e.target.value)}
              >
                <option value="">Select Client</option>
                {clientOptions.map((client) => (
                  <option key={client} value={client}>
                    {client}
                  </option>
                ))}
              </select>
              <select
                className="rounded border border-slate-300 px-3 py-2 text-sm"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="">Project Status</option>
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
              <input
                className="rounded border border-slate-300 px-3 py-2 text-sm"
                placeholder="Project Id"
                value={filterProjectId}
                onChange={(e) => setFilterProjectId(e.target.value)}
              />
              <input
                className="rounded border border-slate-300 px-3 py-2 text-sm md:col-span-2"
                placeholder="Project Name"
                value={filterSearch}
                onChange={(e) => setFilterSearch(e.target.value)}
              />
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Link href="/project-details" className="rounded bg-blue-700 px-3 py-2 text-sm font-semibold text-white">
                Project Details
              </Link>
              {canEditProjects ? (
                <Link href="/project-center/create" className="rounded bg-slate-200 px-3 py-2 text-sm font-semibold text-slate-800">
                  Create Project
                </Link>
              ) : null}
              <p className="ml-auto text-xs text-slate-500">
                Surveys: {isLoadingSurveys ? "..." : surveys.length} | Projects: {projects.length} | Links: {totalLinks}
              </p>
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
              {activePage === "developer-setup" ? "Developer Setup" : null}
              {activePage === "product-docs" ? "Product Documentation" : null}
            </h2>
            <p className="mt-2 text-sm text-slate-600">This module route is active. We can now add detailed workflow blocks for this section.</p>
            {activePage === "developer-setup" ? (
              <div className="mt-4 rounded border border-slate-200 bg-slate-50 p-3 text-sm">
                <p className="font-semibold">Developer Setup Quick Start</p>
                <p className="mt-1">1) Clone repo 2) npm install 3) npm run dev 4) Prompt agent for changes 5) push to GitHub and Vercel auto-deploys.</p>
                <Link href="/product-docs" className="mt-3 inline-flex rounded bg-blue-700 px-3 py-2 text-sm font-semibold text-white">Open Product Docs</Link>
              </div>
            ) : null}
          </section>
        )}

        {showProjectDashboard ? (
          <section className="mt-4 overflow-auto rounded-lg border border-slate-200 bg-white shadow-sm">
            <table className="min-w-[1250px] text-sm">
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
                    <td className="px-3 py-4" colSpan={20}>
                      Loading projects...
                    </td>
                  </tr>
                ) : filteredRows.length === 0 ? (
                  <tr>
                    <td className="px-3 py-4" colSpan={20}>
                      No projects yet. Create one from Project Center - Create Project.
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row) => (
                    <tr key={row.id} className="border-t border-slate-100">
                      <td className="px-3 py-3 font-semibold">
                        <button onClick={() => setSupplierListProject(row)} className="text-left text-blue-700 underline" title="View Supplier List" type="button">
                          {row.code}
                        </button>
                      </td>
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
                      <td className="px-3 py-3">{row.irDisplay}%</td>
                      <td className="px-3 py-3">{row.coRate}%</td>
                      <td className="px-3 py-3">${row.cpiDisplay}</td>
                      <td className="px-3 py-3">{row.statusLabel}</td>
                      <td className="px-3 py-3">{row.pmLabel}</td>
                      <td className="px-3 py-3">{row.luDate}</td>
                      <td className="px-3 py-3">{row.lastComplete}</td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap gap-1">
                          <Link href={`/project-details/${row.id}/edit`} className="rounded bg-blue-700 px-2 py-1 text-xs font-semibold text-white" title="Edit Project">
                            Edit
                          </Link>
                          <Link href="/project-center/create" className="rounded bg-blue-700 px-2 py-1 text-xs font-semibold text-white" title="Create Project">
                            +
                          </Link>
                          <button className="rounded bg-blue-700 px-2 py-1 text-xs font-semibold text-white" onClick={() => openSupplierModal(row)} title="Add Supplier Link" type="button">
                            Link
                          </button>
                          <button className="rounded bg-blue-700 px-2 py-1 text-xs font-semibold text-white" onClick={() => openAssignModal(row)} title="Assign PM/Sales" type="button">
                            User
                          </button>
                          {currentUser.role === "admin" ? (
                            <button className="rounded bg-blue-700 px-2 py-1 text-xs font-semibold text-white" onClick={() => openPricingModal(row)} title="CPI Settings" type="button">
                              $
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </section>
        ) : null}

        {activePage === "feedback" ? <FeedbackBoard currentUser={currentUser} currentPage={activePage} /> : null}
        {supplierListProject ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
            <div className="w-full max-w-2xl rounded-lg bg-white p-4 shadow-xl">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold">Supplier List</h3>
                <button className="text-sm text-slate-500" onClick={() => setSupplierListProject(null)} type="button">Close</button>
              </div>
              <p className="mt-2 text-sm text-slate-600">
                Project: <span className="font-semibold">{supplierListProject.name}</span>
              </p>
              <div className="mt-3 overflow-auto rounded border border-slate-200">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-100 text-left text-xs uppercase tracking-wide text-slate-700">
                    <tr>
                      <th className="px-3 py-2">#</th>
                      <th className="px-3 py-2">Supplier</th>
                      <th className="px-3 py-2">Link</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parseSupplierEntries(supplierListProject.source_url, supplierListProject.supplierLabel).map((entry, idx) => (
                      <tr key={`${entry.name}-${idx}`} className="border-t border-slate-100">
                        <td className="px-3 py-2">{idx + 1}</td>
                        <td className="px-3 py-2">{entry.name}</td>
                        <td className="px-3 py-2">
                          {entry.url ? (
                            <a className="text-blue-700 underline" href={entry.url} target="_blank" rel="noreferrer">
                              {entry.url}
                            </a>
                          ) : (
                            <span className="text-slate-500">No link added</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : null}

        {supplierProject ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
            <div className="w-full max-w-lg rounded-lg bg-white p-4 shadow-xl">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold">Supplier Link</h3>
                <button className="text-sm text-slate-500" onClick={() => setSupplierProject(null)} type="button">Close</button>
              </div>
              <p className="mt-2 text-sm text-slate-600">Project: <span className="font-semibold">{supplierProject.name}</span></p>
              <div className="mt-3 grid gap-3">
                <textarea
                  className="rounded border border-slate-300 px-3 py-2 text-sm"
                  rows={4}
                  value={supplierUrl}
                  onChange={(e) => setSupplierUrl(e.target.value)}
                  placeholder={"Supplier Name | https://link\nOne supplier per line"}
                />
                <p className="text-xs text-slate-500">Format: Supplier Name | Link. Add one supplier per line.</p>
                <div className="rounded border border-slate-200 bg-slate-50 p-2">
                  <p className="text-xs font-semibold text-slate-700">Supplier Preview</p>
                  <div className="mt-1 space-y-1">
                    {parseSupplierEntries(supplierUrl, toDisplayPlatform(supplierProject.platform)).map((entry, idx) => (
                      <p key={`${entry.name}-${idx}`} className="text-xs text-slate-700">
                        {idx + 1}. {entry.name}{entry.url ? ` - ${entry.url}` : ""}
                      </p>
                    ))}
                  </div>
                </div>
                {supplierProject.project_links?.[0]?.slug && origin ? (
                  <a
                    className="text-xs font-semibold text-blue-700 underline"
                    href={`${origin}/l/${supplierProject.project_links[0].slug}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open alternate link: {`${origin}/l/${supplierProject.project_links[0].slug}`}
                  </a>
                ) : null}
              </div>
              {supplierError ? <p className="mt-3 text-sm text-red-700">{supplierError}</p> : null}
              <div className="mt-4 flex justify-end gap-2">
                <button className="rounded border border-slate-300 px-3 py-2 text-sm" onClick={() => setSupplierProject(null)} type="button">Cancel</button>
                <button className="rounded bg-blue-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60" onClick={() => void saveSupplierLink()} disabled={supplierSaving} type="button">
                  {supplierSaving ? "Saving..." : "Save Supplier"}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {assignProject ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
            <div className="w-full max-w-lg rounded-lg bg-white p-4 shadow-xl">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold">Assign Team</h3>
                <button className="text-sm text-slate-500" onClick={() => setAssignProject(null)} type="button">Close</button>
              </div>
              <div className="mt-3 grid gap-3">
                <input className="rounded border border-slate-300 px-3 py-2 text-sm" value={assignPm} onChange={(e) => setAssignPm(e.target.value)} placeholder="Project Manager" />
                <input className="rounded border border-slate-300 px-3 py-2 text-sm" value={assignSales} onChange={(e) => setAssignSales(e.target.value)} placeholder="Sales Person" />
              </div>
              {assignError ? <p className="mt-3 text-sm text-red-700">{assignError}</p> : null}
              <div className="mt-4 flex justify-end gap-2">
                <button className="rounded border border-slate-300 px-3 py-2 text-sm" onClick={() => setAssignProject(null)} type="button">Cancel</button>
                <button className="rounded bg-blue-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60" onClick={() => void saveAssignment()} disabled={assignSaving} type="button">
                  {assignSaving ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {pricingProject ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
            <div className="w-full max-w-lg rounded-lg bg-white p-4 shadow-xl">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold">CPI Settings</h3>
                <button className="text-sm text-slate-500" onClick={() => setPricingProject(null)} type="button">Close</button>
              </div>
              <div className="mt-3 grid gap-3">
                <input className="rounded border border-slate-300 px-3 py-2 text-sm" value={pricingCpi} onChange={(e) => setPricingCpi(e.target.value)} placeholder="Client CPI" />
                <input className="rounded border border-slate-300 px-3 py-2 text-sm" value={pricingSupplierCpi} onChange={(e) => setPricingSupplierCpi(e.target.value)} placeholder="Supplier CPI" />
              </div>
              {pricingError ? <p className="mt-3 text-sm text-red-700">{pricingError}</p> : null}
              <div className="mt-4 flex justify-end gap-2">
                <button className="rounded border border-slate-300 px-3 py-2 text-sm" onClick={() => setPricingProject(null)} type="button">Cancel</button>
                <button className="rounded bg-blue-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60" onClick={() => void savePricing()} disabled={pricingSaving} type="button">
                  {pricingSaving ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}
