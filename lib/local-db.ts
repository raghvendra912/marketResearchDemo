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
  name: string;
  survey_id: string;
  platform: ProjectPlatform;
  source_url: string | null;
  status: "draft" | "published";
  created_at: string;
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
        name: "Demo GenPop - Cint",
        survey_id: demoSurveyId,
        platform: "cint",
        source_url: null,
        status: "published",
        created_at: now,
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
      projects: parsed.projects ?? [],
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
      parsed.users.length === 0;
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
    name: input.name,
    survey_id: input.surveyId,
    platform: input.platform,
    source_url: input.sourceUrl,
    status: "published",
    created_at: now,
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

  const { data, error } = await supabaseAdmin.from("feedback_items").insert(row).select("*").single();
  if (error || !data) {
    throw new Error(`Failed to insert feedback_items into Supabase: ${error?.message ?? "unknown error"}`);
  }
  return mapFeedbackRow(data as unknown as Record<string, unknown>);
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
