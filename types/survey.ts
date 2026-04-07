export type QuestionType = "text" | "textarea" | "multiple-choice" | "number";

export interface Survey {
  id: string;
  title: string;
  created_at: string;
}

export interface Question {
  id: string;
  survey_id: string;
  text: string;
  type: QuestionType;
  is_required: boolean;
  options: string[] | null;
  order_index: number;
}

export interface SurveyPayload {
  survey: Survey;
  questions: Question[];
}