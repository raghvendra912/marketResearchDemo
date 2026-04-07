"use client";

import { useMemo, useState, type FormEvent } from "react";
import type { Question, SurveyPayload } from "@/types/survey";

type Props = {
  initialData: SurveyPayload;
  projectId?: string;
};

type AnswersState = Record<string, string>;

function QuestionInput({
  question,
  value,
  onChange,
}: {
  question: Question;
  value: string;
  onChange: (next: string) => void;
}) {
  if (question.type === "multiple-choice") {
    return (
      <div className="space-y-2">
        {(question.options ?? []).map((option) => (
          <label
            key={option}
            className="flex items-center gap-2 rounded-md border border-gray-200 px-3 py-2 text-sm"
          >
            <input
              type="radio"
              name={`question-${question.id}`}
              checked={value === option}
              onChange={() => onChange(option)}
              className="h-4 w-4"
            />
            <span>{option}</span>
          </label>
        ))}
      </div>
    );
  }

  if (question.type === "textarea") {
    return (
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-900"
      />
    );
  }

  if (question.type === "number") {
    return (
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-900"
      />
    );
  }

  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-900"
    />
  );
}

export default function SurveyForm({ initialData, projectId }: Props) {
  const [answers, setAnswers] = useState<AnswersState>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const requiredQuestionIds = useMemo(
    () => initialData.questions.filter((q) => q.is_required).map((q) => q.id),
    [initialData.questions],
  );

  const onAnswerChange = (questionId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitError(null);

    for (const questionId of requiredQuestionIds) {
      if (!answers[questionId] || answers[questionId].trim().length === 0) {
        setSubmitError("Please fill all required fields.");
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/responses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          surveyId: initialData.survey.id,
          projectId,
          answers,
        }),
      });

      const body = await res.json();

      if (!res.ok) {
        setSubmitError(body?.error ?? "Failed to submit response.");
        return;
      }

      setIsSuccess(true);
    } catch {
      setSubmitError("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <section className="mx-auto mt-12 max-w-2xl rounded-xl border border-green-200 bg-green-50 p-8 text-center">
        <h2 className="text-2xl font-semibold text-green-800">Thank you!</h2>
        <p className="mt-2 text-sm text-green-700">Your response has been recorded successfully.</p>
      </section>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold text-gray-900">{initialData.survey.title}</h1>
        <p className="mt-2 text-sm text-gray-600">Fields marked with * are required.</p>
      </header>

      <form onSubmit={onSubmit} className="space-y-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        {initialData.questions.map((question) => (
          <div key={question.id} className="space-y-2">
            <label className="block text-sm font-medium text-gray-900">
              {question.text}
              {question.is_required ? <span className="ml-1 text-red-500">*</span> : null}
            </label>
            <QuestionInput
              question={question}
              value={answers[question.id] ?? ""}
              onChange={(next) => onAnswerChange(question.id, next)}
            />
          </div>
        ))}

        {submitError ? (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {submitError}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center justify-center rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Submitting..." : "Submit"}
        </button>
      </form>
    </main>
  );
}
