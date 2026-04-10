import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { ProjectPlatform } from "@/types/project";
import type { QuestionType } from "@/types/survey";
import type { UserRole } from "@/lib/auth";
import { getSupabaseAdmin, hasSupabaseConfig } from "@/lib/supabase-admin";

type LocalSurvey = {
  id: string;
  title: string;
  created_at: string;
  is_published: boolean;
};

type LocalQuestion = {
  id: string;
  survey_id: string;
  text: string;
  type: QuestionType;
  is_required: boolean;
  options: string[] | null;
  order_index: number;
};

type LocalProject = {
  id: string;
  project_code: string | null;
  name: string;
  survey_name: string | null;
  survey_id: string;
  platform: ProjectPlatform;
  source_url: string | null;
  status: "draft" | "published";
  workflow_status: "live" | "pending" | "paused" | "ids_awaited";
  project_type: string | null;
  survey_category: string | null;
  project_manager: string | null;
  secondary_project_manager: string | null;
  create_date: string | null;
  end_date: string | null;
  pre_screening: "on" | "off" | null;
  ai_pre_screening_status: "on" | "off" | null;
  number_of_questions: number | null;
  client_name: string | null;
  sales_person: string | null;
  client_po_number: string | null;
  variable: string | null;
  quota: number | null;
  country: string | null;
  ir: number | null;
  loi: number | null;
  cpi: number | null;
  segment: string | null;
  survey_link: string | null;
  supplier_name: string | null;
  supplier_cpi: number | null;
  rd_search: boolean;
  rd_review: boolean;
  rd_predupe: boolean;
  rd_activity: boolean;
  rd_email_verify: boolean;
  speeder_term: "on" | "off";
  geo_ip: "on" | "off";
  duplicate_ip: "on" | "off";
  pre_screening_captcha: "on" | "off";
  survalidate: "on" | "off";
  dfiq_portal: "on" | "off";
  campaign_banner: "hide" | "show";
  campaign_banner_status: string | null;
  created_at: string;
  updated_at: string | null;
};

type LocalProjectLink = {
  id: string;
  project_id: string;
  slug: string;
  is_active: boolean;
  created_at: string;
};

type LocalResponse = {
  id: string;
  survey_id: string;
  project_id: string | null;
  created_at: string;
};

type LocalAnswer = {
  id: string;
  response_id: string;
  question_id: string;
  value: string;
  created_at: string;
};

type LocalLinkVisit = {
  id: string;
  project_link_id: string;
  ip_address: string | null;
  user_agent: string | null;
  referer: string | null;
  created_at: string;
};

type LocalDb = {
  surveys: LocalSurvey[];
  questions: LocalQuestion[];
  projects: LocalProject[];
  project_links: LocalProjectLink[];
  responses: LocalResponse[];
  answers: LocalAnswer[];
  link_visits: LocalLinkVisit[];
  feedback_items: LocalFeedbackItem[];
  users: LocalUser[];
};

type FeedbackStatus = "open" | "planned" | "in_progress" | "done";

type LocalFeedbackItem = {
  id: string;
  page: string;
  feature_position: string | null;
  feature_title: string;
  current_behavior: string;
  expected_behavior: string;
  impact: string;
  status: FeedbackStatus;
  created_by_name: string;
  created_by_email: string;
  created_by_role: UserRole;
  developer_note: string | null;
  updated_by_name: string | null;
  agent_requested: boolean;
  agent_request_note: string | null;
  agent_approved: boolean;
  agent_approval_comment: string | null;
  agent_approved_by_name: string | null;
  agent_run_status: "idle" | "queued" | "running" | "done" | "failed";
  agent_run_log: string | null;
  created_at: string;
  updated_at: string;
};

type LocalUser = {
  id: string;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  created_at: string;
};

type DbFeedbackStatus = "open" | "planned" | "in_progress" | "done";
type DbAgentRunStatus = "idle" | "queued" | "running" | "done" | "failed";

const demoUsersSeed: Array<{ name: string; email: string; password: string; role: UserRole }> = [
  { name: "Raghvendra", email: "raghvendra@vaultlocal.com", password: "Admin@123", role: "admin" },
  { name: "Amrit", email: "amrit@vaultlocal.com", password: "Pm@123", role: "pm" },
  { name: "Anubhav", email: "anubhav@vaultlocal.com", password: "Sales@123", role: "sales" },
  { name: "Himanshu", email: "himanshu@vaultlocal.com", password: "himanshu@123", role: "sales" },
  { name: "Demo User", email: "demo@vaultlocal.com", password: "Demo@123", role: "sales" },
  
];

const dbDir = path.join(process.cwd(), "data");
const dbPath = path.join(dbDir, "local-db.json");
let volatileDb: LocalDb | null = null;

