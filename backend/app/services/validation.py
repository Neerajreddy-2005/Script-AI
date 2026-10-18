"""Deterministic script checks. These run on every generation (no model call) and drive the
assisted workflow's revision step."""

import re

from app.schemas.generation import GenerateRequest, ScriptData, ValidationIssue, ValidationResult
from app.services.embeddings import tokenize
from app.services.prompts import target_words

# Allowed slack around the word target before it counts as an error (LLMs rarely hit lengths exactly).
LOW_TOLERANCE = 0.7
HIGH_TOLERANCE = 1.4
TWEET_LIMIT = 280
# Warnings the assisted workflow still tries to fix with a revision (standard mode only reports them).
REVISABLE_WARNINGS = frozenset({"length_off_target"})

_CUE = re.compile(r"\[[^\]]*\]")
_CITATION = re.compile(r"\[(S\d+)\]")
_PLACEHOLDER = re.compile(r"\[\s*(insert|your|add|placeholder)[^\]]*\]|lorem ipsum|\bTODO\b|\bTBD\b", re.I)
_NUMBERED = re.compile(r"^\s*\d{1,2}[.)]\s+(.*)$", re.M)


def count_words(text: str) -> int:
	return len(re.findall(r"\b[\w'’-]+\b", _CUE.sub(" ", text)))


def validate_script(
	script: ScriptData,
	req: GenerateRequest,
	available_sources: set[str],
	cited_sources: list[str],
) -> ValidationResult:
	issues: list[ValidationIssue] = []

	def add(code: str, message: str, severity: str = "error") -> None:
		issues.append(ValidationIssue(code=code, message=message, severity=severity))

	for name, section in (
		("introduction", script.introduction),
		("mainContent", script.mainContent),
		("conclusion", script.conclusion),
	):
		if not section.script.strip():
			add("empty_section", f"The {name} section is empty.")

	text = script.full_text()
	words = count_words(text)
	low, high = target_words(req.length)
	if words < low * LOW_TOLERANCE:
		add("too_short", f"The script has {words} words; the target is {low}-{high}. Expand it.")
	elif words > high * HIGH_TOLERANCE:
		add("too_long", f"The script has {words} words; the target is {low}-{high}. Shorten it.")
	elif not low <= words <= high:
		direction = "Expand it" if words < low else "Shorten it"
		add("length_off_target", f"The script has {words} words; the target is {low}-{high}. {direction}.", "warning")

	lowered = text.lower()
	missing = [kw for kw in req.keywords if kw.lower() not in lowered]
	if missing:
		add("missing_keyword", f"Include these required keywords: {', '.join(missing)}.")

	if req.call_to_action:
		cta_terms = set(tokenize(req.call_to_action))
		found = cta_terms.intersection(tokenize(script.conclusion.script))
		if cta_terms and len(found) / len(cta_terms) < 0.5:
			add("missing_call_to_action", f'End with this call to action: "{req.call_to_action}".')

	if _PLACEHOLDER.search(text) or _PLACEHOLDER.search(script.title):
		add("placeholder_text", "Replace placeholder text with real content.")

	inline = set(_CITATION.findall(text))
	unknown = sorted((inline | set(cited_sources)) - available_sources, key=lambda s: int(s[1:]))
	if unknown:
		add("unknown_source", f"Remove citations that do not match a provided reference: {', '.join(unknown)}.")
	if available_sources and not (inline | set(cited_sources)) & available_sources:
		add("no_citations", "Reference documents were provided but none were cited.", "warning")

	if req.platform == "Twitter":
		long_posts = [i + 1 for i, post in enumerate(_NUMBERED.findall(text)) if len(post) > TWEET_LIMIT]
		if long_posts:
			add("tweet_too_long", f"Thread posts {long_posts} exceed {TWEET_LIMIT} characters.", "warning")

	return ValidationResult(
		passed=not any(i.severity == "error" for i in issues),
		word_count=words,
		target_words=(low, high),
		issues=issues,
	)


def error_count(result: ValidationResult) -> int:
	return sum(1 for i in result.issues if i.severity == "error")


def revisable_issues(result: ValidationResult) -> list[ValidationIssue]:
	"""Issues a revision should address: every error, plus mild length misses."""
	return [i for i in result.issues if i.severity == "error" or i.code in REVISABLE_WARNINGS]


def revision_score(result: ValidationResult) -> tuple[int, int]:
	"""Lower is better: errors first, then revisable warnings."""
	return error_count(result), len(revisable_issues(result)) - error_count(result)
