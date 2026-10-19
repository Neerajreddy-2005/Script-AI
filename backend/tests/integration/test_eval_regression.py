"""Runs the offline eval as a regression gate: retrieval quality on the labeled dataset must not
drop below the recorded baseline, and the full pipeline must succeed for every brief."""

import json

from app.services.embeddings import tokenize
from eval.run_eval import main


def test_offline_eval_meets_baseline(tmp_path):
	assert main(["--out", str(tmp_path)]) == 0
	results = json.loads((tmp_path / "results.json").read_text(encoding="utf-8"))

	labeled = [r for r in results["retrieval"] if r["expected"]]
	no_context = [r for r in results["retrieval"] if not r["expected"]]
	hit_rate = sum(r["hit"] for r in labeled) / len(labeled)
	assert hit_rate >= 0.9, f"hit@5 regressed to {hit_rate:.2f}"
	assert all(r["no_context_correct"] for r in no_context)

	generations = results["generations"]
	assert all(g["ok"] for g in generations)
	assert not any(g["forbidden_violations"] for g in generations)
	assert (tmp_path / "report.md").exists()


def test_stemming_is_consistent():
	assert tokenize("Shipping ships SHIP") == ["ship", "ship", "ship"]
	assert tokenize("times time") == ["time", "time"]
	assert tokenize("the and of") == []
