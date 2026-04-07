import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin, hasSupabaseConfig } from "@/lib/supabase-admin";
import { sanitizeText } from "@/lib/sanitize";
import { createLocalSurvey, getLocalSurveys } from "@/lib/local-db";
import type { QuestionType } from "@/types/survey";
import { getSessionFromCookieValue, SESSION_COOKIE } from "@/lib/auth";

type CreateSurveyQuestion = {
  text?: string;
  type?: QuestionType;
  isRequired?: boolean;
  options?: string[] | null;
};

type CreateSurveyPayload = {
  title?: string;
  questions?: CreateSurveyQuestion[];
};

const supportedQuestionTypes = new Set<QuestionType>(["text", "textarea", "multiple-choice", "number"]);

function validateQuestions(rawQuestions: CreateSurveyQuestion[]) {
  const questions: Array<{
    text: string;
    type: QuestionType;
    isRequired: boolean;
    options: string[] | null;
  }> = [];

  for (const rawQuestion of rawQuestions) {
    const text = sanitizeText(String(rawQuestion.text ?? ""), 500);
    if (!text) {
      continue;
    }

    if (!rawQuestion.type || !supportedQuestionTypes.has(rawQuestion.type)) {
      return { error: "Invalid question type." as const };
    }

    const options = Array.isArray(rawQuestion.options)
      ? rawQuestion.options.map((option) => sanitizeText(String(option), 120)).filter(Boolean)
      : null;

    if (rawQuestion.type === "multiple-choice" && (!options || options.length < 2)) {
      return { error: "Multiple-choice questions need at least 2 options." as const };
    }

    questions.push({
      text,
      type: rawQuestion.type,
      isRequired: Boolean(rawQuestion.isRequired),
      options,
    });
  }

  if (questions.length === 0) {
    return { error: "At least one question is required." as const };
  }

  return { questions };
}

export async function GET() {
  if (!hasSupabaseConfig()) {
    const surveys = await getLocalSurveys();
    return NextResponse.json({ surveys });
  }

  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from("surveys")
    .select("id, title, created_at")
    .eq("is_published", true)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json({ error: "Failed to load surveys." }, { status: 500 });
  }

  return NextResponse.json({ surveys: data ?? [] });
}

export async function POST(request: NextRequest) {
  const session = getSessionFromCookieValue(request.cookies.get(SESSION_COOKIE)?.value);
  if (!session || (session.role !== "admin" && session.role !== "pm")) {
    return NextResponse.json({ error: "You do not have permission to create surveys." }, { status: 403 });
  }

  let payload: CreateSurveyPayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const title = sanitizeText(String(payload.title ?? ""), 180);
  if (!title) {
    return NextResponse.json({ error: "Survey title is required." }, { status: 400 });
  }

  const validation = validateQuestions(payload.questions ?? []);
  if ("error" in validation) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  if (!hasSupabaseConfig()) {
    const created = await createLocalSurvey({
      title,
      questions: validation.questions,
    });

    return NextResponse.json({ success: true, survey: created.survey }, { status: 201 });
  }

  const supabaseAdmin = getSupabaseAdmin();
  const { data: survey, error: surveyError } = await supabaseAdmin
    .from("surveys")
    .insert({ title, is_published: true })
    .select("id, title, created_at")
    .single();

  if (surveyError || !survey) {
    return NextResponse.json({ error: "Failed to create survey." }, { status: 500 });
  }

  const questions = validation.questions.map((question, index) => ({
    survey_id: survey.id,
    text: question.text,
    type: question.type,
    is_required: question.isRequired,
    options: question.options,
    order_index: index + 1,
  }));

  const { error: questionsError } = await supabaseAdmin.from("questions").insert(questions);
  if (questionsError) {
    await supabaseAdmin.from("surveys").delete().eq("id", survey.id);
    return NextResponse.json({ error: "Failed to create survey questions." }, { status: 500 });
  }

  return NextResponse.json({ success: true, survey }, { status: 201 });
}
