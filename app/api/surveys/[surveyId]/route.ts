import { NextResponse } from "next/server";
import { getSupabaseAdmin, hasSupabaseConfig } from "@/lib/supabase-admin";
import { getLocalSurveyById } from "@/lib/local-db";

type Context = {
  params: Promise<{ surveyId: string }>;
};

export async function GET(_request: Request, context: Context) {
  const { surveyId } = await context.params;

  if (!surveyId) {
    return NextResponse.json({ error: "Invalid survey id." }, { status: 400 });
  }

  if (!hasSupabaseConfig()) {
    const localData = await getLocalSurveyById(surveyId);
    if (!localData) {
      return NextResponse.json({ error: "Survey not found." }, { status: 404 });
    }
    return NextResponse.json(localData);
  }

  const supabaseAdmin = getSupabaseAdmin();

  const { data: survey, error: surveyError } = await supabaseAdmin
    .from("surveys")
    .select("id, title, created_at")
    .eq("id", surveyId)
    .eq("is_published", true)
    .single();

  if (surveyError || !survey) {
    return NextResponse.json({ error: "Survey not found." }, { status: 404 });
  }

  const { data: questions, error: questionsError } = await supabaseAdmin
    .from("questions")
    .select("id, survey_id, text, type, is_required, options, order_index")
    .eq("survey_id", surveyId)
    .order("order_index", { ascending: true });

  if (questionsError) {
    return NextResponse.json({ error: "Failed to load survey." }, { status: 500 });
  }

  return NextResponse.json({ survey, questions: questions ?? [] });
}