const demoSurveyId = "11111111-1111-4111-8111-111111111111";

function generateProjectCode() {
  const stamp = new Date().toISOString().slice(2, 10).replace(/-/g, "");
  const random = Math.floor(100 + Math.random() * 900);
  return `QLB-${stamp}${random}`;
}

function normalizeLocalProject(project: LocalProject): LocalProject {
  return {
    ...project,
    project_code: project.project_code ?? generateProjectCode(),
    survey_name: project.survey_name ?? project.name,
    workflow_status: project.workflow_status ?? "live",
    project_type: project.project_type ?? "consumer",
    survey_category: project.survey_category ?? "general",
    project_manager: project.project_manager ?? "AR",
    secondary_project_manager: project.secondary_project_manager ?? null,
    create_date: project.create_date ?? project.created_at.slice(0, 10),
    end_date: project.end_date ?? null,
    pre_screening: project.pre_screening ?? "off",
    ai_pre_screening_status: project.ai_pre_screening_status ?? "off",
    number_of_questions: project.number_of_questions ?? null,
    client_name: project.client_name ?? null,
    sales_person: project.sales_person ?? null,
    client_po_number: project.client_po_number ?? null,
    variable: project.variable ?? null,
    quota: typeof project.quota === "number" ? project.quota : null,
    country: project.country ?? null,
    ir: typeof project.ir === "number" ? project.ir : null,
    loi: typeof project.loi === "number" ? project.loi : null,
    cpi: typeof project.cpi === "number" ? project.cpi : null,
    segment: project.segment ?? null,
    survey_link: project.survey_link ?? null,
    supplier_name: project.supplier_name ?? null,
    supplier_cpi: typeof project.supplier_cpi === "number" ? project.supplier_cpi : null,
    rd_search: Boolean(project.rd_search),
    rd_review: Boolean(project.rd_review),
    rd_predupe: Boolean(project.rd_predupe),
    rd_activity: Boolean(project.rd_activity),
    rd_email_verify: Boolean(project.rd_email_verify),
    speeder_term: project.speeder_term ?? "off",
    geo_ip: project.geo_ip ?? "off",
    duplicate_ip: project.duplicate_ip ?? "off",
    pre_screening_captcha: project.pre_screening_captcha ?? "off",
    survalidate: project.survalidate ?? "off",
    dfiq_portal: project.dfiq_portal ?? "off",
    campaign_banner: project.campaign_banner ?? "hide",
    campaign_banner_status: project.campaign_banner_status ?? "Complete, Terminate, Quota-Full",
    updated_at: project.updated_at ?? null,
  };
}

function getSeedUsers(createdAt: string): LocalUser[] {
  return demoUsersSeed.map((user) => ({
    id: randomUUID(),
    name: user.name,
    email: user.email,
    password: user.password,
    role: user.role,
    created_at: createdAt,
  }));
}

function seedDb(): LocalDb {
  const now = new Date().toISOString();
  const projectId = randomUUID();
  return {
    surveys: [
      {
        id: demoSurveyId,
        title: "General Population Demo Survey",
        created_at: now,
        is_published: true,
      },
    ],
    questions: [
      {
        id: randomUUID(),
        survey_id: demoSurveyId,
        text: "What is your age?",
        type: "number",
        is_required: true,
        options: null,
        order_index: 1,
      },
      {
        id: randomUUID(),
        survey_id: demoSurveyId,
        text: "What is your gender?",
        type: "multiple-choice",
        is_required: true,
        options: ["Male", "Female", "Non-binary", "Prefer not to say"],
        order_index: 2,
      },
      {
        id: randomUUID(),
        survey_id: demoSurveyId,
        text: "Which city do you live in?",
        type: "text",
        is_required: true,
        options: null,
        order_index: 3,
      },
      {
        id: randomUUID(),
        survey_id: demoSurveyId,
        text: "Any additional feedback?",
        type: "textarea",
        is_required: false,
        options: null,
        order_index: 4,
      },
    ],
    projects: [
      {
        id: projectId,
        project_code: "QLB-00012026",
        name: "Demo GenPop - Cint",
        survey_name: "Demo GenPop - Cint",
        survey_id: demoSurveyId,
        platform: "cint",
        source_url: null,
        status: "published",
        workflow_status: "live",
        project_type: "consumer",
        survey_category: "genpop",
        project_manager: "AR",
        secondary_project_manager: null,
        create_date: now.slice(0, 10),
        end_date: null,
        pre_screening: "off",
        ai_pre_screening_status: "off",
        number_of_questions: 4,
        client_name: "IPS",
        sales_person: "AR",
        client_po_number: "25-034941-01-06",
        variable: null,
        quota: 999,
        country: "US",
        ir: 45,
        loi: 10,
        cpi: 7,
        segment: null,
        survey_link: null,
        supplier_name: "Cint",
        supplier_cpi: 7,
        rd_search: false,
        rd_review: false,
        rd_predupe: false,
        rd_activity: false,
        rd_email_verify: false,
        speeder_term: "off",
        geo_ip: "off",
        duplicate_ip: "off",
        pre_screening_captcha: "off",
        survalidate: "off",
        dfiq_portal: "off",
        campaign_banner: "hide",
        campaign_banner_status: "Complete, Terminate, Quota-Full",
        created_at: now,
        updated_at: now,
      },
    ],
    project_links: [
      {
        id: randomUUID(),
        project_id: projectId,
        slug: "genpop01",
        is_active: true,
        created_at: now,
      },
    ],
    responses: [],
    answers: [],
    link_visits: [],
    feedback_items: [],
    users: getSeedUsers(now),
  };
}

