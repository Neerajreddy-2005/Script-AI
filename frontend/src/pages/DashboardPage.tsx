import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { ChevronDown, Copy, FileText, Loader2, Mail, RotateCcw, Wand2 } from "lucide-react";
import { toast } from "sonner";
import KnowledgeBasePanel from "@/components/dashboard/KnowledgeBasePanel";
import RemindersPanel from "@/components/dashboard/RemindersPanel";
import ScriptInsights from "@/components/dashboard/ScriptInsights";
import VoicePanel from "@/components/dashboard/VoicePanel";
import { useAuth } from "@/contexts/auth-context";
import { ApiError, api } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  LENGTHS,
  PLATFORMS,
  TONES,
  type GenerateRequest,
  type GenerateResponse,
  type GenerationMode,
  type Length,
  type Platform,
  type Tone,
} from "@/types/api";

interface SelectFieldProps<T extends string> {
  id: string;
  label: string;
  value: T;
  options: readonly T[];
  onChange: (value: T) => void;
}

const SelectField = <T extends string>({ id, label, value, options, onChange }: SelectFieldProps<T>) => (
  <div>
    <label htmlFor={id} className="mb-2 block text-sm font-semibold text-text">
      {label}
    </label>
    <div className="relative">
      <select id={id} value={value} onChange={(e) => onChange(e.target.value as T)} className="input-field appearance-none pr-10">
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
    </div>
  </div>
);

interface FailedRequest {
  message: string;
  requestId?: string;
}

/** Values handed over by the home-page generator. */
interface PrefillState {
  topic?: string;
  tone?: Tone;
  platform?: Platform;
}

/** Removes production cues and source labels such as [B-roll] or [S1]. */
const stripCues = (text: string) => text.replace(/\[.*?\]/g, "");

