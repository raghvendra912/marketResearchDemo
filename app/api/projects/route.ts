import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin, hasSupabaseConfig } from "@/lib/supabase-admin";
import { createSlug, extractSurveyId } from "@/lib/survey-link";
import { sanitizeText } from "@/lib/sanitize";
import { isRateLimited } from "@/lib/rate-limit";
import type { ProjectPlatform, ProjectStatus, WorkflowStatus } from "@/types/project";
import { createLocalProject, getLocalProjects, slugExists } from "@/lib/local-db";
import { getSessionFromCookieValue, SESSION_COOKIE } from "@/lib/auth";

type OnOff = "on" | "off";
type CampaignBanner = "hide" | "show";

type CreateProjectPayload = {
  name?: string;
  surveyName?: string;
  surveyInput?: string;
  surveyId?: string;
  platform?: ProjectPlatform;
  sourceUrl?: string;
  status?: ProjectStatus;
  workflowStatus?: WorkflowStatus;
  projectType?: string;
  surveyCategory?: string;
  projectManager?: string;
  secondaryProjectManager?: string;
  createDate?: string;
  endDate?: string;
  preScreening?: OnOff;
  aiPreScreeningStatus?: OnOff;
  numberOfQuestions?: number | string;
  clientName?: string;
  salesPerson?: string;
  clientPoNumber?: string;
  variable?: string;
  quota?: number | string;
  country?: string;
  ir?: number | string;
  loi?: number | string;
  cpi?: number | string;
  segment?: string;
  surveyLink?: string;
  supplierName?: string;
  supplierCpi?: number | string;
  rdSearch?: boolean;
  rdReview?: boolean;
  rdPredupe?: boolean;
  rdActivity?: boolean;
  rdEmailVerify?: boolean;
  speederTerm?: OnOff;
  geoIp?: OnOff;
  duplicateIp?: OnOff;
  preScreeningCaptcha?: OnOff;
  survalidate?: OnOff;
  dfiqPortal?: OnOff;
  campaignBanner?: CampaignBanner;
  campaignBannerStatus?: string;
  projectCode?: string;
};

type NormalizedProjectPayload = {
  name: string;
  surveyName: string | null;
  surveyId: string;
  platform: ProjectPlatform;
  sourceUrl: string | null;
  status: ProjectStatus;
  workflowStatus: WorkflowStatus;
  projectType: string | null;
  surveyCategory: string | null;
  projectManager: string | null;
  secondaryProjectManager: string | null;
  createDate: string | null;
  endDate: string | null;
  preScreening: OnOff;
  aiPreScreeningStatus: OnOff;
  numberOfQuestions: number | null;
  clientName: string | null;
  salesPerson: string | null;
  clientPoNumber: string | null;
  variable: string | null;
  quota: number | null;
  country: string | null;
  ir: number | null;
  loi: number | null;
  cpi: number | null;
  segment: string | null;
  surveyLink: string | null;
  supplierName: string | null;
  supplierCpi: number | null;
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
  campaignBannerStatus: string | null;
  projectCode: string | null;
};

const supportedPlatforms = new Set<ProjectPlatform>(["cint", "prime_sample", "other"]);
const supportedStatuses = new Set<ProjectStatus>(["draft", "published"]);
const workflowStatuses = new Set<WorkflowStatus>(["live", "pending", "paused", "ids_awaited"]);
const onOffModes = new Set<OnOff>(["on", "off"]);
const campaignModes = new Set<CampaignBanner>(["hide", "show"]);

function sanitizeNullable(value: unknown, maxLen: number) {
  const clean = sanitizeText(String(value ?? ""), maxLen);
  return clean || null;
}

