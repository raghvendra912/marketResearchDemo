"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { SessionUser } from "@/lib/auth";
import OpsHeader from "@/app/OpsHeader";
import type { DashboardPage } from "@/types/navigation";
import type { ProjectPlatform, ProjectStatus, WorkflowStatus } from "@/types/project";

type Mode = "create" | "edit";
type OnOff = "on" | "off";
type CampaignBanner = "hide" | "show";

type SurveyItem = {
  id: string;
  title: string;
};

type ProjectResponse = {
  success?: boolean;
  project?: Record<string, unknown>;
  alternateLink?: string;
  error?: string;
};

type Props = {
  currentUser: SessionUser;
  mode: Mode;
  projectId?: string;
  activePage: DashboardPage;
};

type FormState = {
  projectCode: string;
  surveyName: string;
  surveyInput: string;
  platform: ProjectPlatform;
  sourceUrl: string;
  status: ProjectStatus;
  workflowStatus: WorkflowStatus;
  projectType: string;
  surveyCategory: string;
  projectManager: string;
  secondaryProjectManager: string;
  createDate: string;
  endDate: string;
  preScreening: OnOff;
  aiPreScreeningStatus: OnOff;
  numberOfQuestions: string;
  clientName: string;
  salesPerson: string;
  clientPoNumber: string;
  variable: string;
  quota: string;
  country: string;
  ir: string;
  loi: string;
  cpi: string;
  segment: string;
  surveyLink: string;
  supplierName: string;
  supplierCpi: string;
  rdSearch: boolean;
  rdReview: boolean;
  rdPredupe: boolean;
  rdActivity: boolean;
  rdEmailVerify: boolean;
  speederTerm: OnOff;
  geoIp: OnOff;
  duplicateIp: OnOff;
  preScreeningCaptcha: OnOff;
  survalidate: OnOff;
  dfiqPortal: OnOff;
  campaignBanner: CampaignBanner;
  campaignBannerStatus: string;
};

const platformOptions: Array<{ value: ProjectPlatform; label: string }> = [
  { value: "cint", label: "Cint" },
  { value: "prime_sample", label: "Prime Sample" },
  { value: "other", label: "Other" },
];

const workflowOptions: Array<{ value: WorkflowStatus; label: string }> = [
  { value: "live", label: "Live" },
  { value: "pending", label: "Pending" },
  { value: "paused", label: "Paused" },
  { value: "ids_awaited", label: "Id's Awaited" },
];

const defaultState: FormState = {
  projectCode: "",
  surveyName: "",
  surveyInput: "",
  platform: "cint",
  sourceUrl: "",
  status: "published",
  workflowStatus: "live",
  projectType: "consumer",
  surveyCategory: "general",
  projectManager: "AR",
  secondaryProjectManager: "",
  createDate: new Date().toISOString().slice(0, 10),
  endDate: "",
  preScreening: "off",
  aiPreScreeningStatus: "off",
  numberOfQuestions: "5",
  clientName: "",
  salesPerson: "",
  clientPoNumber: "",
  variable: "",
  quota: "999",
  country: "",
  ir: "",
  loi: "",
  cpi: "",
  segment: "",
  surveyLink: "",
  supplierName: "",
  supplierCpi: "0",
  rdSearch: false,
  rdReview: false,
  rdPredupe: false,
  rdActivity: false,
  rdEmailVerify: false,
  speederTerm: "off",
  geoIp: "off",
  duplicateIp: "off",
  preScreeningCaptcha: "off",
  survalidate: "off",
  dfiqPortal: "off",
  campaignBanner: "hide",
  campaignBannerStatus: "Complete, Terminate, Quota-Full",
};

function toStringValue(value: unknown) {
  if (value === null || typeof value === "undefined") {
    return "";
  }
  return String(value);
}

