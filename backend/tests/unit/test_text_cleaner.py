"""Tests for the AI-output cleaner (1.0 markdown rules + 2.0 emoji/quote rules)."""

import pytest

from app.services.text_cleaner import clean_text_block


def test_strips_markdown_but_keeps_text():
	assert clean_text_block("**Bold** and *italic* with `code`") == "Bold and italic with code"


def test_removes_heading_markers():
	assert clean_text_block("## Intro\nHello") == "Intro\nHello"


def test_inline_numbered_points_go_on_separate_lines():
	cleaned = clean_text_block("Tips: 1. Plan your day 2. Take breaks 3. Log off")
	lines = [ln for ln in cleaned.split("\n") if ln]
	assert lines[0] == "Tips:"
	assert lines[1:] == ["1. Plan your day", "2. Take breaks", "3. Log off"]


def test_collapses_whitespace():
	# 1.0 behavior: runs of spaces collapse and blank lines between paragraphs are dropped.
	assert clean_text_block("too    many   spaces\n\n\n\nand lines") == "too many spaces\nand lines"


@pytest.mark.parametrize(
	"raw,expected",
	[
		('"Hey everyone! \U0001F680\U0001F525 Welcome back."', "Hey everyone! Welcome back."),
		("It's a great day ✨ ! Don't miss it.", "It's a great day! Don't miss it."),
		("1. First \U0001F44D 2. Second ✅", "1. First\n2. Second"),
		("Family \U0001F468‍\U0001F469‍\U0001F467 time", "Family time"),
	],
)
def test_removes_emojis(raw, expected):
	assert clean_text_block(raw) == expected


def test_keeps_normal_symbols_and_citations():
	text = "Price © 2025 ™ costs $29 at 10°C [S1] [B-roll]"
	assert clean_text_block(text) == text


@pytest.mark.parametrize(
	"raw,expected",
	[
		("“Smart quotes” and ‘single’", "\"Smart quotes\" and 'single'"),
		('""Double quoted""', "Double quoted"),
		('"Unclosed start of line', "Unclosed start of line"),
		('Line ends badly"', "Line ends badly"),
		('escaped \\"quote\\" here', 'escaped "quote" here'),
	],
)
def test_removes_unwanted_quotes(raw, expected):
	assert clean_text_block(raw) == expected


@pytest.mark.parametrize("text", ['He said "hello" to me.', "Rock 'n' roll", "Don't stop, it's fine."])
def test_keeps_real_quotes_and_apostrophes(text):
	assert clean_text_block(text) == text