function toInt(value: unknown) {
  if (value === null || typeof value === "undefined" || value === "") {
    return null;
  }
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function toFloat(value: unknown) {
  if (value === null || typeof value === "undefined" || value === "") {
    return null;
  }
  const parsed = Number.parseFloat(String(value));
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeDate(value: unknown) {
  if (!value) {
    return null;
  }
  const candidate = String(value).trim();
  if (!candidate) {
    return null;
  }
  const valid = /^\d{4}-\d{2}-\d{2}$/.test(candidate);
  return valid ? candidate : null;
}

function normalizeOnOff(value: unknown, fallback: OnOff): OnOff {
  const candidate = String(value ?? "").toLowerCase() as OnOff;
  if (onOffModes.has(candidate)) {
    return candidate;
  }
  return fallback;
}

function normalizeCampaignMode(value: unknown): CampaignBanner {
  const candidate = String(value ?? "").toLowerCase() as CampaignBanner;
  if (campaignModes.has(candidate)) {
    return candidate;
  }
  return "hide";
}

function generateProjectCode() {
  const datePart = new Date().toISOString().slice(2, 10).replace(/-/g, "");
  const suffix = Math.floor(100 + Math.random() * 900);
  return `QLB-${datePart}${suffix}`;
}

function normalizePayload(payload: CreateProjectPayload): { data?: NormalizedProjectPayload; error?: string } {
  const name = sanitizeText(String(payload.name ?? payload.surveyName ?? ""), 180);
  if (!name) {
    return { error: "Survey name is required." };
  }

  const platform = (payload.platform ?? "other") as ProjectPlatform;
  if (!supportedPlatforms.has(platform)) {
    return { error: "Unsupported platform." };
  }

  const status = (payload.status ?? "published") as ProjectStatus;
  if (!supportedStatuses.has(status)) {
    return { error: "Invalid publish status." };
  }

  const workflowStatus = (payload.workflowStatus ?? "live") as WorkflowStatus;
  if (!workflowStatuses.has(workflowStatus)) {
    return { error: "Invalid workflow status." };
  }

  const surveyInput = sanitizeText(String(payload.surveyInput ?? payload.surveyId ?? payload.surveyLink ?? ""), 1000);
  const surveyId = extractSurveyId(surveyInput);
  if (!surveyId) {
    return {
      error: "Provide a valid survey UUID or survey URL ending with /s/<surveyId>.",
    };
  }

  const createDate = normalizeDate(payload.createDate);
  const endDate = normalizeDate(payload.endDate);
  if (createDate && endDate && createDate > endDate) {
    return { error: "End date must be on or after create date." };
  }

  const numberOfQuestions = toInt(payload.numberOfQuestions);
  if (numberOfQuestions !== null && numberOfQuestions < 0) {
    return { error: "Number of questions cannot be negative." };
  }

  const quota = toInt(payload.quota);
  if (quota !== null && quota < 0) {
    return { error: "Quota cannot be negative." };
  }

  const loi = toInt(payload.loi);
  if (loi !== null && loi < 0) {
    return { error: "LOI cannot be negative." };
  }

  const ir = toFloat(payload.ir);
  if (ir !== null && (ir < 0 || ir > 100)) {
    return { error: "IR must be between 0 and 100." };
  }

  const cpi = toFloat(payload.cpi);
  if (cpi !== null && cpi < 0) {
    return { error: "CPI cannot be negative." };
  }

  const supplierCpi = toFloat(payload.supplierCpi);
  if (supplierCpi !== null && supplierCpi < 0) {
    return { error: "Supplier CPI cannot be negative." };
  }

  return {
    data: {
      name,
      surveyName: sanitizeNullable(payload.surveyName ?? payload.name, 180),
      surveyId,
      platform,
      sourceUrl: sanitizeNullable(payload.sourceUrl, 2000),
      status,
      workflowStatus,
      projectType: sanitizeNullable(payload.projectType, 100),
      surveyCategory: sanitizeNullable(payload.surveyCategory, 100),
      projectManager: sanitizeNullable(payload.projectManager, 120),
      secondaryProjectManager: sanitizeNullable(payload.secondaryProjectManager, 120),
      createDate,
      endDate,
      preScreening: normalizeOnOff(payload.preScreening, "off"),
      aiPreScreeningStatus: normalizeOnOff(payload.aiPreScreeningStatus, "off"),
      numberOfQuestions,
      clientName: sanitizeNullable(payload.clientName, 120),
      salesPerson: sanitizeNullable(payload.salesPerson, 120),
      clientPoNumber: sanitizeNullable(payload.clientPoNumber, 120),
      variable: sanitizeNullable(payload.variable, 120),
      quota,
      country: sanitizeNullable(payload.country, 80),
      ir,
      loi,
      cpi,
      segment: sanitizeNullable(payload.segment, 80),
      surveyLink: sanitizeNullable(payload.surveyLink, 1000),
      supplierName: sanitizeNullable(payload.supplierName, 120),
      supplierCpi,
      rdSearch: Boolean(payload.rdSearch),
      rdReview: Boolean(payload.rdReview),
      rdPredupe: Boolean(payload.rdPredupe),
      rdActivity: Boolean(payload.rdActivity),
      rdEmailVerify: Boolean(payload.rdEmailVerify),
      speederTerm: normalizeOnOff(payload.speederTerm, "off"),
      geoIp: normalizeOnOff(payload.geoIp, "off"),
      duplicateIp: normalizeOnOff(payload.duplicateIp, "off"),
      preScreeningCaptcha: normalizeOnOff(payload.preScreeningCaptcha, "off"),
      survalidate: normalizeOnOff(payload.survalidate, "off"),
      dfiqPortal: normalizeOnOff(payload.dfiqPortal, "off"),
      campaignBanner: normalizeCampaignMode(payload.campaignBanner),
      campaignBannerStatus: sanitizeNullable(payload.campaignBannerStatus, 250),
      projectCode: sanitizeNullable(payload.projectCode, 40) ?? generateProjectCode(),
    },
  };
}

async function createUniqueSlug(supabaseAdmin: ReturnType<typeof getSupabaseAdmin>): Promise<string> {
  let attempts = 0;
  while (attempts < 10) {
    const slug = createSlug(8);
    const { data } = await supabaseAdmin.from("project_links").select("slug").eq("slug", slug).maybeSingle();
    if (!data) {
      return slug;
    }
    attempts += 1;
  }

  throw new Error("Could not generate unique slug.");
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams;
  const client = sanitizeText(query.get("client") ?? "", 120);
  const projectManager = sanitizeText(query.get("projectManager") ?? "", 120);
  const projectName = sanitizeText(query.get("projectName") ?? "", 180);
  const projectCode = sanitizeText(query.get("projectCode") ?? "", 60);
  const statusesRaw = sanitizeText(query.get("statuses") ?? "", 200);
  const statuses = statusesRaw
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter((value): value is WorkflowStatus => workflowStatuses.has(value as WorkflowStatus));

  if (!hasSupabaseConfig()) {
    const projects = await getLocalProjects();
    const filtered = projects.filter((project) => {
      if (client && (project.client_name ?? "").toLowerCase() !== client.toLowerCase()) {
        return false;
      }
      if (projectManager && !(project.project_manager ?? "").toLowerCase().includes(projectManager.toLowerCase())) {
        return false;
      }
      if (projectName && !(project.name ?? "").toLowerCase().includes(projectName.toLowerCase())) {
        return false;
      }
      if (projectCode && !(project.project_code ?? "").toLowerCase().includes(projectCode.toLowerCase())) {
        return false;
      }
      if (statuses.length > 0 && !statuses.includes(project.workflow_status)) {
        return false;
      }
      return true;
    });
    return NextResponse.json({ projects: filtered });
  }

  const supabaseAdmin = getSupabaseAdmin();
  let requestBuilder = supabaseAdmin
    .from("projects")
    .select("*, project_links(slug, is_active)")
    .order("created_at", { ascending: false })
    .limit(300);

  if (client) {
    requestBuilder = requestBuilder.eq("client_name", client);
  }
  if (projectManager) {
    requestBuilder = requestBuilder.ilike("project_manager", `%${projectManager}%`);
  }
  if (projectName) {
    requestBuilder = requestBuilder.ilike("name", `%${projectName}%`);
  }
  if (projectCode) {
    requestBuilder = requestBuilder.ilike("project_code", `%${projectCode}%`);
  }
  if (statuses.length > 0) {
    requestBuilder = requestBuilder.in("workflow_status", statuses);
  }

  const { data, error } = await requestBuilder;
  if (error) {
    return NextResponse.json({ error: "Failed to load projects." }, { status: 500 });
  }

  return NextResponse.json({ projects: data ?? [] });
}

export async function POST(request: NextRequest) {
  const session = getSessionFromCookieValue(request.cookies.get(SESSION_COOKIE)?.value);
  if (!session || (session.role !== "admin" && session.role !== "pm")) {
    return NextResponse.json({ error: "You do not have permission to create projects." }, { status: 403 });
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const { limited, retryAfterSec } = isRateLimited(`projects:${ip}`, 30, 60_000);

  if (limited) {
    return NextResponse.json(
      { error: "Too many project requests. Try again shortly." },
      { status: 429, headers: { "Retry-After": String(retryAfterSec) } },
    );
  }

  let payload: CreateProjectPayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const normalized = normalizePayload(payload);
  if (!normalized.data) {
    return NextResponse.json({ error: normalized.error ?? "Invalid project data." }, { status: 400 });
  }

  const data = normalized.data;

  if (!hasSupabaseConfig()) {
    let slug = "";
    let attempts = 0;
    while (attempts < 10) {
      const candidate = createSlug(8);
      const exists = await slugExists(candidate);
      if (!exists) {
        slug = candidate;
        break;
      }
      attempts += 1;
    }

    if (!slug) {
      return NextResponse.json({ error: "Failed to create unique link slug." }, { status: 500 });
    }

    const localResult = await createLocalProject({
      name: data.name,
      surveyId: data.surveyId,
      platform: data.platform,
      sourceUrl: data.sourceUrl,
      slug,
      status: data.status,
      projectCode: data.projectCode,
      surveyName: data.surveyName,
      workflowStatus: data.workflowStatus,
      projectType: data.projectType,
      surveyCategory: data.surveyCategory,
      projectManager: data.projectManager,
      secondaryProjectManager: data.secondaryProjectManager,
      createDate: data.createDate,
      endDate: data.endDate,
      preScreening: data.preScreening,
      aiPreScreeningStatus: data.aiPreScreeningStatus,
      numberOfQuestions: data.numberOfQuestions,
      clientName: data.clientName,
      salesPerson: data.salesPerson,
      clientPoNumber: data.clientPoNumber,
      variable: data.variable,
      quota: data.quota,
      country: data.country,
      ir: data.ir,
      loi: data.loi,
      cpi: data.cpi,
      segment: data.segment,
      surveyLink: data.surveyLink,
      supplierName: data.supplierName,
      supplierCpi: data.supplierCpi,
      rdSearch: data.rdSearch,
      rdReview: data.rdReview,
      rdPredupe: data.rdPredupe,
      rdActivity: data.rdActivity,
      rdEmailVerify: data.rdEmailVerify,
      speederTerm: data.speederTerm,
      geoIp: data.geoIp,
      duplicateIp: data.duplicateIp,
      preScreeningCaptcha: data.preScreeningCaptcha,
      survalidate: data.survalidate,
      dfiqPortal: data.dfiqPortal,
      campaignBanner: data.campaignBanner,
      campaignBannerStatus: data.campaignBannerStatus,
    });

    if ("error" in localResult) {
      return NextResponse.json({ error: localResult.error }, { status: 404 });
    }

    return NextResponse.json(
      {
        success: true,
        project: localResult.project,
        alternateLink: `${request.nextUrl.origin}/l/${slug}`,
      },
      { status: 201 },
    );
  }

  const supabaseAdmin = getSupabaseAdmin();
  const { data: survey, error: surveyError } = await supabaseAdmin
    .from("surveys")
    .select("id, is_published")
    .eq("id", data.surveyId)
    .single();

  if (surveyError || !survey) {
    return NextResponse.json({ error: "Survey not found." }, { status: 404 });
  }

  if (!survey.is_published) {
    return NextResponse.json({ error: "Survey is not published." }, { status: 400 });
  }

  const now = new Date().toISOString();

  const { data: project, error: projectError } = await supabaseAdmin
    .from("projects")
    .insert({
      project_code: data.projectCode,
      name: data.name,
      survey_name: data.surveyName ?? data.name,
      survey_id: data.surveyId,
      platform: data.platform,
      source_url: data.sourceUrl,
      status: data.status,
      workflow_status: data.workflowStatus,
      project_type: data.projectType,
      survey_category: data.surveyCategory,
      project_manager: data.projectManager,
      secondary_project_manager: data.secondaryProjectManager,
      create_date: data.createDate,
      end_date: data.endDate,
      pre_screening: data.preScreening,
      ai_pre_screening_status: data.aiPreScreeningStatus,
      number_of_questions: data.numberOfQuestions,
      client_name: data.clientName,
      sales_person: data.salesPerson,
      client_po_number: data.clientPoNumber,
      variable: data.variable,
      quota: data.quota,
      country: data.country,
      ir: data.ir,
      loi: data.loi,
      cpi: data.cpi,
      segment: data.segment,
      survey_link: data.surveyLink,
      supplier_name: data.supplierName,
      supplier_cpi: data.supplierCpi,
      rd_search: data.rdSearch,
      rd_review: data.rdReview,
      rd_predupe: data.rdPredupe,
      rd_activity: data.rdActivity,
      rd_email_verify: data.rdEmailVerify,
      speeder_term: data.speederTerm,
      geo_ip: data.geoIp,
      duplicate_ip: data.duplicateIp,
      pre_screening_captcha: data.preScreeningCaptcha,
      survalidate: data.survalidate,
      dfiq_portal: data.dfiqPortal,
      campaign_banner: data.campaignBanner,
      campaign_banner_status: data.campaignBannerStatus,
      updated_at: now,
    })
    .select("*, project_links(slug, is_active)")
    .single();

  if (projectError || !project) {
    return NextResponse.json({ error: "Failed to create project." }, { status: 500 });
  }

  try {
    const slug = await createUniqueSlug(supabaseAdmin);
    const { error: linkError } = await supabaseAdmin.from("project_links").insert({
      project_id: project.id,
      slug,
      is_active: true,
    });

    if (linkError) {
      await supabaseAdmin.from("projects").delete().eq("id", project.id);
      return NextResponse.json({ error: "Failed to create alternate link." }, { status: 500 });
    }

    const origin = request.nextUrl.origin;
    return NextResponse.json(
      {
        success: true,
        project,
        alternateLink: `${origin}/l/${slug}`,
      },
      { status: 201 },
    );
  } catch {
    await supabaseAdmin.from("projects").delete().eq("id", project.id);
    return NextResponse.json({ error: "Failed to create unique link slug." }, { status: 500 });
  }
}