const DashboardPage = () => {
  const prefill = (useLocation().state as PrefillState | null) ?? {};
  const [topic, setTopic] = useState(prefill.topic ?? "");
  const [platform, setPlatform] = useState<Platform>(prefill.platform ?? "YouTube");
  const [tone, setTone] = useState<Tone>(prefill.tone ?? "Casual");
  const [length, setLength] = useState<Length>("Short (2-3 min)");
  const [audience, setAudience] = useState("");
  const [keywords, setKeywords] = useState("");
  const [callToAction, setCallToAction] = useState("");
  const [mode, setMode] = useState<GenerationMode>("standard");
  const [useKnowledgeBase, setUseKnowledgeBase] = useState(false);
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [result, setResult] = useState<GenerateResponse | null>(null);
  const [failure, setFailure] = useState<FailedRequest | null>(null);
  const [selectedTab, setSelectedTab] = useState("editor");
  const navigate = useNavigate();
  const { signOut, user } = useAuth();

  const generation = useMutation({
    mutationFn: api.generateScript,
    onSuccess: (response) => {
      setResult(response);
      setFailure(null);
      const { validation } = response.metadata;
      if (validation.passed) toast.success(`Script generated for ${platform}!`);
      else toast.warning("Script generated, but some quality checks need attention.");
    },
    onError: async (error) => {
      const apiError = error instanceof ApiError ? error : null;
      // No mock fallback: show the real error so failures are visible and traceable.
      setFailure({ message: apiError?.message || "Failed to generate script", requestId: apiError?.requestId });
      toast.error(apiError?.message || "Failed to generate script");
      if (apiError?.status === 401) {
        await signOut();
        navigate("/login", { state: { from: "/dashboard" } });
      }
    },
  });

  const background = useMutation({
    mutationFn: api.generateInBackground,
    onSuccess: ({ email }) =>
      toast.success(`Working on it in the background. Your script will be emailed to ${email}. You can close this tab.`, { duration: 8000 }),
    onError: (error) => toast.error(error instanceof ApiError ? error.message : "Could not start background generation"),
  });

  const emailScript = useMutation({
    mutationFn: (r: GenerateResponse) => api.emailScript(r.data, platform, r.metadata.sources),
    onSuccess: ({ email }) => toast.success(`Sending the script to ${email}`),
    onError: (error) => toast.error(error instanceof ApiError ? error.message : "Could not email the script"),
  });

  const buildRequest = (): GenerateRequest | null => {
    if (topic.trim().length < 3) {
      toast.error("Please enter a topic (at least 3 characters)");
      return null;
    }
    const keywordList = keywords
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean)
      .slice(0, 10);
    const request: GenerateRequest = {
      topic: topic.trim(),
      platform,
      tone,
      length,
      mode,
      use_knowledge_base: useKnowledgeBase,
      ...(useKnowledgeBase && selectedDocIds.length ? { document_ids: selectedDocIds } : {}),
      ...(keywordList.length ? { keywords: keywordList } : {}),
      ...(audience.trim() ? { audience: audience.trim() } : {}),
      ...(callToAction.trim() ? { call_to_action: callToAction.trim() } : {}),
    };
    return request;
  };

  const generateScript = () => {
    const request = buildRequest();
    if (request) generation.mutate(request);
  };

  const generateInBackground = () => {
    const request = buildRequest();
    if (request) background.mutate(request);
  };

  const script = result?.data;
  const isGenerating = generation.isPending;

  const sections = useMemo(
    () =>
      script
        ? [
            { label: "Introduction", text: script.introduction.script },
            { label: "Main Content", text: script.mainContent.script },
            { label: "Conclusion", text: script.conclusion.script },
          ]
        : [],
    [script],
  );
  const voiceSections = useMemo(() => sections.map((s) => ({ ...s, text: stripCues(s.text) })), [sections]);

  return (
    <div className="aurora-soft min-h-screen pt-24 pb-16">
      <div className="container-page">
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="eyebrow">Script studio</p>
            <h1 className="mt-3 text-3xl font-extrabold text-text sm:text-4xl">
              {user?.user_metadata?.full_name ? `Hi ${String(user.user_metadata.full_name).split(" ")[0]}, what are we writing?` : "What are we writing today?"}
            </h1>
            <p className="mt-2 text-muted">Create scripts grounded in your brand knowledge, then listen, send and schedule them.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[380px_1fr]">
          <div className="space-y-6">
            <div className="card p-6">
              <h2 className="text-lg font-bold text-text">Script settings</h2>
              <div className="mt-5 space-y-5">
                <div>
                  <label htmlFor="topic" className="mb-2 block text-sm font-semibold text-text">
                    What's your topic?
                  </label>
                  <textarea
                    id="topic"
                    rows={3}
                    value={topic}
                    maxLength={300}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="e.g., Productivity tips for remote work"
                    className="input-field resize-none"
                  />
                </div>

                <SelectField<Platform> id="platform" label="Platform" value={platform} options={PLATFORMS} onChange={setPlatform} />

                <fieldset>
                  <legend className="mb-2 block text-sm font-semibold text-text">Tone</legend>
                  <div className="flex flex-wrap gap-2">
                    {TONES.map((t) => (
                      <button key={t} type="button" onClick={() => setTone(t)} aria-pressed={tone === t} className={cn("chip", tone === t && "chip-active")}>
                        {t}
                      </button>
                    ))}
                  </div>
                </fieldset>

                <SelectField<Length> id="length" label="Length" value={length} options={LENGTHS} onChange={setLength} />

                <details className="group rounded-xl border border-line px-4 py-3 [&_summary::-webkit-details-marker]:hidden">
                  <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold text-accent-text">
                    More options
                    <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
                  </summary>
                  <div className="mt-4 space-y-4">
                    <div>
                      <label htmlFor="audience" className="mb-2 block text-sm font-semibold text-text">
                        Audience
                      </label>
                      <input id="audience" className="input-field" maxLength={200} value={audience}
                        onChange={(e) => setAudience(e.target.value)} placeholder="e.g., busy first-time founders" />
                    </div>
                    <div>
                      <label htmlFor="keywords" className="mb-2 block text-sm font-semibold text-text">
                        Required keywords (comma-separated)
                      </label>
                      <input id="keywords" className="input-field" value={keywords}
                        onChange={(e) => setKeywords(e.target.value)} placeholder="e.g., focus, async, deep work" />
                    </div>
                    <div>
                      <label htmlFor="cta" className="mb-2 block text-sm font-semibold text-text">
                        Call to action
                      </label>
                      <input id="cta" className="input-field" maxLength={200} value={callToAction}
                        onChange={(e) => setCallToAction(e.target.value)} placeholder="e.g., Subscribe for weekly tips" />
                    </div>
                  </div>
                </details>

                <fieldset>
                  <legend className="mb-2 block text-sm font-semibold text-text">Mode</legend>
                  <div className="grid grid-cols-2 gap-2">
                    {(["standard", "assisted"] as const).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setMode(m)}
                        aria-pressed={mode === m}
                        className={cn(
                          "rounded-xl border px-3 py-2.5 text-left text-sm transition-colors",
                          mode === m ? "border-accent bg-accent-soft text-accent-text" : "border-line text-muted hover:border-accent/40",
                        )}
                      >
                        <span className="block font-semibold capitalize">{m}</span>
                        <span className="block text-xs">{m === "standard" ? "One pass, fastest" : "Checks and revises"}</span>
                      </button>
                    ))}
                  </div>
                </fieldset>

                <button type="button" className="btn-primary w-full py-3" onClick={generateScript} disabled={isGenerating}>
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {mode === "assisted" ? "Writing and checking…" : "Generating…"}
                    </>
                  ) : (
                    <>
                      <Wand2 className="h-4 w-4" /> Generate script
                    </>
                  )}
                </button>
                <button
                  type="button"
                  className="btn-secondary w-full py-2.5 text-sm"
                  onClick={generateInBackground}
                  disabled={background.isPending || isGenerating}
                  title="Generate without waiting; the script is emailed to you"
                >
                  <Mail className="h-4 w-4" />
                  {background.isPending ? "Queuing…" : "Generate in background & email me"}
                </button>
              </div>
            </div>

            <KnowledgeBasePanel
              enabled={useKnowledgeBase}
              onEnabledChange={setUseKnowledgeBase}
              selectedIds={selectedDocIds}
              onSelectedIdsChange={setSelectedDocIds}
            />

            <RemindersPanel suggestedTitle={script?.title} userEmail={user?.email} />
          </div>

          <div className="min-w-0">
            {failure && !isGenerating && (
              <div role="alert" className="mb-4 rounded-2xl border border-danger/20 bg-danger/5 p-4 text-sm text-danger">
                <p className="font-semibold">Generation failed</p>
                <p>{failure.message}</p>
                {failure.requestId && <p className="mt-1 text-xs opacity-80">Request ID: {failure.requestId}</p>}
              </div>
            )}
            {script && result ? (
              <div className="card p-6 sm:p-8">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                  <div>
                    <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-semibold text-accent-text">
                      {platform} · {tone}
                    </span>
                    <h2 className="mt-3 text-2xl font-bold text-text">{script.title}</h2>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      className="btn-secondary px-3.5 py-2 text-sm"
                      onClick={() => {
                        navigator.clipboard.writeText(sections.map((s) => s.text).join("\n\n"));
                        toast.success("Script copied to clipboard");
                      }}
                    >
                      <Copy className="h-4 w-4" /> Copy
                    </button>
                    <button className="btn-secondary px-3.5 py-2 text-sm" onClick={() => emailScript.mutate(result)} disabled={emailScript.isPending}>
                      <Mail className="h-4 w-4" />
                      {emailScript.isPending ? "Sending…" : "Email me"}
                    </button>
                    <button className="btn-secondary px-3.5 py-2 text-sm" onClick={() => setResult(null)}>
                      <RotateCcw className="h-4 w-4" /> Reset
                    </button>
                  </div>
                </div>

                <div className="mt-6 inline-flex rounded-full bg-surface p-1">
                  {["editor", "preview"].map((tab) => (
                    <button
                      key={tab}
                      className={cn(
                        "rounded-full px-5 py-1.5 text-sm font-semibold capitalize transition-colors",
                        selectedTab === tab ? "bg-white text-text shadow-sm" : "text-muted hover:text-text",
                      )}
                      onClick={() => setSelectedTab(tab)}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                <div className="mt-6">
                  {selectedTab === "editor" ? (
                    <div className="space-y-5">
                      {sections.map(({ label, text }) => (
                        <div key={label}>
                          <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-accent-text">{label}</h3>
                          <div className="rounded-2xl bg-surface p-5 leading-relaxed text-text" style={{ whiteSpace: "pre-line" }}>
                            {text}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-line p-6 sm:p-8">
                      <div className="prose max-w-none" style={{ whiteSpace: "pre-line" }}>
                        {/* Preview hides production cues and source labels such as [B-roll] or [S1]. */}
                        {voiceSections.map(({ label, text }) => (
                          <p key={label}>{text}</p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-6">
                  <VoicePanel sections={voiceSections} />
                </div>

                <ScriptInsights metadata={result.metadata} />
              </div>
            ) : (
              <div className="card flex min-h-[480px] items-center justify-center p-6">
                <div className="max-w-sm text-center">
                  <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-soft text-accent-text">
                    {isGenerating ? <Loader2 className="h-7 w-7 animate-spin" /> : <FileText className="h-7 w-7" />}
                  </span>
                  <h2 className="mt-5 text-lg font-bold text-text">{isGenerating ? "Writing your script…" : "Your script will appear here"}</h2>
                  <p className="mt-2 text-muted">
                    {isGenerating
                      ? "This usually takes a few seconds."
                      : "Fill in the settings and press Generate. You'll be able to listen to it, email it and set a reminder."}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
