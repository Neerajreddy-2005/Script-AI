import json

import pytest

from app.core.errors import ProviderError
from app.schemas.generation import GenerateRequest
from app.services.agent_workflow import ScriptWorkflow
from app.services.llm import FakeLLM, fake_script_responder
from app.services.prompts import target_words
from tests.conftest import BRIEF


def short_reply(*_):
	return json.dumps({"title": "T", "introduction": "Hi.", "mainContent": "Too short.", "conclusion": "Bye.", "sources_used": []})


def mildly_short_reply(*_):
	"""Inside the tolerance band: a warning, not an error."""
	n = int(target_words(BRIEF["length"])[0] * 0.85)
	return json.dumps({"title": "T", "introduction": "Hi there.", "mainContent": " ".join(["word"] * n), "conclusion": "Thanks for watching!", "sources_used": []})


def sequence(*responders):
	"""LLM that answers with each responder in turn (the last one repeats)."""
	calls = {"n": 0}

	def respond(system, user):
		fn = responders[min(calls["n"], len(responders) - 1)]
		calls["n"] += 1
		if isinstance(fn, Exception):
			raise fn
		return fn(system, user)

	return respond


REQ = GenerateRequest(**BRIEF)


def test_standard_mode_is_single_call():
	llm = FakeLLM()
	outcome = ScriptWorkflow(llm, max_steps=8, max_revisions=0).run(REQ, [], [])
	assert outcome.validation.passed
	assert len(llm.calls) == 1
	assert [s.name for s in outcome.steps] == ["draft", "validate"]


def test_failed_validation_triggers_revision_with_feedback():
	llm = FakeLLM(sequence(short_reply, fake_script_responder))
	outcome = ScriptWorkflow(llm, max_steps=8, max_revisions=2).run(REQ, [], [])
	assert outcome.validation.passed
	assert [s.name for s in outcome.steps] == ["draft", "validate", "revise_1", "validate_1"]
	revision_prompt = llm.calls[1][1]
	assert "Problems to fix" in revision_prompt and "words" in revision_prompt


def test_revisions_are_bounded():
	llm = FakeLLM(short_reply)  # never improves
	outcome = ScriptWorkflow(llm, max_steps=20, max_revisions=2).run(REQ, [], [])
	assert not outcome.validation.passed
	assert len(llm.calls) == 3  # draft + 2 revisions, then stop


def test_step_budget_stops_revisions():
	llm = FakeLLM(short_reply)
	outcome = ScriptWorkflow(llm, max_steps=3, max_revisions=5).run(REQ, [], [])
	assert len(llm.calls) == 1
	assert outcome.steps[-1].status == "skipped"


def test_revision_provider_failure_falls_back_to_draft():
	llm = FakeLLM(sequence(short_reply, ProviderError()))
	outcome = ScriptWorkflow(llm, max_steps=8, max_revisions=2).run(REQ, [], [])
	assert outcome.script.mainContent.script == "Too short."
	assert outcome.steps[-1].status == "failed"


def test_draft_provider_failure_raises():
	llm = FakeLLM(sequence(ProviderError()))
	with pytest.raises(ProviderError):
		ScriptWorkflow(llm, max_steps=8, max_revisions=2).run(REQ, [], [])


def test_malformed_output_is_repaired_once():
	llm = FakeLLM(sequence(lambda *_: "not json", fake_script_responder))
	outcome = ScriptWorkflow(llm, max_steps=8, max_revisions=0).run(REQ, [], [])
	assert outcome.validation.passed
	assert outcome.usage.llm_calls == 2
	assert "not a valid JSON object" in llm.calls[1][1]


def test_repeated_malformed_output_raises():
	llm = FakeLLM(lambda *_: "still not json")
	with pytest.raises(ProviderError) as exc:
		ScriptWorkflow(llm, max_steps=8, max_revisions=2).run(REQ, [], [])
	assert exc.value.code == "malformed_output"
	assert len(llm.calls) == 2


def test_worse_revision_is_discarded():
	def placeholder_draft(system, user):  # 1 error: placeholder
		return fake_script_responder(system, user).replace('"Welcome', '"[Insert hook] Welcome')

	def worse_revision(*_):  # 2 errors: too short + placeholder
		return short_reply().replace("Too short.", "Too short. [Insert fact]")

	llm = FakeLLM(sequence(placeholder_draft, worse_revision))
	outcome = ScriptWorkflow(llm, max_steps=8, max_revisions=1).run(REQ, [], [])
	assert "[Insert hook]" in outcome.script.introduction.script
	assert len(outcome.validation.issues) == 1


def test_assisted_mode_revises_mild_length_miss():
	llm = FakeLLM(sequence(mildly_short_reply, fake_script_responder))
	outcome = ScriptWorkflow(llm, max_steps=8, max_revisions=2).run(REQ, [], [])
	assert [s.name for s in outcome.steps] == ["draft", "validate", "revise_1", "validate_1"]
	assert "Expand it" in llm.calls[1][1]
	assert not outcome.validation.issues


def test_standard_mode_only_reports_mild_length_miss():
	llm = FakeLLM(mildly_short_reply)
	outcome = ScriptWorkflow(llm, max_steps=8, max_revisions=0).run(REQ, [], [])
	assert outcome.validation.passed
	assert [i.code for i in outcome.validation.issues] == ["length_off_target"]
	assert len(llm.calls) == 1