async function ensureDb() {
  await mkdir(dbDir, { recursive: true });
  try {
    await readFile(dbPath, "utf8");
  } catch {
    const initial = seedDb();
    await writeFile(dbPath, JSON.stringify(initial, null, 2), "utf8");
  }
}

async function readDb(): Promise<LocalDb> {
  if (volatileDb) {
    return volatileDb;
  }

  await ensureDb();
  try {
    const content = await readFile(dbPath, "utf8");
    const parsed = JSON.parse(content) as Partial<LocalDb>;
    const feedbackItems = (parsed.feedback_items ?? []).map((item) => ({
      ...item,
      feature_position: item.feature_position ?? null,
      agent_requested: item.agent_requested ?? false,
      agent_request_note: item.agent_request_note ?? null,
      agent_approved: item.agent_approved ?? false,
      agent_approval_comment: item.agent_approval_comment ?? null,
      agent_approved_by_name: item.agent_approved_by_name ?? null,
      agent_run_status: item.agent_run_status ?? "idle",
      agent_run_log: item.agent_run_log ?? null,
    }));
    const users = parsed.users && parsed.users.length > 0 ? parsed.users : getSeedUsers(new Date().toISOString());
    const db: LocalDb = {
      surveys: parsed.surveys ?? [],
      questions: parsed.questions ?? [],
      projects: (parsed.projects ?? []).map((project) => normalizeLocalProject(project as LocalProject)),
      project_links: parsed.project_links ?? [],
      responses: parsed.responses ?? [],
      answers: parsed.answers ?? [],
      link_visits: parsed.link_visits ?? [],
      feedback_items: feedbackItems,
      users,
    };
    const needsMigration =
      !Array.isArray(parsed.feedback_items) ||
      !Array.isArray(parsed.users) ||
      parsed.users.length === 0 ||
      (parsed.projects ?? []).some((project) => {
        const entry = project as Partial<LocalProject>;
        return !entry.project_code || !entry.workflow_status;
      });
    if (needsMigration) {
      await writeFile(dbPath, JSON.stringify(db, null, 2), "utf8");
    }
    return db;
  } catch {
    volatileDb = seedDb();
    return volatileDb;
  }
}

async function writeDb(db: LocalDb) {
  try {
    await writeFile(dbPath, JSON.stringify(db, null, 2), "utf8");
    volatileDb = null;
  } catch {
    volatileDb = db;
  }
}

function mapFeedbackRow(row: Record<string, unknown>): LocalFeedbackItem {
  return {
    id: String(row.id ?? ""),
    page: String(row.page ?? ""),
    feature_position: (row.feature_position as string | null) ?? null,
    feature_title: String(row.feature_title ?? ""),
    current_behavior: String(row.current_behavior ?? ""),
    expected_behavior: String(row.expected_behavior ?? ""),
    impact: String(row.impact ?? ""),
    status: (row.status as FeedbackStatus) ?? "open",
    created_by_name: String(row.created_by_name ?? ""),
    created_by_email: String(row.created_by_email ?? ""),
    created_by_role: (row.created_by_role as UserRole) ?? "sales",
    developer_note: (row.developer_note as string | null) ?? null,
    updated_by_name: (row.updated_by_name as string | null) ?? null,
    agent_requested: Boolean(row.agent_requested ?? false),
    agent_request_note: (row.agent_request_note as string | null) ?? null,
    agent_approved: Boolean(row.agent_approved ?? false),
    agent_approval_comment: (row.agent_approval_comment as string | null) ?? null,
    agent_approved_by_name: (row.agent_approved_by_name as string | null) ?? null,
    agent_run_status: (row.agent_run_status as LocalFeedbackItem["agent_run_status"]) ?? "idle",
    agent_run_log: (row.agent_run_log as string | null) ?? null,
    created_at: String(row.created_at ?? new Date().toISOString()),
    updated_at: String(row.updated_at ?? new Date().toISOString()),
  };
}

