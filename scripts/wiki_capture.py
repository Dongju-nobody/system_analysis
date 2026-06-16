#!/usr/bin/env python3
"""
Save conversation knowledge to wiki/notes/ for future queries.

Usage:
  python wiki_capture.py --title "LLM Wiki 운영 방침" --text "PDF MD만 sources에..."
  python wiki_capture.py --title "..." --file note_body.md
  type note.txt | python wiki_capture.py --title "..." --stdin
"""

from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime
from pathlib import Path

from wiki_search import slugify


def _llm_wiki_root() -> Path:
    return Path(__file__).resolve().parent.parent


def build_note_document(title: str, body: str, context: str | None, sources: list[str]) -> str:
    date_str = datetime.now().strftime("%Y-%m-%d")
    src_json = json.dumps(sources, ensure_ascii=False)
    ctx_block = context.strip() if context else "_(대화 맥락 미기록)_"

    return f"""---
kind: note
date: {date_str}
title: {json.dumps(title, ensure_ascii=False)}
tags: [llm-wiki, conversation]
sources: {src_json}
---

# 요약

{body.strip()}

# 맥락

{ctx_block}

# 관련 위키

{chr(10).join(f"- [{s}]({s})" for s in sources) if sources else "- (없음)"}
"""


def append_log(wiki_root: Path, title: str, filename: str) -> None:
    log_path = wiki_root / "log.md"
    line = f"## [{datetime.now().strftime('%Y-%m-%d')}] note | {title} → `notes/{filename}`"
    text = log_path.read_text(encoding="utf-8") if log_path.exists() else "# LLM Wiki — 변경 로그\n\n"
    if line not in text:
        log_path.write_text(text.rstrip() + "\n\n" + line + "\n", encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description="LLM Wiki — capture conversation to notes/")
    parser.add_argument("--title", required=True, help="Note title")
    parser.add_argument("--text", type=str, default=None, help="Note body (summary)")
    parser.add_argument("--file", type=Path, default=None, help="Read body from file")
    parser.add_argument("--stdin", action="store_true", help="Read body from stdin")
    parser.add_argument("--context", type=str, default=None, help="Why this was captured")
    parser.add_argument(
        "--source",
        action="append",
        default=[],
        help="Related wiki path (repeatable), e.g. sources/foo.md",
    )
    parser.add_argument(
        "--wiki-root",
        type=Path,
        default=_llm_wiki_root() / "wiki",
    )
    args = parser.parse_args()

    if args.text:
        body = args.text
    elif args.file and args.file.is_file():
        body = args.file.read_text(encoding="utf-8")
    elif args.stdin:
        body = sys.stdin.read()
    else:
        print("Provide --text, --file, or --stdin", file=sys.stderr)
        return 1

    if not body.strip():
        print("Empty note body", file=sys.stderr)
        return 1

    wiki_root = args.wiki_root.resolve()
    notes_dir = wiki_root / "notes"
    notes_dir.mkdir(parents=True, exist_ok=True)

    stamp = datetime.now().strftime("%Y-%m-%d")
    slug = slugify(args.title)
    filename = f"{stamp}_{slug}.md"
    out_path = notes_dir / filename

    doc = build_note_document(args.title, body, args.context, args.source)
    out_path.write_text(doc, encoding="utf-8")
    append_log(wiki_root, args.title, filename)

    print(out_path.relative_to(wiki_root.parent))
    return 0


if __name__ == "__main__":
    sys.exit(main())
