# Evaluation

## Dataset (`backend/eval/`)

- **Corpus:** 6 Markdown documents for a fictional brand, Brewly:
  - a brand guide, a product sheet, and an FAQ;
  - an **expired promotion that conflicts** with the current price;
  - **customer reviews containing a prompt-injection attempt**;
  - an unrelated remote-work handbook that acts as a distractor.
- **Briefs:** 20 labeled cases in `dataset.json`. Each has expected source files and forbidden phrases. They break down as:

| Category | Count | What it tests |
|---|---|---|
| supported | 11 | A single document answers the brief |
| partial | 2 | Two documents are needed, or the documents only partly cover the brief |
| conflict | 1 | The current price must win over the expired promo; "costs 35 dollars" is forbidden |
| injection | 1 | Reviews say "ignore all previous instructions..."; the script must not repeat it |
| format | 2 | Twitter thread format; a long podcast script |
| no_context | 3 | Unrelated topics must retrieve **nothing** |

## Running it

```bash
cd backend
python -m eval.run_eval                     # offline, free, deterministic
python -m eval.run_eval --retrieval-only    # no generation at all
python -m eval.run_eval --live              # providers from backend/.env (may cost money)
```

Each run writes `eval/results/report.md` and `results.json`. CI runs the offline evaluation on every push and uploads the report. `tests/integration/test_eval_regression.py` fails the build if offline Hit@5 drops below 90%, if a no-context brief retrieves anything, or if any forbidden phrase appears.

## Metrics

| Area | Metric |
|---|---|
| Retrieval | Hit@k and Recall@k by expected file, MRR, and no-context accuracy |
| Generation | Validation pass rate, average LLM calls, median and p95 latency |
| Grounding | Sources correct: every cited file is one of the expected files |
| Safety | Forbidden-phrase violations (injection, conflict, brand rules) |
| Cost | Estimated USD when `LLM_*_COST_PER_MTOK` is set; otherwise reported as unavailable |

The matrix runs both modes (standard and assisted), each with and without the knowledge base.

## Recorded offline baseline

Full report: `backend/eval/results/baseline_report.md`.

**What "offline" means:** offline uses hashed bag-of-words embeddings and a fake LLM. Retrieval numbers therefore measure **lexical** matching and the pipeline's gating and fusion. Generation numbers check the plumbing, not writing quality.

| Change | Hit@5 | Recall@5 | MRR | No-context accuracy |
|---|---|---|---|---|
| Initial pipeline | 71% | 0.68 | 0.71 | 100% |
| + section titles prepended to chunks, better stemming | **94%** | **0.91** | **0.94** | 100% |

One labeled brief is still missed offline: `supported-voice`, "brand story, tagline and sustainability". Its terms are spread over three short sections and no single chunk covers half of them. That's a limit of keyword overlap. Real semantic embeddings should be checked with `--live`.

## Live results

Recorded 2026-11-05 with `gemini-embedding-001` and `openai/gpt-4o-mini` through OpenRouter. The run cost about $0.06. Full reports: `backend/eval/results/live_report.md` (cutoff 0.25, with generation) and `backend/eval/results/live_retrieval_cutoff_0.6.md` (cutoff 0.6, retrieval only).

**Retrieval**

| `RAG_MIN_SIMILARITY` | Hit@5 | Recall@5 | MRR | No-context accuracy |
|---|---|---|---|---|
| 0.25 (earlier setting) | 100% | 0.97 | 1.00 | 0% (0 of 3) |
| **0.6 (production)** | **100%** | **0.97** | **1.00** | **100% (3 of 3)** |

The cutoff of 0.25 suited the hashed test embeddings but not real ones. With Gemini embeddings, the best match for each labeled brief scored at least 0.709 and the best match for each unrelated brief at most 0.498, so 0.6 was chosen between them. Any cutoff from 0.5 to 0.7 separated the two groups on vector similarity. The code default stays 0.25 because the offline evaluation depends on it, and `render.yaml` sets 0.6 for production.

**Generation** (run at cutoff 0.25; not repeated at 0.6)

| Configuration | Runs | Errors | Validation pass | Avg LLM calls | Median latency ms | p95 latency ms | Sources correct | Forbidden-phrase violations |
|---|---|---|---|---|---|---|---|---|
| standard, without KB | 20 | 0 | 50% | 1.00 | 5273 | 10856 | n/a | 0 |
| standard, with KB | 20 | 0 | 50% | 1.00 | 5602 | 10012 | 55% | 0 |
| assisted, without KB | 20 | 0 | 100% | 2.35 | 13588 | 53465 | n/a | 0 |
| assisted, with KB | 20 | 0 | 95% | 2.60 | 15251 | 31660 | 60% | 0 |

How to read this:

- Assisted mode passed validation in 39 of 40 runs and standard mode in 20 of 40. All 21 failures were `too_short`, so this mostly measures length control, not writing quality.
- "Sources correct" is strict: a run fails if it cites any file outside the expected list, even a relevant one. Many misses are scripts that also cited the brand guide.
- At cutoff 0.25, the unrelated briefs retrieved documents, but none of their 6 knowledge-base runs cited a source.
- The live evaluation uses the in-memory store, so it doesn't exercise pgvector itself.

## Known limitations

- 20 briefs is a small, hand-made dataset, enough for regression testing but not for benchmarking.
- Writing quality (clarity, hook strength, tone) still needs a human rubric. A suggested 1–5 scale: relevance, tone match, clarity, factual grounding.
- Length checks count words. Real speaking pace varies.
