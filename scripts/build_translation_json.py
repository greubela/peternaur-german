#!/usr/bin/env python3
"""Generate a JSON representation of the bilingual LaTeX content."""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Dict, List, Tuple

ROOT = Path(__file__).resolve().parent.parent
MAIN_TEX = ROOT / "main.tex"
OUTPUT_JSON = ROOT / "web" / "translation-data.json"

TRANS_MACROS = {
    "\\transSec": "section",
    "\\transSubSec": "subsection",
    "\\trans": "paragraph",
}


def _load_content_files() -> List[Path]:
    files: List[Path] = []
    content_pattern = re.compile(r"\\input\{([^}]+)\}")
    for line in MAIN_TEX.read_text(encoding="utf-8").splitlines():
        match = content_pattern.search(line)
        if match:
            rel_path = match.group(1)
            candidate = (ROOT / rel_path).resolve()
            if candidate.suffix == "":
                candidate = candidate.with_suffix(".tex")
            files.append(candidate)
    return files


def _strip_comments(text: str) -> str:
    return re.sub(r"%.*", "", text)


def _parse_braced_argument(text: str, start: int) -> Tuple[str, int]:
    if text[start] != "{":
        raise ValueError(f"Expected '{{' at position {start}")
    depth = 0
    i = start
    content: List[str] = []
    i += 1
    while i < len(text):
        ch = text[i]
        if ch == "{":
            depth += 1
            content.append(ch)
        elif ch == "}":
            if depth == 0:
                return "".join(content), i + 1
            depth -= 1
            content.append(ch)
        else:
            content.append(ch)
        i += 1
    raise ValueError("Unterminated braced argument")


def _parse_macro(text: str, start: int) -> Tuple[Dict[str, object], int]:
    for macro, entry_type in TRANS_MACROS.items():
        if text.startswith(macro, start):
            i = start + len(macro)
            while i < len(text) and text[i].isspace():
                i += 1
            arg1, i = _parse_braced_argument(text, i)
            while i < len(text) and text[i].isspace():
                i += 1
            arg2, i = _parse_braced_argument(text, i)
            return {
                "type": entry_type,
                "danish_raw": arg1.strip(),
                "german_raw": arg2.strip(),
            }, i
    raise ValueError(f"Unsupported macro at position {start}")


def _latex_to_html(text: str) -> str:
    """Convert the limited LaTeX markup in the sources to HTML."""

    result: List[str] = []
    i = 0
    while i < len(text):
        ch = text[i]
        if ch == "\\":
            if i + 1 < len(text) and text[i + 1] == "\\":
                result.append("<br>")
                i += 2
                continue
            j = i + 1
            while j < len(text) and text[j].isalpha():
                j += 1
            command = text[i + 1 : j]
            i = j
            command_lower = command.lower()

            def consume_argument() -> str:
                nonlocal i
                while i < len(text) and text[i].isspace():
                    i += 1
                if i >= len(text) or text[i] != "{":
                    return ""
                arg, i = _parse_braced_argument(text, i)
                return arg

            if command_lower == "textcolor":
                color_raw = consume_argument()
                content_raw = consume_argument()
                color = _latex_to_html(color_raw)
                inner = _latex_to_html(content_raw)
                result.append(f'<span class="textcolor textcolor-{color}">{inner}</span>')
            elif command_lower == "emph":
                content_raw = consume_argument()
                result.append(f"<em>{_latex_to_html(content_raw)}</em>")
            elif command_lower == "enquote":
                content_raw = consume_argument()
                result.append(f"&bdquo;{_latex_to_html(content_raw)}&ldquo;")
            elif command_lower == "alt":
                first_raw = consume_argument()
                second_raw = consume_argument()
                first = _latex_to_html(first_raw)
                second = _latex_to_html(second_raw)
                result.append(f'<span class="alt-term">{first} / {second}</span>')
            elif command_lower in {"anm", "todo", "evl"}:
                content_raw = consume_argument()
                result.append(_latex_to_html(content_raw))
            else:
                content_raw = consume_argument()
                if content_raw:
                    result.append(_latex_to_html(content_raw))
        elif ch == "$":
            end = text.find("$", i + 1)
            if end != -1:
                content = text[i + 1 : end]
                match = re.match(r"\^\{([^}]+)\}", content)
                if match:
                    result.append(f"<sup>({match.group(1)})</sup>")
                else:
                    result.append(content)
                i = end + 1
            else:
                result.append("$")
                i += 1
        elif ch in "{}":
            i += 1
        else:
            result.append(ch)
            i += 1

    html = "".join(result)
    html = html.replace("---", "&mdash;")
    html = html.replace("--", "&ndash;")
    return html.strip()


def _split_paragraphs(text: str) -> List[str]:
    raw_parts = [p.strip() for p in re.split(r"\n\s*\n", text) if p.strip()]
    if not raw_parts:
        raw_parts = [text.strip()] if text.strip() else []
    cleaned: List[str] = []
    for part in raw_parts:
        normalized = re.sub(r"\s+", " ", part)
        cleaned.append(normalized.strip())
    return cleaned


def parse_file(path: Path) -> List[Dict[str, object]]:
    entries: List[Dict[str, object]] = []
    text = _strip_comments(path.read_text(encoding="utf-8"))
    i = 0
    while i < len(text):
        if text[i] == "\\":
            try:
                entry, i = _parse_macro(text, i)
            except ValueError:
                i += 1
                continue
            entry["danish"] = [_latex_to_html(p) for p in _split_paragraphs(entry.pop("danish_raw"))]
            entry["german"] = [_latex_to_html(p) for p in _split_paragraphs(entry.pop("german_raw"))]
            entries.append(entry)
        else:
            i += 1
    return entries


def main() -> None:
    content_files = _load_content_files()
    data: List[Dict[str, object]] = []
    for file_path in content_files:
        data.extend(parse_file(file_path))
    json_text = json.dumps(data, ensure_ascii=False, indent=2)
    OUTPUT_JSON.write_text(json_text + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
