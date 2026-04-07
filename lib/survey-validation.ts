import type { Question } from "@/types/survey";
import { sanitizeText } from "@/lib/sanitize";

export type RawAnswers = Record<string, string>;

export function normalizeAnswers(answers: RawAnswers): RawAnswers {
  const normalized: RawAnswers = {};

  for (const [questionId, value] of Object.entries(answers || {})) {
    if (!questionId) {
      continue;
    }

    normalized[questionId] = sanitizeText(String(value ?? ""));
  }

  return normalized;
}

export function validateRequiredAnswers(
  questions: Question[],
  answers: RawAnswers,
): { valid: boolean; missingQuestionIds: string[] } {
  const missingQuestionIds = questions
    .filter((q) => q.is_required)
    .filter((q) => !answers[q.id] || answers[q.id].trim().length === 0)
    .map((q) => q.id);

  return {
    valid: missingQuestionIds.length === 0,
    missingQuestionIds,
  };
}

export function hasMinimumContent(answers: RawAnswers): boolean {
  return Object.values(answers).some((value) => value.trim().length > 1);
}