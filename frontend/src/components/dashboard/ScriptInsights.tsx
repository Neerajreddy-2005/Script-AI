import { AlertTriangle, BookOpen, CheckCircle2, CircleSlash, XCircle } from "lucide-react";
import type { GenerationMetadata } from "@/types/api";

const KB_LABEL: Record<GenerationMetadata["knowledge_base"]["status"], string> = {
  disabled: "Knowledge base not used",
  used: "Grounded in your knowledge base",
  no_relevant_context: "No relevant documents found; script written without document facts",
  unavailable: "Knowledge base unavailable; script written without document facts",
};

const StepIcon = ({ status }: { status: string }) =>
  status === "ok" ? (
    <CheckCircle2 className="h-4 w-4 text-green-600" />
  ) : status === "failed" ? (
    <XCircle className="h-4 w-4 text-red-600" />
  ) : (
    <CircleSlash className="h-4 w-4 text-gray-400" />
  );

const ScriptInsights = ({ metadata }: { metadata: GenerationMetadata }) => {
  const { validation, sources, workflow, usage, knowledge_base: kb, quota } = metadata;
  const [low, high] = validation.target_words;

  return (
    <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
      <section className="rounded-lg border border-gray-100 p-4">
        <h3 className="flex items-center gap-2 font-medium text-scriptai-black mb-2">
          {validation.passed ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <AlertTriangle className="h-4 w-4 text-amber-600" />}
          Quality checks {validation.passed ? "passed" : "need attention"}
        </h3>
        <p className="text-sm text-scriptai-darkgray">
          {validation.word_count} words (target {low}-{high})
        </p>
        {validation.issues.length > 0 && (
          <ul className="mt-2 space-y-1 text-sm">
            {validation.issues.map((issue) => (
              <li key={issue.code + issue.message} className={issue.severity === "error" ? "text-red-700" : "text-amber-700"}>
                {issue.severity === "error" ? "✗" : "!"} {issue.message}
              </li>
            ))}
          </ul>
        )}
        {!validation.passed && metadata.mode === "standard" && (
          <p className="mt-2 text-xs text-scriptai-darkgray">Tip: switch to Assisted mode to let Script-AI revise automatically.</p>
        )}
      </section>

      <section className="rounded-lg border border-gray-100 p-4">
        <h3 className="flex items-center gap-2 font-medium text-scriptai-black mb-2">
          <BookOpen className="h-4 w-4 text-scriptai-blue" /> Sources
        </h3>
        <p className="text-sm text-scriptai-darkgray">{KB_LABEL[kb.status]}</p>
        {sources.length > 0 && (
          <ul className="mt-2 space-y-2">
            {sources.map((src) => (
              <li key={src.id} className="text-sm">
                <span className="font-medium text-scriptai-blue">[{src.id}]</span>{" "}
                <span className="font-medium">{src.filename}</span>
                {src.section && <span className="text-scriptai-darkgray"> · {src.section}</span>}
                {src.page_number && <span className="text-scriptai-darkgray"> · p. {src.page_number}</span>}
                <p className="text-xs text-scriptai-darkgray mt-0.5 line-clamp-2">{src.snippet}</p>
              </li>
            ))}
          </ul>
        )}
        {kb.status === "used" && sources.length === 0 && (
          <p className="mt-2 text-xs text-amber-700">Documents were retrieved but the script did not cite any of them.</p>
        )}
      </section>

      <section className="rounded-lg border border-gray-100 p-4 lg:col-span-2">
        <h3 className="font-medium text-scriptai-black mb-2">Workflow ({metadata.mode})</h3>
        <ol className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-scriptai-darkgray">
          {workflow.map((step, i) => (
            <li key={`${step.name}-${i}`} className="flex items-center gap-1">
              <StepIcon status={step.status} />
              {step.name.replace(/_/g, " ")}
              {step.detail && <span className="text-xs">({step.detail})</span>}
              <span className="text-xs text-gray-400">{step.duration_ms} ms</span>
            </li>
          ))}
        </ol>
        <p className="mt-3 text-xs text-gray-500">
          {usage.provider}/{usage.model} · {usage.llm_calls} model call{usage.llm_calls === 1 ? "" : "s"}
          {usage.input_tokens != null && usage.output_tokens != null && ` · ${usage.input_tokens + usage.output_tokens} tokens`}
          {usage.estimated_cost_usd != null && ` · ~$${usage.estimated_cost_usd.toFixed(4)}`}
          {` · ${(metadata.duration_ms / 1000).toFixed(1)} s`}
          {quota && ` · ${quota.remaining}/${quota.limit} generations left today`}
          {` · request ${metadata.request_id.slice(0, 8)}`}
        </p>
      </section>
    </div>
  );
};

export default ScriptInsights;
