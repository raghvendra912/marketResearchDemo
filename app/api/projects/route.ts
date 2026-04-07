import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin, hasSupabaseConfig } from "@/lib/supabase-admin";
import { createSlug, extractSurveyId } from "@/lib/survey-link";
import { sanitizeText } from "@/lib/sanitize";
import { isRateLimited } from "@/lib/rate-limit";
import type { ProjectPlatform } from "@/types/project";
import { createLocalProject, getLocalProjects, slugExists } from "@/lib/local-db";
import { getSessionFromCookieValue, SESSION_COOKIE } from "@/lib/auth";

type CreateProjectPayload = {
  name?: string;
  surveyInput?: string;
  platform?: ProjectPlatform;
  sourceUrl?: string;
};

const supportedPlatforms = new Set<ProjectPlatform>(["cint", "prime_sample", "other"]);

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

export async function GET() {
  if (!hasSupabaseConfig()) {
    const projects = await getLocalProjects();
    return NextResponse.json({ projects });
  }

  const supabaseAdmin = getSupabaseAdmin();

  const { data, error } = await supabaseAdmin
    .from("projects")
    .select(
      "id, name, survey_id, platform, source_url, status, created_at, project_links(slug, is_active)",
    )
    .order("created_at", { ascending: false })
    .limit(50);

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

  const name = sanitizeText(String(payload.name ?? ""), 120);
  const surveyInput = sanitizeText(String(payload.surveyInput ?? ""), 1000);
  const platform = (payload.platform ?? "other") as ProjectPlatform;
  const sourceUrl = sanitizeText(String(payload.sourceUrl ?? ""), 2000) || null;

  if (!name) {
    return NextResponse.json({ error: "Project name is required." }, { status: 400 });
  }

  if (!supportedPlatforms.has(platform)) {
    return NextResponse.json({ error: "Unsupported platform." }, { status: 400 });
  }

  const surveyId = extractSurveyId(surveyInput);
  if (!surveyId) {
    return NextResponse.json(
      { error: "Provide a valid survey UUID or survey URL ending with /s/<surveyId>." },
      { status: 400 },
    );
  }

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
      name,
      surveyId,
      platform,
      sourceUrl,
      slug,
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
    .eq("id", surveyId)
    .single();

  if (surveyError || !survey) {
    return NextResponse.json({ error: "Survey not found." }, { status: 404 });
  }

  if (!survey.is_published) {
    return NextResponse.json({ error: "Survey is not published." }, { status: 400 });
  }

  const { data: project, error: projectError } = await supabaseAdmin
    .from("projects")
    .insert({
      name,
      survey_id: surveyId,
      platform,
      source_url: sourceUrl,
      status: "published",
    })
    .select("id, name, survey_id, platform, source_url, status, created_at")
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
