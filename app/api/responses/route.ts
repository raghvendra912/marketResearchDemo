import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin, hasSupabaseConfig } from "@/lib/supabase-admin";
import { isRateLimited } from "@/lib/rate-limit";
import {
  hasMinimumContent,
  normalizeAnswers,
  validateRequiredAnswers,
  type RawAnswers,
} from "@/lib/survey-validation";
import { saveLocalResponse } from "@/lib/local-db";

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() ?? "unknown";
  }

  return request.headers.get("x-real-ip") ?? "unknown";
}

type Payload = {
  surveyId?: string;
  projectId?: string;
  answers?: RawAnswers;
};

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const { limited, retryAfterSec } = isRateLimited(`responses:${ip}`);

  if (limited) {
    return NextResponse.json(
      { error: "Too many submissions. Please try again later." },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfterSec),
        },
      },
    );
  }

  let payload: Payload;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  if (!payload?.surveyId || typeof payload.surveyId !== "string") {
    return NextResponse.json({ error: "surveyId is required." }, { status: 400 });
  }

  if (payload.projectId && typeof payload.projectId !== "string") {
    return NextResponse.json({ error: "projectId must be a string." }, { status: 400 });
  }

  const answers = normalizeAnswers(payload.answers ?? {});

  if (!hasMinimumContent(answers)) {
    return NextResponse.json({ error: "Please provide at least one answer." }, { status: 400 });
  }

  if (!hasSupabaseConfig()) {
    const localResult = await saveLocalResponse({
      surveyId: payload.surveyId,
      projectId: payload.projectId,
      answers,
    });
    if ("error" in localResult) {
      return NextResponse.json({ error: localResult.error }, { status: 400 });
    }
    return NextResponse.json({ success: true, responseId: localResult.responseId }, { status: 201 });
  }

  const supabaseAdmin = getSupabaseAdmin();

  const { data: survey, error: surveyError } = await supabaseAdmin
    .from("surveys")
    .select("id")
    .eq("id", payload.surveyId)
    .eq("is_published", true)
    .single();

  if (surveyError || !survey) {
    return NextResponse.json({ error: "Survey not found." }, { status: 404 });
  }

  const { data: questions, error: questionsError } = await supabaseAdmin
    .from("questions")
    .select("id, survey_id, text, type, is_required, options, order_index")
    .eq("survey_id", payload.surveyId);

  if (questionsError || !questions) {
    return NextResponse.json({ error: "Could not validate survey questions." }, { status: 500 });
  }

  const questionIdSet = new Set(questions.map((q) => q.id));
  for (const questionId of Object.keys(answers)) {
    if (!questionIdSet.has(questionId)) {
      return NextResponse.json({ error: "Invalid question in answers." }, { status: 400 });
    }
  }

  const requiredValidation = validateRequiredAnswers(questions, answers);
  if (!requiredValidation.valid) {
    return NextResponse.json(
      {
        error: "Please fill all required questions.",
        missingQuestionIds: requiredValidation.missingQuestionIds,
      },
      { status: 400 },
    );
  }

  if (payload.projectId) {
    const { data: project, error: projectError } = await supabaseAdmin
      .from("projects")
      .select("id, survey_id, status")
      .eq("id", payload.projectId)
      .single();

    if (projectError || !project || project.survey_id !== payload.surveyId || project.status !== "published") {
      return NextResponse.json({ error: "Invalid projectId for this survey." }, { status: 400 });
    }
  }

  const { data: responseRow, error: responseError } = await supabaseAdmin
    .from("responses")
    .insert({ survey_id: payload.surveyId, project_id: payload.projectId ?? null })
    .select("id")
    .single();

  if (responseError || !responseRow) {
    return NextResponse.json({ error: "Failed to save response." }, { status: 500 });
  }

  const answerRows = Object.entries(answers)
    .filter(([, value]) => value.length > 0)
    .map(([questionId, value]) => ({
      response_id: responseRow.id,
      question_id: questionId,
      value,
    }));

  if (answerRows.length === 0) {
    return NextResponse.json({ error: "No valid answers to save." }, { status: 400 });
  }

  const { error: answersError } = await supabaseAdmin.from("answers").insert(answerRows);

  if (answersError) {
    await supabaseAdmin.from("responses").delete().eq("id", responseRow.id);
    return NextResponse.json({ error: "Failed to save answers." }, { status: 500 });
  }

  return NextResponse.json({ success: true, responseId: responseRow.id }, { status: 201 });
}
