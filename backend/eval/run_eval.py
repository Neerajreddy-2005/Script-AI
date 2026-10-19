"""Script-AI evaluation runner.

Offline (default, free, deterministic): fake LLM + hashed bag-of-words embeddings.
    python -m eval.run_eval

Live: uses the LLM and embedding providers configured in backend/.env.
    python -m eval.run_eval --live

Writes eval/results/report.md and eval/results/results.json.
Metrics:
  retrieval  - hit@k, recall@k (by expected file), MRR, no-context accuracy
  generation - validation pass rate, avg LLM calls, latency, source correctness,
               forbidden-phrase violations (injection / conflict / brand rules),
               standard vs assisted mode, with vs without the knowledge base
"""

import argparse
import json
import statistics
import sys
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

from app.core.auth import CurrentUser
from app.core.config import Settings, get_settings
from app.core.errors import AppError
from app.repositories.memory import InMemoryRepository
from app.schemas.generation import GenerateRequest
from app.services.embeddings import HashEmbedder, build_embedder
from app.services.generation import GenerationService
from app.services.knowledge import KnowledgeService
from app.services.llm import FakeLLM, build_llm
from app.services.prompts import build_search_query

HERE = Path(__file__).resolve().parent
EVAL_USER = CurrentUser(id="00000000-0000-0000-0000-00000000e7a1", tier="premium")


@dataclass
class RetrievalScore:
	case_id: str
	category: str
	expected: list[str]
	retrieved_files: list[str]
	hit: bool
	recall: float
	reciprocal_rank: float
	no_context_correct: bool | None


def build_services(live: bool, top_k: int):
	settings = get_settings() if live else Settings(_env_file=None, embedding_dim=768)
	settings = settings.model_copy(update={"rag_top_k": top_k, "quota_premium": 10_000})
	repo = InMemoryRepository()
	embedder = build_embedder(settings) if live else HashEmbedder(settings.embedding_dim)
	llm = build_llm(settings) if live else FakeLLM()
	knowledge = KnowledgeService(repo, embedder, settings)
	return settings, knowledge, GenerationService(llm, knowledge, repo, settings), llm, embedder


def ingest_corpus(knowledge: KnowledgeService) -> dict[str, str]:
	ids = {}
	for path in sorted((HERE / "corpus").glob("*.md")):
		doc, _ = knowledge.upload(EVAL_USER.id, path.name, path.read_bytes())
		ids[path.name] = doc.id
	return ids


def score_retrieval(knowledge: KnowledgeService, case: dict, k: int) -> RetrievalScore:
	req = GenerateRequest(**case["brief"])
	result = knowledge.retrieve(EVAL_USER.id, build_search_query(req), top_k=k)
	files = [h.filename for h in result.chunks]
	expected = case["expected_files"]
	if not expected:
		return RetrievalScore(case["id"], case["category"], expected, files, hit=not files, recall=1.0 if not files else 0.0,
			reciprocal_rank=1.0 if not files else 0.0, no_context_correct=not files)
	found = [f for f in expected if f in files]
	first = next((i for i, f in enumerate(files) if f in expected), None)
	return RetrievalScore(case["id"], case["category"], expected, files, hit=bool(found), recall=len(found) / len(expected),
		reciprocal_rank=1 / (first + 1) if first is not None else 0.0, no_context_correct=None)


def run_generation(service: GenerationService, case: dict, mode: str, use_kb: bool) -> dict:
	req = GenerateRequest(**case["brief"], mode=mode, use_knowledge_base=use_kb)
	started = time.perf_counter()
	try:
		resp = service.generate(EVAL_USER, req, request_id=f"eval-{case['id']}-{mode}-{int(use_kb)}")
	except AppError as exc:
		return {"case": case["id"], "mode": mode, "kb": use_kb, "ok": False, "error": exc.code,
			"latency_ms": int((time.perf_counter() - started) * 1000)}
	meta = resp.metadata
	text = (resp.data.title + "\n" + resp.data.full_text()).lower()
	violations = [p for p in case["forbidden_phrases"] if p.lower() in text]
	cited_files = [s.filename for s in meta.sources]
	return {
		"case": case["id"],
		"category": case["category"],
		"mode": mode,
		"kb": use_kb,
		"ok": True,
		"validation_passed": meta.validation.passed,
		"validation_errors": [i.code for i in meta.validation.issues if i.severity == "error"],
		"llm_calls": meta.usage.llm_calls,
		"input_tokens": meta.usage.input_tokens,
		"output_tokens": meta.usage.output_tokens,
		"cost_usd": meta.usage.estimated_cost_usd,
		"latency_ms": meta.duration_ms,
		"kb_status": meta.knowledge_base.status,
		"sources": cited_files,
		# Every cited source must be a retrieved chunk (enforced) AND, for labeled cases, an expected file.
		"sources_correct": all(f in case["expected_files"] for f in cited_files) if case["expected_files"] else not cited_files,
		"forbidden_violations": violations,
	}


def pct(values: list[bool]) -> str:
	return f"{100 * sum(values) / len(values):.0f}%" if values else "n/a"


def mean(values: list[float]) -> float:
	return statistics.mean(values) if values else 0.0


def p95(values: list[int]) -> int:
	if not values:
		return 0
	ordered = sorted(values)
	return ordered[min(len(ordered) - 1, int(0.95 * len(ordered)))]


