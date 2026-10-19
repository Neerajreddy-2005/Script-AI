import json

import pytest

from app.core.errors import ProviderError
from app.services.agent_workflow import parse_script_output

VALID = {
	"title": "Title",
	"introduction": "Intro",
	"mainContent": "Main",
	"conclusion": "End",
	"sources_used": ["S1", "s2", "bogus", "S1"],
}


def test_parses_plain_json():
	script, cited = parse_script_output(json.dumps(VALID), "fallback")
	assert script.mainContent.script == "Main"
	assert cited == ["S1", "S2"]  # normalized, deduplicated, junk dropped


def test_parses_fenced_json_with_prose():
	text = "Sure! Here it is:\n```json\n" + json.dumps(VALID) + "\n```"
	script, _ = parse_script_output(text, "fallback")
	assert script.title == "Title"


def test_accepts_legacy_nested_sections():
	data = {**VALID, "introduction": {"script": "Nested intro"}}
	script, _ = parse_script_output(json.dumps(data), "fallback")
	assert script.introduction.script == "Nested intro"


def test_missing_title_uses_fallback():
	data = {k: v for k, v in VALID.items() if k != "title"}
	script, _ = parse_script_output(json.dumps(data), "My topic")
	assert script.title == "My topic"


@pytest.mark.parametrize("text", ["", "not json", "{broken", json.dumps({"title": "only"}), "[1, 2]"])
def test_malformed_output_raises(text):
	with pytest.raises(ProviderError) as exc:
		parse_script_output(text, "x")
	assert exc.value.code == "malformed_output"


def test_all_empty_sections_raise():
	data = {**VALID, "introduction": "", "mainContent": " ", "conclusion": ""}
	with pytest.raises(ProviderError) as exc:
		parse_script_output(json.dumps(data), "x")
	assert exc.value.code == "empty_output"