function mapUserRow(row: Record<string, unknown>): LocalUser {
  return {
    id: String(row.id ?? ""),
    name: String(row.name ?? ""),
    email: String(row.email ?? ""),
    password: String(row.password ?? ""),
    role: (row.role as UserRole) ?? "sales",
    created_at: String(row.created_at ?? new Date().toISOString()),
  };
}

async function ensureSupabaseDemoUsers() {
  if (!hasSupabaseConfig()) {
    return;
  }
  const supabaseAdmin = getSupabaseAdmin();
  const rows = demoUsersSeed.map((user) => ({
    name: user.name,
    email: user.email.toLowerCase(),
    password: user.password,
    role: user.role,
  }));
  await supabaseAdmin
    .from("app_users")
    .upsert(rows, { onConflict: "email", ignoreDuplicates: false });
}

function requireSupabaseForFeedback() {
  if (!hasSupabaseConfig()) {
    throw new Error("Supabase is required for feedback storage.");
  }
}

export async function getLocalSurveyById(surveyId: string) {
  const db = await readDb();
  const survey = db.surveys.find((item) => item.id === surveyId && item.is_published);
  if (!survey) {
    return null;
  }
  const questions = db.questions
    .filter((item) => item.survey_id === surveyId)
    .sort((a, b) => a.order_index - b.order_index);
  return { survey, questions };
}

