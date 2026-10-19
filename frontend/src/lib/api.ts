import { supabase } from "@/integrations/supabase/client";
import type {
  ApiErrorBody,
  GenerateRequest,
  GenerateResponse,
  KnowledgeDocument,
  QueuedResponse,
  Reminder,
  ScriptData,
  SourceRef,
} from "@/types/api";

const trimSlash = (url: string) => url.replace(/\/+$/, "");
const BASE_URL = trimSlash(import.meta.env.VITE_BACKEND_URL || "http://localhost:8000");
// When set, script generation goes through the n8n gateway workflow
// (Webhook -> FastAPI -> Python cleaner -> response). Knowledge-base calls always go to FastAPI.
const N8N_WEBHOOK_URL = import.meta.env.VITE_N8N_WEBHOOK_URL ? trimSlash(import.meta.env.VITE_N8N_WEBHOOK_URL) : null;
export const GENERATE_URL = N8N_WEBHOOK_URL ? `${N8N_WEBHOOK_URL}/api/generate-script` : `${BASE_URL}/api/generate-script`;

/** Error with the backend's safe error code and the request ID for support/debugging. */
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string,
    public readonly requestId?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function authHeader(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const url = path.startsWith("http") ? path : `${BASE_URL}${path}`;
  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      headers: { ...(await authHeader()), ...(init.headers || {}) },
    });
  } catch {
    const target = url === GENERATE_URL && N8N_WEBHOOK_URL ? "the n8n workflow (is n8n running and the workflow active?)" : "the Script-AI backend";
    throw new ApiError(`Cannot reach ${target}.`, 0, "network_error");
  }

  if (response.status === 204) return undefined as T;

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const err = (body as ApiErrorBody | null)?.error;
    throw new ApiError(
      // FastAPI errors use {error: {message}}; n8n's own failures use {message}.
      err?.message || (body as { message?: string } | null)?.message || `Request failed (${response.status})`,
      response.status,
      err?.code || "http_error",
      (body as ApiErrorBody | null)?.request_id || response.headers.get("x-request-id") || undefined,
    );
  }
  return body as T;
}

const json = (data: unknown): RequestInit => ({
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(data),
});

export const api = {
  generateScript: (req: GenerateRequest) => request<GenerateResponse>(GENERATE_URL, json(req)),

  listDocuments: async () =>
    (await request<{ documents: KnowledgeDocument[] }>("/api/knowledge/documents")).documents,

  uploadDocument: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return request<{ document: KnowledgeDocument; duplicate: boolean }>("/api/knowledge/documents", {
      method: "POST",
      body: form,
    });
  },

  deleteDocument: (id: string) => request<void>(`/api/knowledge/documents/${encodeURIComponent(id)}`, { method: "DELETE" }),

  /** Generate without waiting: FastAPI works in the background and n8n emails the result. */
  generateInBackground: (req: GenerateRequest) => request<QueuedResponse>("/api/generate-script/background", json(req)),

  /** Email the script on screen to the signed-in user's own address (sent by n8n). */
  emailScript: (script: ScriptData, platform: string, sources: SourceRef[]) =>
    request<QueuedResponse>(
      "/api/scripts/email",
      json({ script, platform, sources: sources.map((s) => ({ id: s.id, filename: s.filename })) }),
    ),

  listReminders: async () => (await request<{ reminders: Reminder[] }>("/api/reminders")).reminders,

  createReminder: async (title: string, remindAt: Date, note?: string) =>
    (await request<{ reminder: Reminder }>(
      "/api/reminders",
      json({ title, remind_at: remindAt.toISOString(), ...(note ? { note } : {}) }),
    )).reminder,

  cancelReminder: (id: string) => request<void>(`/api/reminders/${encodeURIComponent(id)}`, { method: "DELETE" }),
};

export const UPLOAD_ACCEPT = ".txt,.md,.pdf";
export const MAX_UPLOAD_MB = 5;
