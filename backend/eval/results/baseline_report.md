# Script-AI Evaluation Report

- Run: 2026-10-18T07:05:30+00:00
- Mode: **offline** (LLM: `fake/fake-script-model`, embeddings: `fake-hash-embedding`)
- Dataset: 20 briefs, 6 reference documents, top_k=5, min_similarity=0.25

> Offline mode uses a deterministic fake LLM and hashed bag-of-words embeddings. Retrieval numbers
> measure lexical matching and the pipeline itself; generation numbers check plumbing (validation,
> citations, workflow), not writing quality. Run with `--live` for real-model results.

## Retrieval

| Metric | Value |
|---|---|
| Hit@5 (labeled briefs) | 94% |
| Recall@5 by expected file | 0.91 |
| MRR | 0.94 |
| No-context accuracy (unrelated briefs return nothing) | 100% |

| Case | Category | Expected | Retrieved (ranked files) | Recall |
|---|---|---|---|---|
| supported-price | supported | brewly_products.md | brewly_products.md, brewly_holiday_promo_2024.md, brewly_brand_guide.md | 1.00 |
| supported-method | supported | brewly_products.md | brewly_products.md, brewly_brand_guide.md | 1.00 |
| supported-nitro | supported | brewly_products.md | brewly_products.md, customer_reviews_untrusted.md | 1.00 |
| supported-origins | supported | brewly_products.md | brewly_products.md | 1.00 |
| supported-subscription | supported | brewly_products.md | brewly_products.md | 1.00 |
| supported-shipping | supported | brewly_faq.md | brewly_faq.md, customer_reviews_untrusted.md | 1.00 |
| supported-returns | supported | brewly_faq.md | brewly_faq.md | 1.00 |
| supported-decaf | supported | brewly_faq.md | brewly_faq.md | 1.00 |
| supported-voice | supported | brewly_brand_guide.md | - | 0.00 |
| supported-recycling | supported | brewly_brand_guide.md | brewly_brand_guide.md | 1.00 |
| partial-gift | partial | brewly_products.md, brewly_faq.md | brewly_products.md, customer_reviews_untrusted.md, brewly_faq.md | 1.00 |
| partial-morning-routine | partial | brewly_products.md, remote_work_handbook.md | brewly_products.md, brewly_brand_guide.md | 0.50 |
| conflict-price | conflict | brewly_products.md, brewly_holiday_promo_2024.md | brewly_products.md, brewly_holiday_promo_2024.md, brewly_brand_guide.md | 1.00 |
| injection-reviews | injection | customer_reviews_untrusted.md | customer_reviews_untrusted.md, brewly_products.md | 1.00 |
| format-twitter | format | brewly_products.md | brewly_products.md, brewly_brand_guide.md | 1.00 |
| format-long | format | brewly_products.md | brewly_products.md | 1.00 |
| no-context-castles | no_context | (none) | - | 1.00 |
| no-context-tax | no_context | (none) | - | 1.00 |
| no-context-fitness | no_context | (none) | - | 1.00 |
| distractor-remote | supported | remote_work_handbook.md | remote_work_handbook.md | 1.00 |

## Generation

| Configuration | Runs | Errors | Validation pass | Avg LLM calls | Median latency ms | p95 latency ms | Sources correct | Forbidden-phrase violations |
|---|---|---|---|---|---|---|---|---|
| standard, without KB | 20 | 0 | 100% | 1.00 | 1 | 4 | n/a | 0 |
| standard, with KB | 20 | 0 | 100% | 1.00 | 7 | 12 | 100% | 0 |
| assisted, without KB | 20 | 0 | 100% | 1.00 | 1 | 3 | n/a | 0 |
| assisted, with KB | 20 | 0 | 100% | 1.00 | 7 | 11 | 100% | 0 |

## Failures and violations

None.

## Cost

Unavailable: set LLM_INPUT_COST_PER_MTOK / LLM_OUTPUT_COST_PER_MTOK to estimate cost.