export async function getLocalSurveys() {
  const db = await readDb();
  return db.surveys
    .filter((survey) => survey.is_published)
    .slice()
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function createLocalSurvey(input: {
  title: string;
  questions: Array<{
    text: string;
    type: QuestionType;
    isRequired: boolean;
    options: string[] | null;
  }>;
}) {
  const db = await readDb();
  const surveyId = randomUUID();
  const now = new Date().toISOString();
  db.surveys.unshift({
    id: surveyId,
    title: input.title,
    created_at: now,
    is_published: true,
  });

  input.questions.forEach((question, index) => {
    db.questions.push({
      id: randomUUID(),
      survey_id: surveyId,
      text: question.text,
      type: question.type,
      is_required: question.isRequired,
      options: question.options,
      order_index: index + 1,
    });
  });

  await writeDb(db);
  return {
    survey: db.surveys[0],
  };
}

export async function getLocalProjects() {
  const db = await readDb();
  return db.projects
    .slice()
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map((project) => ({
      ...project,
      project_links: db.project_links
        .filter((link) => link.project_id === project.id)
        .map((link) => ({ slug: link.slug, is_active: link.is_active })),
    }));
}

export async function getLocalProjectById(id: string) {
  const db = await readDb();
  const project = db.projects.find((item) => item.id === id);
  if (!project) {
    return null;
  }
  return {
    ...project,
    project_links: db.project_links
      .filter((link) => link.project_id === project.id)
      .map((link) => ({ slug: link.slug, is_active: link.is_active })),
  };
}

export async function slugExists(slug: string) {
  const db = await readDb();
  return db.project_links.some((item) => item.slug === slug);
}

export async function createLocalProject(input: {
  name: string;
  surveyId: string;
  platform: ProjectPlatform;
  sourceUrl: string | null;
  slug: string;
  status?: "draft" | "published";
  projectCode?: string | null;
  surveyName?: string | null;
  workflowStatus?: "live" | "pending" | "paused" | "ids_awaited";
  projectType?: string | null;
  surveyCategory?: string | null;
  projectManager?: string | null;
  secondaryProjectManager?: string | null;
  createDate?: string | null;
  endDate?: string | null;
  preScreening?: "on" | "off" | null;
  aiPreScreeningStatus?: "on" | "off" | null;
  numberOfQuestions?: number | null;
  clientName?: string | null;
  salesPerson?: string | null;
  clientPoNumber?: string | null;
  variable?: string | null;
  quota?: number | null;
  country?: string | null;
  ir?: number | null;
  loi?: number | null;
  cpi?: number | null;
  segment?: string | null;
  surveyLink?: string | null;
  supplierName?: string | null;
  supplierCpi?: number | null;
  rdSearch?: boolean;
  rdReview?: boolean;
  rdPredupe?: boolean;
  rdActivity?: boolean;
  rdEmailVerify?: boolean;
  speederTerm?: "on" | "off";
  geoIp?: "on" | "off";
  duplicateIp?: "on" | "off";
  preScreeningCaptcha?: "on" | "off";
  survalidate?: "on" | "off";
  dfiqPortal?: "on" | "off";
  campaignBanner?: "hide" | "show";
  campaignBannerStatus?: string | null;
}) {
  const db = await readDb();
  const survey = db.surveys.find((item) => item.id === input.surveyId && item.is_published);
  if (!survey) {
    return { error: "Survey not found." as const };
  }

  const now = new Date().toISOString();
  const projectId = randomUUID();
  db.projects.unshift({
    id: projectId,
    project_code: input.projectCode ?? generateProjectCode(),
    name: input.name,
    survey_name: input.surveyName ?? input.name,
    survey_id: input.surveyId,
    platform: input.platform,
    source_url: input.sourceUrl,
    status: input.status ?? "published",
    workflow_status: input.workflowStatus ?? "live",
    project_type: input.projectType ?? null,
    survey_category: input.surveyCategory ?? null,
    project_manager: input.projectManager ?? null,
    secondary_project_manager: input.secondaryProjectManager ?? null,
    create_date: input.createDate ?? now.slice(0, 10),
    end_date: input.endDate ?? null,
    pre_screening: input.preScreening ?? "off",
    ai_pre_screening_status: input.aiPreScreeningStatus ?? "off",
    number_of_questions: input.numberOfQuestions ?? null,
    client_name: input.clientName ?? null,
    sales_person: input.salesPerson ?? null,
    client_po_number: input.clientPoNumber ?? null,
    variable: input.variable ?? null,
    quota: input.quota ?? null,
    country: input.country ?? null,
    ir: input.ir ?? null,
    loi: input.loi ?? null,
    cpi: input.cpi ?? null,
    segment: input.segment ?? null,
    survey_link: input.surveyLink ?? null,
    supplier_name: input.supplierName ?? null,
    supplier_cpi: input.supplierCpi ?? null,
    rd_search: Boolean(input.rdSearch),
    rd_review: Boolean(input.rdReview),
    rd_predupe: Boolean(input.rdPredupe),
    rd_activity: Boolean(input.rdActivity),
    rd_email_verify: Boolean(input.rdEmailVerify),
    speeder_term: input.speederTerm ?? "off",
    geo_ip: input.geoIp ?? "off",
    duplicate_ip: input.duplicateIp ?? "off",
    pre_screening_captcha: input.preScreeningCaptcha ?? "off",
    survalidate: input.survalidate ?? "off",
    dfiq_portal: input.dfiqPortal ?? "off",
    campaign_banner: input.campaignBanner ?? "hide",
    campaign_banner_status: input.campaignBannerStatus ?? "Complete, Terminate, Quota-Full",
    created_at: now,
    updated_at: now,
  });
  db.project_links.unshift({
    id: randomUUID(),
    project_id: projectId,
    slug: input.slug,
    is_active: true,
    created_at: now,
  });
  await writeDb(db);
  return {
    project: db.projects[0],
  };
}

export async function updateLocalProject(input: {
  id: string;
  name?: string;
  projectCode?: string | null;
  surveyName?: string | null;
  platform?: ProjectPlatform;
  status?: "draft" | "published";
  workflowStatus?: "live" | "pending" | "paused" | "ids_awaited";
  sourceUrl?: string | null;
  projectType?: string | null;
  surveyCategory?: string | null;
  projectManager?: string | null;
  secondaryProjectManager?: string | null;
  createDate?: string | null;
  endDate?: string | null;
  preScreening?: "on" | "off" | null;
  aiPreScreeningStatus?: "on" | "off" | null;
  numberOfQuestions?: number | null;
  clientName?: string | null;
  salesPerson?: string | null;
  clientPoNumber?: string | null;
  variable?: string | null;
  quota?: number | null;
  country?: string | null;
  ir?: number | null;
  loi?: number | null;
  cpi?: number | null;
  segment?: string | null;
  surveyLink?: string | null;
  supplierName?: string | null;
  supplierCpi?: number | null;
  rdSearch?: boolean;
  rdReview?: boolean;
  rdPredupe?: boolean;
  rdActivity?: boolean;
  rdEmailVerify?: boolean;
  speederTerm?: "on" | "off";
  geoIp?: "on" | "off";
  duplicateIp?: "on" | "off";
  preScreeningCaptcha?: "on" | "off";
  survalidate?: "on" | "off";
  dfiqPortal?: "on" | "off";
  campaignBanner?: "hide" | "show";
  campaignBannerStatus?: string | null;
}) {
  const db = await readDb();
  const project = db.projects.find((item) => item.id === input.id);
  if (!project) {
    return null;
  }

  if (typeof input.name === "string" && input.name.trim()) {
    project.name = input.name.trim();
  }
  if (typeof input.projectCode !== "undefined") {
    project.project_code = input.projectCode;
  }
  if (typeof input.surveyName !== "undefined") {
    project.survey_name = input.surveyName;
  }
  if (input.platform) {
    project.platform = input.platform;
  }
  if (input.status) {
    project.status = input.status;
  }
  if (input.workflowStatus) {
    project.workflow_status = input.workflowStatus;
  }
  if (typeof input.sourceUrl !== "undefined") {
    project.source_url = input.sourceUrl;
  }
  if (typeof input.projectType !== "undefined") {
    project.project_type = input.projectType;
  }
  if (typeof input.surveyCategory !== "undefined") {
    project.survey_category = input.surveyCategory;
  }
  if (typeof input.projectManager !== "undefined") {
    project.project_manager = input.projectManager;
  }
  if (typeof input.secondaryProjectManager !== "undefined") {
    project.secondary_project_manager = input.secondaryProjectManager;
  }
  if (typeof input.createDate !== "undefined") {
    project.create_date = input.createDate;
  }
  if (typeof input.endDate !== "undefined") {
    project.end_date = input.endDate;
  }
  if (typeof input.preScreening !== "undefined") {
    project.pre_screening = input.preScreening;
  }
  if (typeof input.aiPreScreeningStatus !== "undefined") {
    project.ai_pre_screening_status = input.aiPreScreeningStatus;
  }
  if (typeof input.numberOfQuestions !== "undefined") {
    project.number_of_questions = input.numberOfQuestions;
  }
  if (typeof input.clientName !== "undefined") {
    project.client_name = input.clientName;
  }
  if (typeof input.salesPerson !== "undefined") {
    project.sales_person = input.salesPerson;
  }
  if (typeof input.clientPoNumber !== "undefined") {
    project.client_po_number = input.clientPoNumber;
  }
  if (typeof input.variable !== "undefined") {
    project.variable = input.variable;
  }
  if (typeof input.quota !== "undefined") {
    project.quota = input.quota;
  }
  if (typeof input.country !== "undefined") {
    project.country = input.country;
  }
  if (typeof input.ir !== "undefined") {
    project.ir = input.ir;
  }
  if (typeof input.loi !== "undefined") {
    project.loi = input.loi;
  }
  if (typeof input.cpi !== "undefined") {
    project.cpi = input.cpi;
  }
  if (typeof input.segment !== "undefined") {
    project.segment = input.segment;
  }
  if (typeof input.surveyLink !== "undefined") {
    project.survey_link = input.surveyLink;
  }
  if (typeof input.supplierName !== "undefined") {
    project.supplier_name = input.supplierName;
  }
  if (typeof input.supplierCpi !== "undefined") {
    project.supplier_cpi = input.supplierCpi;
  }
  if (typeof input.rdSearch !== "undefined") {
    project.rd_search = input.rdSearch;
  }
  if (typeof input.rdReview !== "undefined") {
    project.rd_review = input.rdReview;
  }
  if (typeof input.rdPredupe !== "undefined") {
    project.rd_predupe = input.rdPredupe;
  }
  if (typeof input.rdActivity !== "undefined") {
    project.rd_activity = input.rdActivity;
  }
  if (typeof input.rdEmailVerify !== "undefined") {
    project.rd_email_verify = input.rdEmailVerify;
  }
  if (typeof input.speederTerm !== "undefined") {
    project.speeder_term = input.speederTerm;
  }
  if (typeof input.geoIp !== "undefined") {
    project.geo_ip = input.geoIp;
  }
  if (typeof input.duplicateIp !== "undefined") {
    project.duplicate_ip = input.duplicateIp;
  }
  if (typeof input.preScreeningCaptcha !== "undefined") {
    project.pre_screening_captcha = input.preScreeningCaptcha;
  }
  if (typeof input.survalidate !== "undefined") {
    project.survalidate = input.survalidate;
  }
  if (typeof input.dfiqPortal !== "undefined") {
    project.dfiq_portal = input.dfiqPortal;
  }
  if (typeof input.campaignBanner !== "undefined") {
    project.campaign_banner = input.campaignBanner;
  }
  if (typeof input.campaignBannerStatus !== "undefined") {
    project.campaign_banner_status = input.campaignBannerStatus;
  }
  project.updated_at = new Date().toISOString();

  await writeDb(db);
  return project;
}

export async function getLocalRedirectBySlug(slug: string) {
  const db = await readDb();
  const link = db.project_links.find((item) => item.slug === slug && item.is_active);
  if (!link) {
    return null;
  }
  const project = db.projects.find((item) => item.id === link.project_id && item.status === "published");
  if (!project) {
    return null;
  }
  return { link, project };
}

export async function addLocalLinkVisit(input: {
  projectLinkId: string;
  ipAddress: string | null;
  userAgent: string | null;
  referer: string | null;
}) {
  const db = await readDb();
  db.link_visits.push({
    id: randomUUID(),
    project_link_id: input.projectLinkId,
    ip_address: input.ipAddress,
    user_agent: input.userAgent,
    referer: input.referer,
    created_at: new Date().toISOString(),
  });
  await writeDb(db);
}

export async function saveLocalResponse(input: {
  surveyId: string;
  projectId?: string;
  answers: Record<string, string>;
}) {
  const db = await readDb();
  const survey = db.surveys.find((item) => item.id === input.surveyId && item.is_published);
  if (!survey) {
    return { error: "Survey not found." as const };
  }

  const questions = db.questions.filter((item) => item.survey_id === input.surveyId);
  const questionIdSet = new Set(questions.map((item) => item.id));
  for (const questionId of Object.keys(input.answers)) {
    if (!questionIdSet.has(questionId)) {
      return { error: "Invalid question in answers." as const };
    }
  }

  const requiredMissing = questions
    .filter((item) => item.is_required)
    .filter((item) => !input.answers[item.id] || input.answers[item.id].trim().length === 0)
    .map((item) => item.id);

  if (requiredMissing.length > 0) {
    return { error: "Please fill all required questions." as const };
  }

  if (input.projectId) {
    const project = db.projects.find((item) => item.id === input.projectId);
    if (!project || project.survey_id !== input.surveyId || project.status !== "published") {
      return { error: "Invalid projectId for this survey." as const };
    }
  }

  const now = new Date().toISOString();
  const responseId = randomUUID();
  db.responses.push({
    id: responseId,
    survey_id: input.surveyId,
    project_id: input.projectId ?? null,
    created_at: now,
  });
  Object.entries(input.answers)
    .filter(([, value]) => value.length > 0)
    .forEach(([questionId, value]) => {
      db.answers.push({
        id: randomUUID(),
        response_id: responseId,
        question_id: questionId,
        value,
        created_at: now,
      });
    });
  await writeDb(db);
  return { responseId };
}

export const localDemoSurveyId = demoSurveyId;

export async function listLocalFeedback() {
  requireSupabaseForFeedback();
  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin.from("feedback_items").select("*").order("created_at", { ascending: false });
  if (error) {
    throw new Error(`Failed to read feedback_items from Supabase: ${error.message}`);
  }
  return (data ?? []).map((row) => mapFeedbackRow(row as unknown as Record<string, unknown>));
}

export async function createLocalFeedback(input: {
  page: string;
  featurePosition: string | null;
  featureTitle: string;
  currentBehavior: string;
  expectedBehavior: string;
  impact: string;
  createdByName: string;
  createdByEmail: string;
  createdByRole: UserRole;
}) {
  requireSupabaseForFeedback();
  const supabaseAdmin = getSupabaseAdmin();
  const now = new Date().toISOString();
  const row = {
    page: input.page,
    feature_position: input.featurePosition,
    feature_title: input.featureTitle,
    current_behavior: input.currentBehavior,
    expected_behavior: input.expectedBehavior,
    impact: input.impact,
    status: "open" as DbFeedbackStatus,
    created_by_name: input.createdByName,
    created_by_email: input.createdByEmail,
    created_by_role: input.createdByRole,
    developer_note: null,
    updated_by_name: null,
    agent_requested: false,
    agent_request_note: null,
    agent_approved: false,
    agent_approval_comment: null,
    agent_approved_by_name: null,
    agent_run_status: "idle" as DbAgentRunStatus,
    agent_run_log: null,
    created_at: now,
    updated_at: now,
  };

  const firstAttempt = await supabaseAdmin.from("feedback_items").insert(row).select("*").single();
  if (!firstAttempt.error && firstAttempt.data) {
    return mapFeedbackRow(firstAttempt.data as unknown as Record<string, unknown>);
  }

  if (firstAttempt.error?.message.toLowerCase().includes("feature_position")) {
    const { feature_position: _featurePosition, ...legacyRow } = row;
    const retry = await supabaseAdmin.from("feedback_items").insert(legacyRow).select("*").single();
    if (!retry.error && retry.data) {
      return mapFeedbackRow(retry.data as unknown as Record<string, unknown>);
    }
    throw new Error(`Failed to insert feedback_items into Supabase: ${retry.error?.message ?? "unknown error"}`);
  }

  throw new Error(`Failed to insert feedback_items into Supabase: ${firstAttempt.error?.message ?? "unknown error"}`);
}

export async function requestFeedbackAgent(input: { id: string; requestNote: string | null }) {
  requireSupabaseForFeedback();
  const supabaseAdmin = getSupabaseAdmin();
  const now = new Date().toISOString();
  const { data, error } = await supabaseAdmin
    .from("feedback_items")
    .update({
      agent_requested: true,
      agent_request_note: input.requestNote,
      updated_at: now,
    })
    .eq("id", input.id)
    .select("*")
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    throw new Error(`Failed to update feedback_items in Supabase: ${error.message}`);
  }
  return mapFeedbackRow(data as unknown as Record<string, unknown>);
}