function mapProjectToForm(project: Record<string, unknown>): FormState {
  return {
    projectCode: toStringValue(project.project_code),
    surveyName: toStringValue(project.survey_name || project.name),
    surveyInput: toStringValue(project.survey_id),
    platform: (project.platform as ProjectPlatform) ?? "other",
    sourceUrl: toStringValue(project.source_url),
    status: (project.status as ProjectStatus) ?? "published",
    workflowStatus: (project.workflow_status as WorkflowStatus) ?? "live",
    projectType: toStringValue(project.project_type),
    surveyCategory: toStringValue(project.survey_category),
    projectManager: toStringValue(project.project_manager),
    secondaryProjectManager: toStringValue(project.secondary_project_manager),
    createDate: toStringValue(project.create_date),
    endDate: toStringValue(project.end_date),
    preScreening: (project.pre_screening as OnOff) ?? "off",
    aiPreScreeningStatus: (project.ai_pre_screening_status as OnOff) ?? "off",
    numberOfQuestions: toStringValue(project.number_of_questions),
    clientName: toStringValue(project.client_name),
    salesPerson: toStringValue(project.sales_person),
    clientPoNumber: toStringValue(project.client_po_number),
    variable: toStringValue(project.variable),
    quota: toStringValue(project.quota),
    country: toStringValue(project.country),
    ir: toStringValue(project.ir),
    loi: toStringValue(project.loi),
    cpi: toStringValue(project.cpi),
    segment: toStringValue(project.segment),
    surveyLink: toStringValue(project.survey_link),
    supplierName: toStringValue(project.supplier_name),
    supplierCpi: toStringValue(project.supplier_cpi),
    rdSearch: Boolean(project.rd_search),
    rdReview: Boolean(project.rd_review),
    rdPredupe: Boolean(project.rd_predupe),
    rdActivity: Boolean(project.rd_activity),
    rdEmailVerify: Boolean(project.rd_email_verify),
    speederTerm: (project.speeder_term as OnOff) ?? "off",
    geoIp: (project.geo_ip as OnOff) ?? "off",
    duplicateIp: (project.duplicate_ip as OnOff) ?? "off",
    preScreeningCaptcha: (project.pre_screening_captcha as OnOff) ?? "off",
    survalidate: (project.survalidate as OnOff) ?? "off",
    dfiqPortal: (project.dfiq_portal as OnOff) ?? "off",
    campaignBanner: (project.campaign_banner as CampaignBanner) ?? "hide",
    campaignBannerStatus: toStringValue(project.campaign_banner_status),
  };
}

