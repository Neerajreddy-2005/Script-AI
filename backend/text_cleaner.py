import json
import re
from typing import Dict, Any


def _strip_markdown_artifacts(text: str) -> str:
	"""Remove common markdown artifacts like **bold**, *italics*, code fences, and stray backticks."""
	if text is None:
		return ""

	cleaned = text
	# Remove code fences ```...``` and inline backticks
	cleaned = re.sub(r"```[\s\S]*?```", lambda m: m.group(0).strip("`"), cleaned)
	cleaned = cleaned.replace("```", "")
	cleaned = cleaned.replace("`", "")

	# Unwrap bold/italic markers without dropping inner content
	cleaned = re.sub(r"\*{1,3}([^*]+?)\*{1,3}", r"\1", cleaned)
	cleaned = re.sub(r"_{1,3}([^_]+?)_{1,3}", r"\1", cleaned)

	# Remove stray markdown headings symbols while preserving text
	cleaned = re.sub(r"^[ \t]*#{1,6}[ \t]*", "", cleaned, flags=re.MULTILINE)

	# Replace bullets like '- ' or '* ' with a clean dash. Keep line structure.
	cleaned = re.sub(r"^[ \t]*[-*][ \t]+", "- ", cleaned, flags=re.MULTILINE)

	return cleaned


def _normalize_whitespace(text: str) -> str:
	"""Collapse excessive spaces and normalize newlines."""
	if text is None:
		return ""

	# Insert newlines before inline numbered items like " 2. " that appear mid-paragraph
	text = re.sub(r"\s+(?=(?:\d+)\.)", " ", text)  # reduce multi-spaces first
	text = re.sub(r"(?<!\n)(\s*)(\d{1,2})\.\s", lambda m: "\n" + m.group(2) + ". ", text)

	# Collapse 3+ newlines to at most 2
	text = re.sub(r"\n{3,}", "\n\n", text)

	# Collapse multiple spaces
	text = re.sub(r"[ \t]{2,}", " ", text)

	# Trim spaces around newlines
	text = re.sub(r"[ \t]*\n[ \t]*", "\n", text)

	return text.strip()


def _fix_numbering(text: str) -> str:
	"""Ensure numbered lists start on new lines and are cleanly spaced."""
	if not text:
		return ""

	lines = text.split("\n")
	fixed_lines = []
	for line in lines:
		# If a line has multiple numbered items inline, split them
		parts = re.split(r"(?:(?<=\S))\s(?=(?:\d{1,2})\.)", line)
		for idx, part in enumerate(parts):
			fixed_lines.append(part.strip())

	# Remove empty duplicates while preserving order
	result_lines = []
	for ln in fixed_lines:
		if ln:
			result_lines.append(ln)

	# Ensure numbered items appear on their own line with a blank line between items
	output_lines = []
	for i, ln in enumerate(result_lines):
		is_numbered = bool(re.match(r"^\d{1,2}\.\s", ln))
		if is_numbered and output_lines:
			# add a blank line before each numbered item except the first
			if output_lines[-1] != "":
				output_lines.append("")
		output_lines.append(ln)

	return "\n".join(output_lines)


def clean_text_block(text: str) -> str:
	"""High-level cleaner to sanitize a single text block."""
	return _normalize_whitespace(_fix_numbering(_strip_markdown_artifacts(text)))


def clean_script_payload(payload: Dict[str, Any]) -> Dict[str, Any]:
	"""
	Given the backend payload shape:
	{
	  "success": true,
	  "data": {
	    "title": str,
	    "introduction": {"script": str},
	    "mainContent": {"script": str},
	    "conclusion": {"script": str}
	  }
	}
	return a new payload with cleaned strings. Missing keys are tolerated.
	"""
	if not isinstance(payload, dict):
		return {"success": False, "error": "Invalid payload type"}

	data = dict(payload.get("data") or {})
	cleaned = {
		"success": bool(payload.get("success", True)),
		"data": {
			"title": clean_text_block(str(data.get("title", "")).strip()),
			"introduction": {"script": clean_text_block(str((data.get("introduction") or {}).get("script", "")))},
			"mainContent": {"script": clean_text_block(str((data.get("mainContent") or {}).get("script", "")))},
			"conclusion": {"script": clean_text_block(str((data.get("conclusion") or {}).get("script", "")))}
		}
	}
	return cleaned


def cli() -> None:
	"""CLI: read JSON from stdin or a file path arg, print cleaned JSON to stdout."""
	import sys
	if len(sys.argv) > 1:
		with open(sys.argv[1], "r", encoding="utf-8") as f:
			payload = json.load(f)
	else:
		payload = json.load(sys.stdin)
	json.dump(clean_script_payload(payload), sys.stdout, ensure_ascii=False, indent=2)


if __name__ == "__main__":
	cli()