export async function approveFeedbackAgent(input: {
  id: string;
  approvalComment: string | null;
  approvedByName: string;
}) {
  requireSupabaseForFeedback();
  const supabaseAdmin = getSupabaseAdmin();
  const now = new Date().toISOString();
  const { data, error } = await supabaseAdmin
    .from("feedback_items")
    .update({
      agent_approved: true,
      agent_approval_comment: input.approvalComment,
      agent_approved_by_name: input.approvedByName,
      agent_run_status: "queued" as DbAgentRunStatus,
      updated_at: now,
    })
    .eq("id", input.id)
    .select("*")
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    throw new Error(`Failed to approve feedback_items in Supabase: ${error.message}`);
  }
  return mapFeedbackRow(data as unknown as Record<string, unknown>);
}

export async function setFeedbackAgentRunStatus(input: {
  id: string;
  status: "idle" | "queued" | "running" | "done" | "failed";
  log: string | null;
}) {
  requireSupabaseForFeedback();
  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from("feedback_items")
    .update({
      agent_run_status: input.status,
      agent_run_log: input.log,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.id)
    .select("*")
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    throw new Error(`Failed to update feedback_items run status in Supabase: ${error.message}`);
  }
  return mapFeedbackRow(data as unknown as Record<string, unknown>);
}

