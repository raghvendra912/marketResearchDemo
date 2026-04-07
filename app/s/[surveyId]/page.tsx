import { headers } from "next/headers";
import { notFound } from "next/navigation";
import SurveyForm from "./SurveyForm";
import type { SurveyPayload } from "@/types/survey";

type Props = {
  params: Promise<{ surveyId: string }>;
  searchParams: Promise<{ projectId?: string }>;
};

async function getSurveyData(surveyId: string): Promise<SurveyPayload | null> {
  const headerStore = await headers();
  const host = headerStore.get("host");

  if (!host) {
    return null;
  }

  const protocol = headerStore.get("x-forwarded-proto") ?? "http";
  const baseUrl = `${protocol}://${host}`;

  const res = await fetch(`${baseUrl}/api/surveys/${surveyId}`, { cache: "no-store" });

  if (!res.ok) {
    return null;
  }

  return res.json();
}

export default async function SurveyPage({ params, searchParams }: Props) {
  const { surveyId } = await params;
  const query = await searchParams;
  const surveyData = await getSurveyData(surveyId);

  if (!surveyData) {
    notFound();
  }

  return <SurveyForm initialData={surveyData} projectId={query.projectId} />;
}
