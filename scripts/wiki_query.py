#!/usr/bin/env python3
"""
User Query for LLM Wiki: search wiki MD, write query record, append log.

Usage:
  python wiki_query.py "바이브 코딩이 뭐야?"
  python wiki_query.py "..." --wiki-root ../wiki --top 10
  python wiki_query.py "..." --json
  python wiki_query.py "..." --write-answer answer.txt
"""

from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime
from pathlib import Path

from wiki_search import (
    SCOPE_KNOWLEDGE,
    SCOPE_SOURCES,
    WikiChunk,
    search_wiki,
    slugify,
)


def _llm_wiki_root() -> Path:
    return Path(__file__).resolve().parent.parent


def format_hits_markdown(question: str, hits: list[WikiChunk]) -> str:
    lines = [
        "# 검색된 위키 근거",
        "",
        f"질문 토큰 기준 상위 **{len(hits)}**개 구간 (로컬 키워드 검색).",
        "",
    ]
    if not hits:
        lines.append(
            "_일치하는 구간 없음. `wiki/sources/`(PDF→MD) 또는 `wiki/notes/`(대화 기록)를 확인하세요._"
        )
        return "\n".join(lines)

    for i, h in enumerate(hits, 1):
        lines.append(f"## {i}. `{h.rel_path}` — {h.heading}")
        lines.append(f"- **점수:** {h.score:.2f}")
        lines.append("")
        lines.append(h.text)
        lines.append("")
    return "\n".join(lines)


def build_query_document(
    question: str,
    hits: list[WikiChunk],
    answer: str | None,
    title: str | None,
) -> str:
    now = datetime.now()
    date_str = now.strftime("%Y-%m-%d")
    pages_read = sorted({h.rel_path for h in hits})
    display_title = title or (question[:60] + ("…" if len(question) > 60 else ""))

    fm_pages = json.dumps(pages_read, ensure_ascii=False)
    body_hits = format_hits_markdown(question, hits)

    answer_block = answer.strip() if answer else "_(답변 미작성 — Cursor에서 위 근거를 읽고 아래를 채우거나 `wiki_query.py --write-answer` 사용)_"

    return f"""---
kind: query
date: {date_str}
title: {json.dumps(display_title, ensure_ascii=False)}
pages_read: {fm_pages}
related_synthesis: null
---

# 질문

{question.strip()}

{body_hits}

# 답변 요약

{answer_block}

# 인용·근거

{chr(10).join(f"- [{p}]({p})" for p in pages_read) if pages_read else "- (없음)"}

# 후속

- 
"""


def append_log(wiki_root: Path, title: str, query_filename: str) -> None:
    log_path = wiki_root / "log.md"
    line = f"## [{datetime.now().strftime('%Y-%m-%d')}] query | {title} → `queries/{query_filename}`"
    text = log_path.read_text(encoding="utf-8") if log_path.exists() else "# LLM Wiki — 변경 로그\n\n"
    if line not in text:
        log_path.write_text(text.rstrip() + "\n\n" + line + "\n", encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description="LLM Wiki User Query")
    parser.add_argument("question", help="User question")
    parser.add_argument(
        "--wiki-root",
        type=Path,
        default=_llm_wiki_root() / "wiki",
        help="Path to wiki/ directory",
    )
    parser.add_argument("--top", type=int, default=8, help="Max chunks to retrieve")
    parser.add_argument("--no-save", action="store_true", help="Search only, do not write queries/")
    parser.add_argument("--title", type=str, default=None, help="Query record title")
    parser.add_argument("--write-answer", type=Path, default=None, help="File with answer body")
    parser.add_argument("--json", action="store_true", help="Print JSON to stdout")
    parser.add_argument(
        "--scope",
        choices=[SCOPE_KNOWLEDGE, SCOPE_SOURCES, "notes"],
        default=SCOPE_KNOWLEDGE,
        help="sources=PDF MD만, notes=대화 기록만, knowledge=sources+notes (기본)",
    )
    args = parser.parse_args()

    wiki_root = args.wiki_root.resolve()
    if not wiki_root.is_dir():
        print(f"wiki root not found: {wiki_root}", file=sys.stderr)
        return 1

    hits = search_wiki(wiki_root, args.question, top_k=args.top, scope=args.scope)
    answer: str | None = None
    if args.write_answer and args.write_answer.is_file():
        answer = args.write_answer.read_text(encoding="utf-8")

    if args.json:
        payload = {
            "question": args.question,
            "hits": [
                {
                    "path": h.rel_path,
                    "heading": h.heading,
                    "score": round(h.score, 4),
                    "excerpt": h.text,
                }
                for h in hits
            ],
        }
        print(json.dumps(payload, ensure_ascii=False, indent=2))
    else:
        print(format_hits_markdown(args.question, hits))

    if args.no_save:
        return 0

    queries_dir = wiki_root / "queries"
    queries_dir.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now().strftime("%Y-%m-%d_%H%M")
    slug = slugify(args.question)
    filename = f"{stamp}_{slug}.md"
    out_path = queries_dir / filename
    doc = build_query_document(args.question, hits, answer, args.title)
    out_path.write_text(doc, encoding="utf-8")
    append_log(wiki_root, args.title or slug, filename)

    if not args.json:
        print(f"\n---\n저장: {out_path.relative_to(wiki_root.parent)}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
