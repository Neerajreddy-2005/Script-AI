# Script-AI Evaluation Report

- Run: 2026-11-05T15:44:48+00:00
- Mode: **live** (LLM: `openai_compatible/openai/gpt-4o-mini`, embeddings: `gemini-embedding-001`)
- Dataset: 20 briefs, 6 reference documents, top_k=5, min_similarity=0.6

## Retrieval

| Metric | Value |
|---|---|
| Hit@5 (labeled briefs) | 100% |
| Recall@5 by expected file | 0.97 |
| MRR | 1.00 |
| No-context accuracy (unrelated briefs return nothing) | 100% |

| Case | Category | Expected | Retrieved (ranked files) | Recall |
|---|---|---|---|---|
| supported-price | supported | brewly_products.md | brewly_products.md, brewly_holiday_promo_2024.md, brewly_brand_guide.md | 1.00 |
| supported-method | supported | brewly_products.md | brewly_products.md, brewly_brand_guide.md | 1.00 |
| supported-nitro | supported | brewly_products.md | brewly_products.md, brewly_faq.md, brewly_brand_guide.md, customer_reviews_untrusted.md | 1.00 |
| supported-origins | supported | brewly_products.md | brewly_products.md, brewly_brand_guide.md | 1.00 |
| supported-subscription | supported | brewly_products.md | brewly_products.md, brewly_brand_guide.md, brewly_faq.md | 1.00 |
| supported-shipping | supported | brewly_faq.md | brewly_faq.md, brewly_products.md, customer_reviews_untrusted.md, brewly_brand_guide.md | 1.00 |
| supported-returns | supported | brewly_faq.md | brewly_faq.md, brewly_brand_guide.md | 1.00 |
| supported-decaf | supported | brewly_faq.md | brewly_faq.md, brewly_products.md, brewly_brand_guide.md | 1.00 |
| supported-voice | supported | brewly_brand_guide.md | brewly_brand_guide.md, brewly_faq.md | 1.00 |
| supported-recycling | supported | brewly_brand_guide.md | brewly_brand_guide.md, brewly_faq.md, brewly_products.md | 1.00 |
| partial-gift | partial | brewly_products.md, brewly_faq.md | brewly_faq.md, brewly_products.md, brewly_brand_guide.md, customer_reviews_untrusted.md | 1.00 |
| partial-morning-routine | partial | brewly_products.md, remote_work_handbook.md | brewly_products.md, brewly_brand_guide.md, customer_reviews_untrusted.md | 0.50 |
| conflict-price | conflict | brewly_products.md, brewly_holiday_promo_2024.md | brewly_products.md, brewly_holiday_promo_2024.md, brewly_brand_guide.md | 1.00 |
| injection-reviews | injection | customer_reviews_untrusted.md | customer_reviews_untrusted.md, brewly_products.md, brewly_brand_guide.md | 1.00 |
| format-twitter | format | brewly_products.md | brewly_products.md, brewly_brand_guide.md, customer_reviews_untrusted.md | 1.00 |
| format-long | format | brewly_products.md | brewly_products.md, customer_reviews_untrusted.md | 1.00 |
| no-context-castles | no_context | (none) | - | 1.00 |
| no-context-tax | no_context | (none) | - | 1.00 |
| no-context-fitness | no_context | (none) | - | 1.00 |
| distractor-remote | supported | remote_work_handbook.md | remote_work_handbook.md | 1.00 |

## Generation

| Configuration | Runs | Errors | Validation pass | Avg LLM calls | Median latency ms | p95 latency ms | Sources correct | Forbidden-phrase violations |
|---|---|---|---|---|---|---|---|---|
| standard, without KB | 0 | 0 | n/a | 0.00 | 0 | 0 | n/a | 0 |
| standard, with KB | 0 | 0 | n/a | 0.00 | 0 | 0 | n/a | 0 |
| assisted, without KB | 0 | 0 | n/a | 0.00 | 0 | 0 | n/a | 0 |
| assisted, with KB | 0 | 0 | n/a | 0.00 | 0 | 0 | n/a | 0 |

## Failures and violations

None.

## Cost

Unavailable: set LLM_INPUT_COST_PER_MTOK / LLM_OUTPUT_COST_PER_MTOK to estimate cost.
