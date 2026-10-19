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

**Not recorded yet.** Once `LLM_*` and `EMBEDDING_*` are configured, run `python -m eval.run_eval --live` and add the results here.

What to record:
- the retrieval table,
- validation pass rates for standard vs assisted mode,
- with-KB vs without-KB source correctness,
- forbidden-phrase violations (especially the injection case),
- p95 latency and cost per generation.

Don't quote numbers from single examples. Use the full table.

## Known limitations

- 20 briefs is a small, hand-made dataset, enough for regression testing but not for benchmarking.
- Writing quality (clarity, hook strength, tone) still needs a human rubric. A suggested 1–5 scale: relevance, tone match, clarity, factual grounding.
- Length checks count words. Real speaking pace varies.
