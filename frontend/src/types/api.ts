// Types mirroring backend/app/schemas. Keep in sync with the FastAPI response models.

export const PLATFORMS = ["YouTube", "TikTok", "Instagram", "Podcast", "LinkedIn", "Twitter"] as const;
export const TONES = ["Casual", "Professional", "Humorous", "Educational", "Persuasive", "Inspirational"] as const;
export const LENGTHS = ["Short (2-3 min)", "Medium (5-7 min)", "Long (10-15 min)", "Extra Long (20+ min)"] as const;

export type Platform = (typeof PLATFORMS)[number];
export type Tone = (typeof TONES)[number];
export type Length = (typeof LENGTHS)[number];
export type GenerationMode = "standard" | "assisted";

export interface GenerateRequest {
  topic: string;
  platform: Platform;
  tone: Tone;
  length: Length;
  mode: GenerationMode;
  use_knowledge_base: boolean;
  document_ids?: string[];
  keywords?: string[];
  audience?: string;
  call_to_action?: string;
}

export interface Section {
  script: string;
}

export interface ScriptData {
  title: string;
  introduction: Section;
  mainContent: Section;
  conclusion: Section;
}

export interface SourceRef {
  id: string;
  document_id: string;
  filename: string;
  chunk_index: number;
  section: string | null;
  page_number: number | null;
  score: number;
  snippet: string;
}

export interface ValidationIssue {
  code: string;
  message: string;
  severity: "error" | "warning";
}

export interface ValidationResult {
  passed: boolean;
  word_count: number;
  target_words: [number, number];
  issues: ValidationIssue[];
}

export interface WorkflowStep {
  name: string;
  status: "ok" | "failed" | "skipped";
  duration_ms: number;
  detail: string | null;
}

export interface Usage {
  provider: string;
  model: string;
  llm_calls: number;
  input_tokens: number | null;
  output_tokens: number | null;
  estimated_cost_usd: number | null;
}

export interface GenerationMetadata {
  request_id: string;
  mode: GenerationMode;
  duration_ms: number;
  knowledge_base: { status: "disabled" | "used" | "no_relevant_context" | "unavailable"; retrieved: number };
  sources: SourceRef[];
  validation: ValidationResult;
  workflow: WorkflowStep[];
  usage: Usage;
  quota: { limit: number; used: number; remaining: number } | null;
}

export interface GenerateResponse {
  success: true;
  data: ScriptData;
  metadata: GenerationMetadata;
}

export type DocumentStatus = "uploaded" | "processing" | "ready" | "failed" | "deleting";

export interface KnowledgeDocument {
  id: string;
  filename: string;
  content_type: string;
  file_size: number;
  status: DocumentStatus;
  chunk_count: number;
  error_code: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApiErrorBody {
  success: false;
  error: { code: string; message: string };
  request_id: string;
}

export interface QueuedResponse {
  success: true;
  status: "queued";
  request_id: string;
  email: string;
}

export type ReminderStatus = "pending" | "processing" | "sent" | "failed" | "cancelled";

export interface Reminder {
  id: string;
  title: string;
  note: string | null;
  remind_at: string;
  status: ReminderStatus;
  sent_at: string | null;
  created_at: string;
}
