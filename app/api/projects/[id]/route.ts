import { NextRequest, NextResponse } from "next/server";
import { getSessionFromCookieValue, SESSION_COOKIE } from "@/lib/auth";
import { getSupabaseAdmin, hasSupabaseConfig } from "@/lib/supabase-admin";
import { sanitizeText } from "@/lib/sanitize";
import { getLocalProjectById, updateLocalProject } from "@/lib/local-db";
import type { ProjectPlatform, ProjectStatus, WorkflowStatus } from "@/types/project";

type Context = {
  params: Promise<{ id: string }>;
};

type OnOff = "on" | "off";
type CampaignBanner = "hide" | "show";

type Payload = {
  name?: string;
  projectCode?: string;
  surveyName?: string;
  platform?: ProjectPlatform;
  status?: ProjectStatus;
  workflowStatus?: WorkflowStatus;
  sourceUrl?: string;
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
};

const allowedPlatforms = new Set<ProjectPlatform>(["cint", "prime_sample", "other"]);
const allowedStatuses = new Set<ProjectStatus>(["draft", "published"]);
const workflowStatuses = new Set<WorkflowStatus>(["live", "pending", "paused", "ids_awaited"]);
const onOffModes = new Set<OnOff>(["on", "off"]);
const campaignModes = new Set<CampaignBanner>(["hide", "show"]);

function sanitizeNullable(value: unknown, maxLen: number) {
  if (typeof value === "undefined") {
    return undefined;
  }
  const clean = sanitizeText(String(value ?? ""), maxLen);
  return clean || null;
}

function toInt(value: unknown) {
  if (typeof value === "undefined") {
    return undefined;
  }
  if (value === null || value === "") {
    return null;
  }
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function toFloat(value: unknown) {
  if (typeof value === "undefined") {
    return undefined;
  }
  if (value === null || value === "") {
    return null;
  }
  const parsed = Number.parseFloat(String(value));
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeDate(value: unknown) {
  if (typeof value === "undefined") {
    return undefined;
  }
  if (!value) {
    return null;
  }
  const candidate = String(value).trim();
  if (!candidate) {
    return null;
  }
  return /^\d{4}-\d{2}-\d{2}$/.test(candidate) ? candidate : null;
}

function normalizeOnOff(value: unknown) {
  if (typeof value === "undefined") {
    return undefined;
  }
  const candidate = String(value).toLowerCase() as OnOff;
  return onOffModes.has(candidate) ? candidate : undefined;
}

function normalizeCampaignMode(value: unknown) {
  if (typeof value === "undefined") {
    return undefined;
  }
  const candidate = String(value).toLowerCase() as CampaignBanner;
  return campaignModes.has(candidate) ? candidate : undefined;
}

export async function GET(_request: NextRequest, context: Context) {
  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "Project id is required." }, { status: 400 });
  }

  if (!hasSupabaseConfig()) {
    const project = await getLocalProjectById(id);
    if (!project) {
      return NextResponse.json({ error: "Project not found." }, { status: 404 });
    }
    return NextResponse.json({ project });
  }

  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from("projects")
    .select("*, project_links(slug, is_active)")
    .eq("id", id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  return NextResponse.json({ project: data });
}

