export type ProjectPlatform = "cint" | "prime_sample" | "other";
export type ProjectStatus = "draft" | "published";

export type WorkflowStatus = "live" | "pending" | "paused" | "ids_awaited";

export type DefenderMode = "on" | "off";
export type CampaignBannerMode = "hide" | "show";

export interface ResearchDefenderSettings {
  search: boolean;
  review: boolean;
  predupe: boolean;
  activity: boolean;
  emailVerify: boolean;
}

export interface DigitalFingerprintSettings {
  speederTerm: DefenderMode;
  geoIp: DefenderMode;
  duplicateIp: DefenderMode;
  preScreeningCaptcha: DefenderMode;
  survalidate: DefenderMode;
  dfiqPortal: DefenderMode;
}

export interface ProjectLink {
  slug: string;
  is_active: boolean;
}

export interface ProjectItem {
  id: string;
  project_code: string | null;
  name: string;
  survey_name: string | null;
  survey_id: string;
  platform: ProjectPlatform;
  source_url: string | null;
  status: ProjectStatus;
  workflow_status: WorkflowStatus;

  project_type: string | null;
  survey_category: string | null;
  project_manager: string | null;
  secondary_project_manager: string | null;
  create_date: string | null;
  end_date: string | null;

  pre_screening: DefenderMode | null;
  ai_pre_screening_status: DefenderMode | null;
  number_of_questions: number | null;

  client_name: string | null;
  sales_person: string | null;
  client_po_number: string | null;
  variable: string | null;
  quota: number | null;
  country: string | null;
  ir: number | null;
  loi: number | null;
  cpi: number | null;
  segment: string | null;
  survey_link: string | null;

  supplier_name: string | null;
  supplier_cpi: number | null;

  rd_search: boolean;
  rd_review: boolean;
  rd_predupe: boolean;
  rd_activity: boolean;
  rd_email_verify: boolean;

  speeder_term: DefenderMode;
  geo_ip: DefenderMode;
  duplicate_ip: DefenderMode;
  pre_screening_captcha: DefenderMode;
  survalidate: DefenderMode;
  dfiq_portal: DefenderMode;
  campaign_banner: CampaignBannerMode;
  campaign_banner_status: string | null;

  created_at: string;
  updated_at: string | null;
  project_links: ProjectLink[] | null;
}
