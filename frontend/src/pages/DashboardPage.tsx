import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { Mail } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import KnowledgeBasePanel from "@/components/dashboard/KnowledgeBasePanel";
import RemindersPanel from "@/components/dashboard/RemindersPanel";
import ScriptInsights from "@/components/dashboard/ScriptInsights";
import { useAuth } from "@/contexts/auth-context";
import { ApiError, api } from "@/lib/api";
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
    <label htmlFor={id} className="block text-sm font-medium text-scriptai-darkgray mb-2">
      {label}
    </label>
    <div className="relative">
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="input-field appearance-none pr-10 cursor-pointer"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
      <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none">
        <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  </div>
);

interface FailedRequest {
  message: string;
  requestId?: string;
}

const DashboardPage = () => {
  const [topic, setTopic] = useState("");
  const [platform, setPlatform] = useState<Platform>("YouTube");
  const [tone, setTone] = useState<Tone>("Casual");
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

  return (
    <div className="min-h-screen pt-24 pb-16 bg-scriptai-gray">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-scriptai-black">Your Script Dashboard</h1>
          <p className="text-scriptai-darkgray mt-2">
            Create professional scripts grounded in your own brand knowledge.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="col-span-1 space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold text-scriptai-black mb-6">Script Parameters</h2>
              <div className="space-y-6">
                <div>
                  <label htmlFor="topic" className="block text-sm font-medium text-scriptai-darkgray mb-2">
                    What's your topic?
                  </label>
                  <input
                    id="topic"
                    type="text"
                    value={topic}
                    maxLength={300}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="e.g., Productivity tips for remote work"
                    className="input-field"
                  />
                </div>

                <SelectField<Platform> id="platform" label="Platform" value={platform} options={PLATFORMS} onChange={setPlatform} />
                <SelectField<Tone> id="tone" label="Tone" value={tone} options={TONES} onChange={setTone} />
                <SelectField<Length> id="length" label="Length" value={length} options={LENGTHS} onChange={setLength} />

                <details className="group">
                  <summary className="cursor-pointer text-sm font-medium text-scriptai-blue">More options</summary>
                  <div className="mt-4 space-y-4">
                    <div>
                      <label htmlFor="audience" className="block text-sm font-medium text-scriptai-darkgray mb-2">
                        Audience
                      </label>
                      <input id="audience" className="input-field" maxLength={200} value={audience}
                        onChange={(e) => setAudience(e.target.value)} placeholder="e.g., busy first-time founders" />
                    </div>
                    <div>
                      <label htmlFor="keywords" className="block text-sm font-medium text-scriptai-darkgray mb-2">
                        Required keywords (comma-separated)
                      </label>
                      <input id="keywords" className="input-field" value={keywords}
                        onChange={(e) => setKeywords(e.target.value)} placeholder="e.g., focus, async, deep work" />
                    </div>
                    <div>
                      <label htmlFor="cta" className="block text-sm font-medium text-scriptai-darkgray mb-2">
                        Call to action
                      </label>
                      <input id="cta" className="input-field" maxLength={200} value={callToAction}
                        onChange={(e) => setCallToAction(e.target.value)} placeholder="e.g., Subscribe for weekly tips" />
                    </div>
                  </div>
                </details>

                <fieldset>
                  <legend className="block text-sm font-medium text-scriptai-darkgray mb-2">Mode</legend>
                  <div className="grid grid-cols-2 gap-2">
                    {(["standard", "assisted"] as const).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setMode(m)}
                        aria-pressed={mode === m}
                        className={`rounded-lg border px-3 py-2 text-sm text-left transition-colors ${
                          mode === m ? "border-scriptai-blue bg-blue-50 text-scriptai-blue" : "border-gray-200 text-scriptai-darkgray"
                        }`}
                      >
                        <span className="block font-medium capitalize">{m}</span>
                        <span className="block text-xs">{m === "standard" ? "One pass, fastest" : "Checks and revises"}</span>
                      </button>
                    ))}
                  </div>
                </fieldset>

                <Button className="w-full btn-primary" onClick={generateScript} disabled={isGenerating}>
                  {isGenerating ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      {mode === "assisted" ? "Writing and checking..." : "Generating..."}
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M6.672 1.911a1 1 0 10-1.932.518l.259.966a1 1 0 001.932-.518l-.26-.966zM2.429 4.74a1 1 0 10-.517 1.932l.966.259a1 1 0 00.517-1.932l-.966-.26zm8.814-.569a1 1 0 00-1.415-1.414l-.707.707a1 1 0 101.415 1.414l.707-.708zm-7.071 7.072l.707-.707A1 1 0 003.465 9.12l-.708.707a1 1 0 001.415 1.415zm3.2-5.171a1 1 0 00-1.3 1.3l4 10a1 1 0 001.823.075l1.38-2.759 3.018 3.02a1 1 0 001.414-1.415l-3.019-3.02 2.76-1.379a1 1 0 00-.076-1.822l-10-4z" clipRule="evenodd" />
                      </svg>
                      Generate Script
                    </>
                  )}
                </Button>
                <button
                  type="button"
                  className="btn-secondary w-full py-2 flex items-center justify-center gap-2 text-sm"
                  onClick={generateInBackground}
                  disabled={background.isPending || isGenerating}
                  title="Generate without waiting; the script is emailed to you"
                >
                  <Mail className="h-4 w-4" />
                  {background.isPending ? "Queuing..." : "Generate in background & email me"}
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

          <div className="col-span-1 md:col-span-2">
            {failure && !isGenerating && (
              <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                <p className="font-medium">Generation failed</p>
                <p>{failure.message}</p>
                {failure.requestId && <p className="mt-1 text-xs text-red-600">Request ID: {failure.requestId}</p>}
              </div>
            )}
            {script && result ? (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold text-scriptai-black">{script.title}</h2>
                  <div className="flex space-x-2">
                    <button
                      className="flex items-center text-sm text-scriptai-darkgray hover:text-scriptai-black transition-colors"
                      onClick={() => {
                        navigator.clipboard.writeText(
                          `${script.introduction.script}\n\n${script.mainContent.script}\n\n${script.conclusion.script}`,
                        );
                        toast.success("Script copied to clipboard");
                      }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M8 2a1 1 0 000 2h2a1 1 0 100-2H8z" />
                        <path d="M3 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v6h-4.586l1.293-1.293a1 1 0 00-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L10.414 13H15v3a2 2 0 01-2 2H5a2 2 0 01-2-2V5zM15 11h2a1 1 0 110 2h-2v-2z" />
                      </svg>
                      Copy
                    </button>
                    <button
                      className="flex items-center text-sm text-scriptai-darkgray hover:text-scriptai-black transition-colors"
                      onClick={() => emailScript.mutate(result)}
                      disabled={emailScript.isPending}
                    >
                      <Mail className="h-4 w-4 mr-1" />
                      {emailScript.isPending ? "Sending..." : "Email me"}
                    </button>
                    <button
                      className="flex items-center text-sm text-scriptai-darkgray hover:text-scriptai-black transition-colors"
                      onClick={() => setResult(null)}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                      </svg>
                      Reset
                    </button>
                  </div>
                </div>

                <div className="mb-4">
                  <div className="flex space-x-1 border-b border-gray-200">
                    {["editor", "preview"].map((tab) => (
                      <button
                        key={tab}
                        className={`px-4 py-2 text-sm font-medium capitalize transition-colors ${
                          selectedTab === tab
                            ? "border-b-2 border-scriptai-blue text-scriptai-blue"
                            : "text-scriptai-darkgray hover:text-scriptai-black"
                        }`}
                        onClick={() => setSelectedTab(tab)}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>
                </div>

                {selectedTab === "editor" ? (
                  <div className="space-y-6">
                    {([
                      ["Introduction", script.introduction.script],
                      ["Main Content", script.mainContent.script],
                      ["Conclusion", script.conclusion.script],
                    ] as const).map(([heading, text]) => (
                      <div key={heading}>
                        <h3 className="text-lg font-medium text-scriptai-blue mb-2">{heading}</h3>
                        <div className="p-4 bg-gray-50 rounded-lg" style={{ whiteSpace: "pre-line" }}>
                          {text}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-gray-50 p-6 rounded-lg">
                    <h3 className="text-lg font-medium mb-4">Script Preview</h3>
                    <div className="prose max-w-none" style={{ whiteSpace: "pre-line" }}>
                      {/* Preview hides production cues and source labels such as [B-roll] or [S1]. */}
                      <p>{script.introduction.script.replace(/\[.*?\]/g, "")}</p>
                      <p>{script.mainContent.script.replace(/\[.*?\]/g, "")}</p>
                      <p>{script.conclusion.script.replace(/\[.*?\]/g, "")}</p>
                    </div>
                  </div>
                )}

                <ScriptInsights metadata={result.metadata} />
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm p-6 flex items-center justify-center" style={{ minHeight: "400px" }}>
                <div className="text-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-scriptai-blue/30 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  <p className="text-scriptai-darkgray">
                    {isGenerating ? "Writing your script..." : "Your script will appear here after generation."}
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