export async function PATCH(request: NextRequest, context: Context) {
  const session = getSessionFromCookieValue(request.cookies.get(SESSION_COOKIE)?.value);
  if (!session || (session.role !== "admin" && session.role !== "pm")) {
    return NextResponse.json({ error: "Only Admin/PM can edit projects." }, { status: 403 });
  }

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "Project id is required." }, { status: 400 });
  }

  let payload: Payload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  const platform = payload.platform;
  if (platform && !allowedPlatforms.has(platform)) {
    return NextResponse.json({ error: "Invalid platform." }, { status: 400 });
  }

  const status = payload.status;
  if (status && !allowedStatuses.has(status)) {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }

  const workflowStatus = payload.workflowStatus;
  if (workflowStatus && !workflowStatuses.has(workflowStatus)) {
    return NextResponse.json({ error: "Invalid workflow status." }, { status: 400 });
  }

  const patch: Record<string, unknown> = {};

  const name = sanitizeNullable(payload.name, 180);
  if (typeof name !== "undefined" && name) {
    patch.name = name;
  }
  const projectCode = sanitizeNullable(payload.projectCode, 40);
  if (typeof projectCode !== "undefined") {
    patch.project_code = projectCode;
  }
  const surveyName = sanitizeNullable(payload.surveyName, 180);
  if (typeof surveyName !== "undefined") {
    patch.survey_name = surveyName;
  }
  if (platform) {
    patch.platform = platform;
  }
  if (status) {
    patch.status = status;
  }
  if (workflowStatus) {
    patch.workflow_status = workflowStatus;
  }
  const sourceUrl = sanitizeNullable(payload.sourceUrl, 2000);
  if (typeof sourceUrl !== "undefined") {
    patch.source_url = sourceUrl;
  }

  const projectType = sanitizeNullable(payload.projectType, 100);
  if (typeof projectType !== "undefined") {
    patch.project_type = projectType;
  }
  const surveyCategory = sanitizeNullable(payload.surveyCategory, 100);
  if (typeof surveyCategory !== "undefined") {
    patch.survey_category = surveyCategory;
  }
  const projectManager = sanitizeNullable(payload.projectManager, 120);
  if (typeof projectManager !== "undefined") {
    patch.project_manager = projectManager;
  }
  const secondaryProjectManager = sanitizeNullable(payload.secondaryProjectManager, 120);
  if (typeof secondaryProjectManager !== "undefined") {
    patch.secondary_project_manager = secondaryProjectManager;
  }

  const createDate = normalizeDate(payload.createDate);
  if (typeof createDate !== "undefined") {
    patch.create_date = createDate;
  }
  const endDate = normalizeDate(payload.endDate);
  if (typeof endDate !== "undefined") {
    patch.end_date = endDate;
  }

  const preScreening = normalizeOnOff(payload.preScreening);
  if (typeof preScreening !== "undefined") {
    patch.pre_screening = preScreening;
  }
  const aiPreScreeningStatus = normalizeOnOff(payload.aiPreScreeningStatus);
  if (typeof aiPreScreeningStatus !== "undefined") {
    patch.ai_pre_screening_status = aiPreScreeningStatus;
  }

  const numberOfQuestions = toInt(payload.numberOfQuestions);
  if (typeof numberOfQuestions !== "undefined") {
    patch.number_of_questions = numberOfQuestions;
  }

  const clientName = sanitizeNullable(payload.clientName, 120);
  if (typeof clientName !== "undefined") {
    patch.client_name = clientName;
  }
  const salesPerson = sanitizeNullable(payload.salesPerson, 120);
  if (typeof salesPerson !== "undefined") {
    patch.sales_person = salesPerson;
  }
  const clientPoNumber = sanitizeNullable(payload.clientPoNumber, 120);
  if (typeof clientPoNumber !== "undefined") {
    patch.client_po_number = clientPoNumber;
  }
  const variable = sanitizeNullable(payload.variable, 120);
  if (typeof variable !== "undefined") {
    patch.variable = variable;
  }
  const quota = toInt(payload.quota);
  if (typeof quota !== "undefined") {
    patch.quota = quota;
  }
  const country = sanitizeNullable(payload.country, 80);
  if (typeof country !== "undefined") {
    patch.country = country;
  }
  const ir = toFloat(payload.ir);
  if (typeof ir !== "undefined") {
    patch.ir = ir;
  }
  const loi = toInt(payload.loi);
  if (typeof loi !== "undefined") {
    patch.loi = loi;
  }
  const cpi = toFloat(payload.cpi);
  if (typeof cpi !== "undefined") {
    patch.cpi = cpi;
  }
  const segment = sanitizeNullable(payload.segment, 120);
  if (typeof segment !== "undefined") {
    patch.segment = segment;
  }
  const surveyLink = sanitizeNullable(payload.surveyLink, 1000);
  if (typeof surveyLink !== "undefined") {
    patch.survey_link = surveyLink;
  }

  const supplierName = sanitizeNullable(payload.supplierName, 120);
  if (typeof supplierName !== "undefined") {
    patch.supplier_name = supplierName;
  }
  const supplierCpi = toFloat(payload.supplierCpi);
  if (typeof supplierCpi !== "undefined") {
    patch.supplier_cpi = supplierCpi;
  }

  if (typeof payload.rdSearch !== "undefined") {
    patch.rd_search = Boolean(payload.rdSearch);
  }
  if (typeof payload.rdReview !== "undefined") {
    patch.rd_review = Boolean(payload.rdReview);
  }
  if (typeof payload.rdPredupe !== "undefined") {
    patch.rd_predupe = Boolean(payload.rdPredupe);
  }
  if (typeof payload.rdActivity !== "undefined") {
    patch.rd_activity = Boolean(payload.rdActivity);
  }
  if (typeof payload.rdEmailVerify !== "undefined") {
    patch.rd_email_verify = Boolean(payload.rdEmailVerify);
  }

  const speederTerm = normalizeOnOff(payload.speederTerm);
  if (typeof speederTerm !== "undefined") {
    patch.speeder_term = speederTerm;
  }
  const geoIp = normalizeOnOff(payload.geoIp);
  if (typeof geoIp !== "undefined") {
    patch.geo_ip = geoIp;
  }
  const duplicateIp = normalizeOnOff(payload.duplicateIp);
  if (typeof duplicateIp !== "undefined") {
    patch.duplicate_ip = duplicateIp;
  }
  const preScreeningCaptcha = normalizeOnOff(payload.preScreeningCaptcha);
  if (typeof preScreeningCaptcha !== "undefined") {
    patch.pre_screening_captcha = preScreeningCaptcha;
  }
  const survalidate = normalizeOnOff(payload.survalidate);
  if (typeof survalidate !== "undefined") {
    patch.survalidate = survalidate;
  }
  const dfiqPortal = normalizeOnOff(payload.dfiqPortal);
  if (typeof dfiqPortal !== "undefined") {
    patch.dfiq_portal = dfiqPortal;
  }

  const campaignBanner = normalizeCampaignMode(payload.campaignBanner);
  if (typeof campaignBanner !== "undefined") {
    patch.campaign_banner = campaignBanner;
  }
  const campaignBannerStatus = sanitizeNullable(payload.campaignBannerStatus, 250);
  if (typeof campaignBannerStatus !== "undefined") {
    patch.campaign_banner_status = campaignBannerStatus;
  }

  patch.updated_at = new Date().toISOString();

  if (Object.keys(patch).length === 1 && "updated_at" in patch) {
    return NextResponse.json({ error: "No changes provided." }, { status: 400 });
  }

  if (!hasSupabaseConfig()) {
    const updated = await updateLocalProject({
      id,
      name: typeof patch.name === "string" ? patch.name : undefined,
      projectCode: (patch.project_code as string | null | undefined),
      surveyName: (patch.survey_name as string | null | undefined),
      platform: patch.platform as ProjectPlatform | undefined,
      status: patch.status as ProjectStatus | undefined,
      workflowStatus: patch.workflow_status as WorkflowStatus | undefined,
      sourceUrl: (patch.source_url as string | null | undefined),
      projectType: (patch.project_type as string | null | undefined),
      surveyCategory: (patch.survey_category as string | null | undefined),
      projectManager: (patch.project_manager as string | null | undefined),
      secondaryProjectManager: (patch.secondary_project_manager as string | null | undefined),
      createDate: (patch.create_date as string | null | undefined),
      endDate: (patch.end_date as string | null | undefined),
      preScreening: (patch.pre_screening as OnOff | null | undefined),
      aiPreScreeningStatus: (patch.ai_pre_screening_status as OnOff | null | undefined),
      numberOfQuestions: (patch.number_of_questions as number | null | undefined),
      clientName: (patch.client_name as string | null | undefined),
      salesPerson: (patch.sales_person as string | null | undefined),
      clientPoNumber: (patch.client_po_number as string | null | undefined),
      variable: (patch.variable as string | null | undefined),
      quota: (patch.quota as number | null | undefined),
      country: (patch.country as string | null | undefined),
      ir: (patch.ir as number | null | undefined),
      loi: (patch.loi as number | null | undefined),
      cpi: (patch.cpi as number | null | undefined),
      segment: (patch.segment as string | null | undefined),
      surveyLink: (patch.survey_link as string | null | undefined),
      supplierName: (patch.supplier_name as string | null | undefined),
      supplierCpi: (patch.supplier_cpi as number | null | undefined),
      rdSearch: (patch.rd_search as boolean | undefined),
      rdReview: (patch.rd_review as boolean | undefined),
      rdPredupe: (patch.rd_predupe as boolean | undefined),
      rdActivity: (patch.rd_activity as boolean | undefined),
      rdEmailVerify: (patch.rd_email_verify as boolean | undefined),
      speederTerm: (patch.speeder_term as OnOff | undefined),
      geoIp: (patch.geo_ip as OnOff | undefined),
      duplicateIp: (patch.duplicate_ip as OnOff | undefined),
      preScreeningCaptcha: (patch.pre_screening_captcha as OnOff | undefined),
      survalidate: (patch.survalidate as OnOff | undefined),
      dfiqPortal: (patch.dfiq_portal as OnOff | undefined),
      campaignBanner: (patch.campaign_banner as CampaignBanner | undefined),
      campaignBannerStatus: (patch.campaign_banner_status as string | null | undefined),
    });
    if (!updated) {
      return NextResponse.json({ error: "Project not found." }, { status: 404 });
    }
    return NextResponse.json({ success: true, project: updated });
  }

  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from("projects")
    .update(patch)
    .eq("id", id)
    .select("*, project_links(slug, is_active)")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Failed to update project." }, { status: 500 });
  }

  return NextResponse.json({ success: true, project: data });
}
