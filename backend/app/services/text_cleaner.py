"""Cleans AI output before it reaches the user: emojis, unwanted quotes, markdown artifacts,
and numbered-list spacing. Applied to every script section by GenerationService."""

import re

# Emoji and pictograph ranges, plus the joiners/selectors that glue multi-part emojis together.
# Ordinary symbols such as ©, ™, °, and currency signs are not in these ranges and are kept.
_EMOJI = re.compile(
	"["
	"\U0001F000-\U0001FAFF"  # emoticons, pictographs, transport, flags, supplemental symbols
	"☀-➿"  # misc symbols and dingbats (☀ ✨ ✅ ❤)
	"⬀-⯿"  # arrows/stars (⭐ ⬆)
	"⌀-⏿"  # technical (⌚ ⏰ ⏩)
	"︎️‍⃣"  # variation selectors, zero-width joiner, keycap
	"]+"
)
_SMART_QUOTES = str.maketrans({"“": '"', "”": '"', "„": '"', "«": '"', "»": '"',
	"‘": "'", "’": "'", "‚": "'"})


def _strip_emojis(text: str) -> str:
	"""Remove emojis the model adds ("Let's go! 🚀🔥") without touching normal text."""
	if not text:
		return ""
	text = _EMOJI.sub("", text)
	return re.sub(r"[ \t]+([.,!?;:])", r"\1", text)  # "go ! " left behind -> "go!"


def _clean_quotes(text: str) -> str:
	"""Remove unwanted quotation marks from AI output while keeping apostrophes and real quotes.

	- curly quotes become straight quotes
	- escaped quotes (\\") left over from JSON become plain quotes
	- doubled quotes ("" or '') collapse to one
	- a quote wrapping the whole block or a whole line is removed ("Hello there." -> Hello there.)
	- a lone, unmatched quote at the start or end of a line is removed
	"""
	if not text:
		return ""
	text = text.translate(_SMART_QUOTES).replace('\\"', '"')
	text = re.sub(r'"{2,}', '"', text)
	text = re.sub(r"(?<!\w)'{2,}|'{2,}(?!\w)", "'", text)

	lines = []
	for line in text.split("\n"):
		stripped = line.strip()
		if len(stripped) >= 2 and stripped[0] == stripped[-1] == '"' and stripped.count('"') == 2:
			stripped = stripped[1:-1].strip()
		elif stripped.count('"') == 1 and (stripped.startswith('"') or stripped.endswith('"')):
			stripped = stripped.strip('"').strip()
		lines.append(stripped if stripped != line.strip() else line)
	return "\n".join(lines)


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
		fixed_lines.extend(part.strip() for part in parts)

	# Remove empty duplicates while preserving order
	result_lines = []
	for ln in fixed_lines:
		if ln:
			result_lines.append(ln)

	# Ensure numbered items appear on their own line with a blank line between items
	output_lines = []
	for ln in result_lines:
		is_numbered = bool(re.match(r"^\d{1,2}\.\s", ln))
		if is_numbered and output_lines:
			# add a blank line before each numbered item except the first
			if output_lines[-1] != "":
				output_lines.append("")
		output_lines.append(ln)

	return "\n".join(output_lines)


def clean_text_block(text: str) -> str:
	"""Sanitize one block of AI-generated text."""
	return _normalize_whitespace(_fix_numbering(_strip_markdown_artifacts(_clean_quotes(_strip_emojis(text)))))