def build_report(meta: dict, retrieval: list[RetrievalScore], generations: list[dict]) -> str:
	labeled = [r for r in retrieval if r.expected]
	no_ctx = [r for r in retrieval if not r.expected]
	lines = [
		"# Script-AI Evaluation Report",
		"",
		f"- Run: {meta['timestamp']}",
		f"- Mode: **{meta['mode']}** (LLM: `{meta['llm']}`, embeddings: `{meta['embedder']}`)",
		f"- Dataset: {meta['cases']} briefs, {meta['documents']} reference documents, top_k={meta['top_k']}, "
		f"min_similarity={meta['min_similarity']}",
		"",
	]
	if meta["mode"] == "offline":
		lines += [
			"> Offline mode uses a deterministic fake LLM and hashed bag-of-words embeddings. Retrieval numbers",
			"> measure lexical matching and the pipeline itself; generation numbers check plumbing (validation,",
			"> citations, workflow), not writing quality. Run with `--live` for real-model results.",
			"",
		]
	lines += [
		"## Retrieval",
		"",
		"| Metric | Value |",
		"|---|---|",
		f"| Hit@{meta['top_k']} (labeled briefs) | {pct([r.hit for r in labeled])} |",
		f"| Recall@{meta['top_k']} by expected file | {mean([r.recall for r in labeled]):.2f} |",
		f"| MRR | {mean([r.reciprocal_rank for r in labeled]):.2f} |",
		f"| No-context accuracy (unrelated briefs return nothing) | {pct([bool(r.no_context_correct) for r in no_ctx])} |",
		"",
		"| Case | Category | Expected | Retrieved (ranked files) | Recall |",
		"|---|---|---|---|---|",
	]
	for r in retrieval:
		ranked = ", ".join(dict.fromkeys(r.retrieved_files)) or "-"
		lines.append(f"| {r.case_id} | {r.category} | {', '.join(r.expected) or '(none)'} | {ranked} | {r.recall:.2f} |")

	lines += ["", "## Generation", "", "| Configuration | Runs | Errors | Validation pass | Avg LLM calls | Median latency ms | p95 latency ms | Sources correct | Forbidden-phrase violations |", "|---|---|---|---|---|---|---|---|---|"]
	for mode in ("standard", "assisted"):
		for kb in (False, True):
			runs = [g for g in generations if g["mode"] == mode and g["kb"] == kb]
			ok = [g for g in runs if g["ok"]]
			lat = [g["latency_ms"] for g in ok]
			lines.append(
				f"| {mode}, {'with' if kb else 'without'} KB | {len(runs)} | {len(runs) - len(ok)} | "
				f"{pct([g['validation_passed'] for g in ok])} | {mean([g['llm_calls'] for g in ok]):.2f} | "
				f"{int(statistics.median(lat)) if lat else 0} | {p95(lat)} | "
				f"{pct([g['sources_correct'] for g in ok]) if kb else 'n/a'} | "
				f"{sum(len(g['forbidden_violations']) for g in ok)} |"
			)
	failures = [g for g in generations if not g["ok"] or g["forbidden_violations"] or not g.get("validation_passed", True)]
	lines += ["", "## Failures and violations", ""]
	if not failures:
		lines.append("None.")
	for g in failures:
		detail = g.get("error") or ", ".join(g.get("validation_errors", []) + [f"forbidden: {v}" for v in g["forbidden_violations"]])
		lines.append(f"- `{g['case']}` ({g['mode']}, kb={g['kb']}): {detail}")
	costs = [g["cost_usd"] for g in generations if g.get("cost_usd") is not None]
	lines += [
		"",
		"## Cost",
		"",
		f"Total estimated cost: ${sum(costs):.4f}" if costs else
		"Unavailable: set LLM_INPUT_COST_PER_MTOK / LLM_OUTPUT_COST_PER_MTOK to estimate cost.",
		"",
	]
	return "\n".join(lines)


def main(argv: list[str] | None = None) -> int:
	parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
	parser.add_argument("--live", action="store_true", help="use providers from backend/.env (may cost money)")
	parser.add_argument("--k", type=int, default=5, help="retrieval top_k")
	parser.add_argument("--retrieval-only", action="store_true", help="skip generation (no LLM calls)")
	parser.add_argument("--out", type=Path, default=HERE / "results")
	args = parser.parse_args(argv)

	dataset = json.loads((HERE / "dataset.json").read_text(encoding="utf-8"))
	cases = dataset["cases"]
	settings, knowledge, service, llm, embedder = build_services(args.live, args.k)
	doc_ids = ingest_corpus(knowledge)

	retrieval = [score_retrieval(knowledge, c, args.k) for c in cases]
	generations: list[dict] = []
	if not args.retrieval_only:
		for case in cases:
			for mode in ("standard", "assisted"):
				for use_kb in (False, True):
					generations.append(run_generation(service, case, mode, use_kb))

	meta = {
		"timestamp": datetime.now(timezone.utc).isoformat(timespec="seconds"),
		"mode": "live" if args.live else "offline",
		"llm": f"{llm.provider}/{llm.model}",
		"embedder": embedder.model,
		"cases": len(cases),
		"documents": len(doc_ids),
		"top_k": args.k,
		"min_similarity": settings.rag_min_similarity,
		"dataset_version": dataset["version"],
	}
	args.out.mkdir(parents=True, exist_ok=True)
	(args.out / "results.json").write_text(
		json.dumps({"meta": meta, "retrieval": [r.__dict__ for r in retrieval], "generations": generations}, indent=2),
		encoding="utf-8",
	)
	report = build_report(meta, retrieval, generations)
	(args.out / "report.md").write_text(report, encoding="utf-8")
	print(report)
	return 0


if __name__ == "__main__":
	sys.exit(main())
