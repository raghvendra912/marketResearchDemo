import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin, hasSupabaseConfig } from "@/lib/supabase-admin";
import { addLocalLinkVisit, getLocalRedirectBySlug } from "@/lib/local-db";

type Context = {
  params: Promise<{ slug: string }>;
};

export async function GET(request: NextRequest, context: Context) {
  const { slug } = await context.params;

  if (!slug) {
    return NextResponse.json({ error: "Invalid link." }, { status: 400 });
  }

  if (!hasSupabaseConfig()) {
    const localData = await getLocalRedirectBySlug(slug);
    if (!localData) {
      return NextResponse.json({ error: "Link not found or inactive." }, { status: 404 });
    }

    const destination = new URL(`/s/${localData.project.survey_id}`, request.url);
    destination.searchParams.set("projectId", localData.project.id);
    request.nextUrl.searchParams.forEach((value, key) => {
      if (!destination.searchParams.has(key)) {
        destination.searchParams.set(key, value);
      }
    });

    await addLocalLinkVisit({
      projectLinkId: localData.link.id,
      ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
      userAgent: request.headers.get("user-agent"),
      referer: request.headers.get("referer"),
    });
    return NextResponse.redirect(destination, { status: 307 });
  }

  const supabaseAdmin = getSupabaseAdmin();

  const { data: linkRow, error: linkError } = await supabaseAdmin
    .from("project_links")
    .select("id, slug, is_active, project_id, projects(id, survey_id, status)")
    .eq("slug", slug)
    .eq("is_active", true)
    .single();

  const project = Array.isArray(linkRow?.projects) ? linkRow.projects[0] : linkRow?.projects;

  if (linkError || !linkRow || !project || project.status !== "published") {
    return NextResponse.json({ error: "Link not found or inactive." }, { status: 404 });
  }

  const destination = new URL(`/s/${project.survey_id}`, request.url);
  destination.searchParams.set("projectId", project.id);

  request.nextUrl.searchParams.forEach((value, key) => {
    if (!destination.searchParams.has(key)) {
      destination.searchParams.set(key, value);
    }
  });

  await supabaseAdmin.from("link_visits").insert({
    project_link_id: linkRow.id,
    ip_address: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    user_agent: request.headers.get("user-agent"),
    referer: request.headers.get("referer"),
  });

  return NextResponse.redirect(destination, { status: 307 });
}