export async function listLocalUsers() {
  if (hasSupabaseConfig()) {
    await ensureSupabaseDemoUsers();
    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin.from("app_users").select("*").order("created_at", { ascending: false });
    if (!error && data) {
      return data.map((row) => mapUserRow(row as unknown as Record<string, unknown>));
    }
  }

  const db = await readDb();
  return db.users.slice().sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function createLocalUser(input: { name: string; email: string; password: string; role?: UserRole }) {
  if (hasSupabaseConfig()) {
    await ensureSupabaseDemoUsers();
    const supabaseAdmin = getSupabaseAdmin();
    const email = input.email.toLowerCase();
    const { data: existing } = await supabaseAdmin.from("app_users").select("id").eq("email", email).maybeSingle();
    if (existing) {
      return { error: "User already exists." as const };
    }

    const { data, error } = await supabaseAdmin
      .from("app_users")
      .insert({
        name: input.name,
        email,
        password: input.password,
        role: input.role ?? "sales",
      })
      .select("*")
      .single();

    if (!error && data) {
      return { user: mapUserRow(data as unknown as Record<string, unknown>) };
    }
  }

  const db = await readDb();
  const existing = db.users.find((user) => user.email.toLowerCase() === input.email.toLowerCase());
  if (existing) {
    return { error: "User already exists." as const };
  }

  const user: LocalUser = {
    id: randomUUID(),
    name: input.name,
    email: input.email.toLowerCase(),
    password: input.password,
    role: input.role ?? "sales",
    created_at: new Date().toISOString(),
  };
  db.users.push(user);
  await writeDb(db);
  return { user };
}

export async function findLocalUserByCredentials(email: string, password: string) {
  if (hasSupabaseConfig()) {
    await ensureSupabaseDemoUsers();
    const supabaseAdmin = getSupabaseAdmin();
    const { data } = await supabaseAdmin
      .from("app_users")
      .select("email,name,role")
      .eq("email", email.toLowerCase())
      .eq("password", password)
      .maybeSingle();
    if (data) {
      return { email: data.email, name: data.name, role: data.role as UserRole };
    }
  }

  const db = await readDb();
  const user = db.users.find(
    (entry) => entry.email.toLowerCase() === email.toLowerCase() && entry.password === password,
  );
  if (!user) {
    return null;
  }
  return { email: user.email, name: user.name, role: user.role };
}

export async function updateLocalFeedback(input: {
  id: string;
  status?: FeedbackStatus;
  developerNote?: string;
  updatedByName: string;
}) {
  requireSupabaseForFeedback();
  const supabaseAdmin = getSupabaseAdmin();
  const patch: Record<string, unknown> = {
    updated_by_name: input.updatedByName,
    updated_at: new Date().toISOString(),
  };
  if (input.status) {
    patch.status = input.status;
  }
  if (typeof input.developerNote === "string") {
    patch.developer_note = input.developerNote;
  }

  const { data, error } = await supabaseAdmin
    .from("feedback_items")
    .update(patch)
    .eq("id", input.id)
    .select("*")
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    throw new Error(`Failed to update feedback_items in Supabase: ${error.message}`);
  }
  return mapFeedbackRow(data as unknown as Record<string, unknown>);
}
