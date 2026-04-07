export type ProjectPlatform = "cint" | "prime_sample" | "other";
export type ProjectStatus = "draft" | "published";

export interface ProjectLink {
  slug: string;
  is_active: boolean;
}

export interface ProjectItem {
  id: string;
  name: string;
  survey_id: string;
  platform: ProjectPlatform;
  source_url: string | null;
  status: ProjectStatus;
  created_at: string;
  project_links: ProjectLink[] | null;
}