export default function ProjectEditorClient({ currentUser, mode, projectId, activePage }: Props) {
  const canEdit = currentUser.role === "admin" || currentUser.role === "pm";
  const [state, setState] = useState<FormState>(defaultState);
  const [loading, setLoading] = useState(mode === "edit");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [alternateLink, setAlternateLink] = useState<string | null>(null);
  const [surveys, setSurveys] = useState<SurveyItem[]>([]);
  const [origin, setOrigin] = useState("");
  const router = useRouter();

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    let mounted = true;
    async function loadSurveys() {
      try {
        const res = await fetch("/api/surveys", { cache: "no-store" });
        const body = await res.json();
        if (mounted && res.ok) {
          setSurveys((body.surveys ?? []) as SurveyItem[]);
        }
      } catch {
        if (mounted) {
          setSurveys([]);
        }
      }
    }
    void loadSurveys();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (mode !== "edit" || !projectId) {
      return;
    }

    let mounted = true;
    async function loadProject() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/projects/${projectId}`, { cache: "no-store" });
        const body = (await res.json()) as { error?: string; project?: Record<string, unknown> };
        if (!mounted) {
          return;
        }
        if (!res.ok || !body.project) {
          setError(body.error ?? "Could not load project.");
          return;
        }
        setState(mapProjectToForm(body.project));
      } catch {
        if (mounted) {
          setError("Network error while loading project.");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }
    void loadProject();
    return () => {
      mounted = false;
    };
  }, [mode, projectId]);

  const surveyUrl = useMemo(() => {
    const surveyId = state.surveyInput.trim();
    if (!surveyId) {
      return null;
    }
    if (surveyId.startsWith("http://") || surveyId.startsWith("https://")) {
      return surveyId;
    }
    if (!origin) {
      return null;
    }
    return `${origin}/s/${surveyId}`;
  }, [origin, state.surveyInput]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setState((prev) => ({ ...prev, [key]: value }));
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setAlternateLink(null);

    if (!canEdit) {
      setError("Only Admin/PM can update project configuration.");
      return;
    }
    if (!state.surveyName.trim()) {
      setError("Survey name is required.");
      return;
    }
    if (!state.surveyInput.trim()) {
      setError("Select a survey first.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        projectCode: state.projectCode,
        name: state.surveyName,
        surveyName: state.surveyName,
        surveyInput: state.surveyInput,
        platform: state.platform,
        sourceUrl: state.sourceUrl,
        status: state.status,
        workflowStatus: state.workflowStatus,
        projectType: state.projectType,
        surveyCategory: state.surveyCategory,
        projectManager: state.projectManager,
        secondaryProjectManager: state.secondaryProjectManager,
        createDate: state.createDate,
        endDate: state.endDate,
        preScreening: state.preScreening,
        aiPreScreeningStatus: state.aiPreScreeningStatus,
        numberOfQuestions: state.numberOfQuestions,
        clientName: state.clientName,
        salesPerson: state.salesPerson,
        clientPoNumber: state.clientPoNumber,
        variable: state.variable,
        quota: state.quota,
        country: state.country,
        ir: state.ir,
        loi: state.loi,
        cpi: state.cpi,
        segment: state.segment,
        surveyLink: state.surveyLink,
        supplierName: state.supplierName,
        supplierCpi: state.supplierCpi,
        rdSearch: state.rdSearch,
        rdReview: state.rdReview,
        rdPredupe: state.rdPredupe,
        rdActivity: state.rdActivity,
        rdEmailVerify: state.rdEmailVerify,
        speederTerm: state.speederTerm,
        geoIp: state.geoIp,
        duplicateIp: state.duplicateIp,
        preScreeningCaptcha: state.preScreeningCaptcha,
        survalidate: state.survalidate,
        dfiqPortal: state.dfiqPortal,
        campaignBanner: state.campaignBanner,
        campaignBannerStatus: state.campaignBannerStatus,
      };

      const endpoint = mode === "create" ? "/api/projects" : `/api/projects/${projectId}`;
      const method = mode === "create" ? "POST" : "PATCH";
      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = (await res.json()) as ProjectResponse;
      if (!res.ok) {
        setError(body.error ?? "Could not save project.");
        return;
      }

      if (mode === "create") {
        setSuccess("Project created successfully.");
        setAlternateLink(body.alternateLink ?? null);
      } else {
        setSuccess("Project updated successfully.");
      }
    } catch {
      setError("Network error. Please retry.");
    } finally {
      setSaving(false);
    }
  }

  if (!canEdit) {
    return (
      <main className="min-h-screen bg-[#eef3f8] text-slate-900">
        <OpsHeader currentUser={currentUser} activePage={activePage} />
        <div className="mx-auto max-w-[1400px] px-4 py-6">
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            You have read-only access. Ask Admin/PM to create or edit project details.
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#eef3f8] text-slate-900">
      <OpsHeader currentUser={currentUser} activePage={activePage} />
      <div className="mx-auto max-w-[1400px] px-4 py-5">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold">{mode === "create" ? "Create Project" : "Edit Project"}</h1>
          <Link href="/project-details" className="rounded bg-slate-200 px-3 py-2 text-sm font-semibold text-slate-800">
            Back to Project Details
          </Link>
        </div>

        {loading ? (
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">Loading project...</div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="grid gap-3 md:grid-cols-3">
                <label className="grid gap-1 text-sm">
                  <span className="font-medium">Survey Name</span>
                  <input
                    value={state.surveyName}
                    onChange={(e) => update("surveyName", e.target.value)}
                    className="rounded border border-slate-300 px-3 py-2"
                    placeholder="Survey Name"
                    required
                  />
                </label>
                <label className="grid gap-1 text-sm">
                  <span className="font-medium">Project Type</span>
                  <input
                    value={state.projectType}
                    onChange={(e) => update("projectType", e.target.value)}
                    className="rounded border border-slate-300 px-3 py-2"
                    placeholder="Consumer / B2B"
                  />
                </label>
                <label className="grid gap-1 text-sm">
                  <span className="font-medium">Survey Category</span>
                  <input
                    value={state.surveyCategory}
                    onChange={(e) => update("surveyCategory", e.target.value)}
                    className="rounded border border-slate-300 px-3 py-2"
                    placeholder="Category"
                  />
                </label>
                <label className="grid gap-1 text-sm">
                  <span className="font-medium">Project Manager</span>
                  <input
                    value={state.projectManager}
                    onChange={(e) => update("projectManager", e.target.value)}
                    className="rounded border border-slate-300 px-3 py-2"
                    placeholder="Project Manager"
                  />
                </label>
                <label className="grid gap-1 text-sm">
                  <span className="font-medium">Secondary PM</span>
                  <input
                    value={state.secondaryProjectManager}
                    onChange={(e) => update("secondaryProjectManager", e.target.value)}
                    className="rounded border border-slate-300 px-3 py-2"
                    placeholder="Secondary Manager"
                  />
                </label>
                <label className="grid gap-1 text-sm">
                  <span className="font-medium">Create Date</span>
                  <input
                    type="date"
                    value={state.createDate}
                    onChange={(e) => update("createDate", e.target.value)}
                    className="rounded border border-slate-300 px-3 py-2"
                  />
                </label>
                <label className="grid gap-1 text-sm">
                  <span className="font-medium">End Date</span>
                  <input
                    type="date"
                    value={state.endDate}
                    onChange={(e) => update("endDate", e.target.value)}
                    className="rounded border border-slate-300 px-3 py-2"
                  />
                </label>
                <label className="grid gap-1 text-sm md:col-span-2">
                  <span className="font-medium">Survey</span>
                  <div className="grid gap-2 md:grid-cols-2">
                    <select
                      value={state.surveyInput}
                      onChange={(e) => update("surveyInput", e.target.value)}
                      className="rounded border border-slate-300 px-3 py-2"
                    >
                      <option value="">Select Survey</option>
                      {surveys.map((survey) => (
                        <option key={survey.id} value={survey.id}>
                          {survey.title}
                        </option>
                      ))}
                    </select>
                    <input
                      value={state.surveyInput}
                      onChange={(e) => update("surveyInput", e.target.value)}
                      className="rounded border border-slate-300 px-3 py-2"
                      placeholder="Survey UUID or /s/<id> URL"
                    />
                  </div>
                </label>
              </div>
            </section>

            <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="mb-3 text-base font-semibold">AI Pre-Screening Questions</h2>
              <div className="grid gap-3 md:grid-cols-3">
                <label className="grid gap-1 text-sm">
                  <span className="font-medium">Pre-screening</span>
                  <select value={state.preScreening} onChange={(e) => update("preScreening", e.target.value as OnOff)} className="rounded border border-slate-300 px-3 py-2">
                    <option value="off">Off</option>
                    <option value="on">On</option>
                  </select>
                </label>
                <label className="grid gap-1 text-sm">
                  <span className="font-medium">AI Pre-screening Status</span>
                  <select value={state.aiPreScreeningStatus} onChange={(e) => update("aiPreScreeningStatus", e.target.value as OnOff)} className="rounded border border-slate-300 px-3 py-2">
                    <option value="off">Off</option>
                    <option value="on">On</option>
                  </select>
                </label>
                <label className="grid gap-1 text-sm">
                  <span className="font-medium">Number of Questions</span>
                  <input value={state.numberOfQuestions} onChange={(e) => update("numberOfQuestions", e.target.value)} className="rounded border border-slate-300 px-3 py-2" />
                </label>
              </div>
            </section>

            <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="mb-3 text-base font-semibold">Client Information</h2>
              <div className="grid gap-3 md:grid-cols-6">
                <label className="grid gap-1 text-sm md:col-span-2">
                  <span className="font-medium">Client</span>
                  <input value={state.clientName} onChange={(e) => update("clientName", e.target.value)} className="rounded border border-slate-300 px-3 py-2" />
                </label>
                <label className="grid gap-1 text-sm md:col-span-2">
                  <span className="font-medium">Sales Person</span>
                  <input value={state.salesPerson} onChange={(e) => update("salesPerson", e.target.value)} className="rounded border border-slate-300 px-3 py-2" />
                </label>
                <label className="grid gap-1 text-sm">
                  <span className="font-medium">Client PO#</span>
                  <input value={state.clientPoNumber} onChange={(e) => update("clientPoNumber", e.target.value)} className="rounded border border-slate-300 px-3 py-2" />
                </label>
                <label className="grid gap-1 text-sm">
                  <span className="font-medium">Variable</span>
                  <input value={state.variable} onChange={(e) => update("variable", e.target.value)} className="rounded border border-slate-300 px-3 py-2" />
                </label>
                <label className="grid gap-1 text-sm">
                  <span className="font-medium">Quota</span>
                  <input value={state.quota} onChange={(e) => update("quota", e.target.value)} className="rounded border border-slate-300 px-3 py-2" />
                </label>
                <label className="grid gap-1 text-sm">
                  <span className="font-medium">Country</span>
                  <input value={state.country} onChange={(e) => update("country", e.target.value)} className="rounded border border-slate-300 px-3 py-2" />
                </label>
                <label className="grid gap-1 text-sm">
                  <span className="font-medium">IR (%)</span>
                  <input value={state.ir} onChange={(e) => update("ir", e.target.value)} className="rounded border border-slate-300 px-3 py-2" />
                </label>
                <label className="grid gap-1 text-sm">
                  <span className="font-medium">LOI</span>
                  <input value={state.loi} onChange={(e) => update("loi", e.target.value)} className="rounded border border-slate-300 px-3 py-2" />
                </label>
                <label className="grid gap-1 text-sm">
                  <span className="font-medium">CPI</span>
                  <input value={state.cpi} onChange={(e) => update("cpi", e.target.value)} className="rounded border border-slate-300 px-3 py-2" />
                </label>
                <label className="grid gap-1 text-sm">
                  <span className="font-medium">Segment</span>
                  <input value={state.segment} onChange={(e) => update("segment", e.target.value)} className="rounded border border-slate-300 px-3 py-2" />
                </label>
                <label className="grid gap-1 text-sm md:col-span-2">
                  <span className="font-medium">Survey Link</span>
                  <input value={state.surveyLink} onChange={(e) => update("surveyLink", e.target.value)} className="rounded border border-slate-300 px-3 py-2" />
                </label>
              </div>
            </section>

            <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="mb-3 text-base font-semibold">Add Supplier</h2>
              <div className="grid gap-3 md:grid-cols-3">
                <label className="grid gap-1 text-sm">
                  <span className="font-medium">Name</span>
                  <input value={state.supplierName} onChange={(e) => update("supplierName", e.target.value)} className="rounded border border-slate-300 px-3 py-2" placeholder="Supplier Name" />
                </label>
                <label className="grid gap-1 text-sm">
                  <span className="font-medium">Supplier CPI ($)</span>
                  <input value={state.supplierCpi} onChange={(e) => update("supplierCpi", e.target.value)} className="rounded border border-slate-300 px-3 py-2" />
                </label>
                <label className="grid gap-1 text-sm">
                  <span className="font-medium">Supplier Source URL</span>
                  <input value={state.sourceUrl} onChange={(e) => update("sourceUrl", e.target.value)} className="rounded border border-slate-300 px-3 py-2" placeholder="https://..." />
                </label>
              </div>
            </section>
            <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="mb-3 text-base font-semibold">Research Defender</h2>
              <div className="grid gap-4 md:grid-cols-5">
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={state.rdSearch} onChange={(e) => update("rdSearch", e.target.checked)} /> SEARCH</label>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={state.rdReview} onChange={(e) => update("rdReview", e.target.checked)} /> REVIEW</label>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={state.rdPredupe} onChange={(e) => update("rdPredupe", e.target.checked)} /> PREDUPE</label>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={state.rdActivity} onChange={(e) => update("rdActivity", e.target.checked)} /> ACTIVITY</label>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={state.rdEmailVerify} onChange={(e) => update("rdEmailVerify", e.target.checked)} /> EMAIL VERIFY</label>
              </div>
            </section>

            <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="mb-3 text-base font-semibold">Digital Fingerprinting</h2>
              <div className="grid gap-3 md:grid-cols-4">
                <label className="grid gap-1 text-sm">
                  <span className="font-medium">Speeder Term</span>
                  <select value={state.speederTerm} onChange={(e) => update("speederTerm", e.target.value as OnOff)} className="rounded border border-slate-300 px-3 py-2">
                    <option value="off">Off</option>
                    <option value="on">On</option>
                  </select>
                </label>
                <label className="grid gap-1 text-sm">
                  <span className="font-medium">GEO IP</span>
                  <select value={state.geoIp} onChange={(e) => update("geoIp", e.target.value as OnOff)} className="rounded border border-slate-300 px-3 py-2">
                    <option value="off">Off</option>
                    <option value="on">On</option>
                  </select>
                </label>
                <label className="grid gap-1 text-sm">
                  <span className="font-medium">Duplicate IP</span>
                  <select value={state.duplicateIp} onChange={(e) => update("duplicateIp", e.target.value as OnOff)} className="rounded border border-slate-300 px-3 py-2">
                    <option value="off">Off</option>
                    <option value="on">On</option>
                  </select>
                </label>
                <label className="grid gap-1 text-sm">
                  <span className="font-medium">Pre-screening Captcha</span>
                  <select value={state.preScreeningCaptcha} onChange={(e) => update("preScreeningCaptcha", e.target.value as OnOff)} className="rounded border border-slate-300 px-3 py-2">
                    <option value="off">Off</option>
                    <option value="on">On</option>
                  </select>
                </label>
                <label className="grid gap-1 text-sm">
                  <span className="font-medium">Survalidate</span>
                  <select value={state.survalidate} onChange={(e) => update("survalidate", e.target.value as OnOff)} className="rounded border border-slate-300 px-3 py-2">
                    <option value="off">Off</option>
                    <option value="on">On</option>
                  </select>
                </label>
                <label className="grid gap-1 text-sm">
                  <span className="font-medium">DFIQ Portal</span>
                  <select value={state.dfiqPortal} onChange={(e) => update("dfiqPortal", e.target.value as OnOff)} className="rounded border border-slate-300 px-3 py-2">
                    <option value="off">Off</option>
                    <option value="on">On</option>
                  </select>
                </label>
                <label className="grid gap-1 text-sm">
                  <span className="font-medium">Project Status</span>
                  <select value={state.workflowStatus} onChange={(e) => update("workflowStatus", e.target.value as WorkflowStatus)} className="rounded border border-slate-300 px-3 py-2">
                    {workflowOptions.map((item) => (
                      <option key={item.value} value={item.value}>{item.label}</option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-1 text-sm">
                  <span className="font-medium">Publish Status</span>
                  <select value={state.status} onChange={(e) => update("status", e.target.value as ProjectStatus)} className="rounded border border-slate-300 px-3 py-2">
                    <option value="published">Published</option>
                    <option value="draft">Draft</option>
                  </select>
                </label>
                <label className="grid gap-1 text-sm">
                  <span className="font-medium">Campaign Banner</span>
                  <select value={state.campaignBanner} onChange={(e) => update("campaignBanner", e.target.value as CampaignBanner)} className="rounded border border-slate-300 px-3 py-2">
                    <option value="hide">Hide</option>
                    <option value="show">Show</option>
                  </select>
                </label>
                <label className="grid gap-1 text-sm md:col-span-3">
                  <span className="font-medium">Campaign Banner Status</span>
                  <input value={state.campaignBannerStatus} onChange={(e) => update("campaignBannerStatus", e.target.value)} className="rounded border border-slate-300 px-3 py-2" />
                </label>
              </div>
            </section>

            <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="grid gap-3 md:grid-cols-4">
                <label className="grid gap-1 text-sm">
                  <span className="font-medium">Project Code</span>
                  <input value={state.projectCode} onChange={(e) => update("projectCode", e.target.value)} className="rounded border border-slate-300 px-3 py-2" placeholder="Auto if empty" />
                </label>
                <label className="grid gap-1 text-sm">
                  <span className="font-medium">Platform</span>
                  <select value={state.platform} onChange={(e) => update("platform", e.target.value as ProjectPlatform)} className="rounded border border-slate-300 px-3 py-2">
                    {platformOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="md:col-span-2">
                  <p className="text-sm font-medium">Preview Survey URL</p>
                  <p className="mt-2 rounded border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
                    {surveyUrl ?? "Select survey to preview URL"}
                  </p>
                </div>
              </div>

              {error ? <p className="mt-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
              {success ? <p className="mt-3 rounded bg-green-50 px-3 py-2 text-sm text-green-700">{success}</p> : null}
              {alternateLink ? (
                <p className="mt-3 rounded bg-blue-50 px-3 py-2 text-sm text-blue-700">
                  Alternate link:{" "}
                  <a href={alternateLink} className="font-semibold underline" target="_blank" rel="noreferrer">
                    {alternateLink}
                  </a>
                </p>
              ) : null}

              <div className="mt-4 flex flex-wrap justify-end gap-2">
                {mode === "edit" ? (
                  <button
                    type="button"
                    onClick={() => router.push("/project-details")}
                    className="rounded border border-slate-300 px-4 py-2 text-sm"
                  >
                    Cancel
                  </button>
                ) : null}
                <button type="submit" disabled={saving} className="rounded bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
                  {saving ? "Saving..." : mode === "create" ? "Create Project" : "Update Project"}
                </button>
              </div>
            </section>
          </form>
        )}
      </div>
    </main>
  );
}
