"""Local keyword search over llm-wiki markdown (stdlib only)."""

from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path


@dataclass
class WikiChunk:
    path: Path
    rel_path: str
    heading: str
    text: str
    score: float


_TOKEN_RE = re.compile(r"[\w가-힣]+", re.UNICODE)
_SKIP_PARTS = {"queries", "maintenance", ".git"}

SCOPE_SOURCES = "sources"
SCOPE_NOTES = "notes"
SCOPE_KNOWLEDGE = "knowledge"
SCOPE_ALL = "all"


def tokenize(text: str) -> list[str]:
    return [t.lower() for t in _TOKEN_RE.findall(text) if len(t) > 1]


def slugify(text: str, max_len: int = 48) -> str:
    s = text.lower()
    s = re.sub(r"[^a-z0-9가-힣]+", "-", s, flags=re.UNICODE)
    s = re.sub(r"-+", "-", s).strip("-")
    return (s[:max_len] or "query").rstrip("-")


def _should_index(path: Path, wiki_root: Path, scope: str) -> bool:
    if path.name.startswith("_"):
        return False
    if path.suffix.lower() != ".md":
        return False
    parts = set(path.relative_to(wiki_root).parts)
    if parts & _SKIP_PARTS:
        return False
    if scope == SCOPE_SOURCES:
        return "sources" in parts
    if scope == SCOPE_NOTES:
        return "notes" in parts
    if scope == SCOPE_KNOWLEDGE:
        return bool(parts & {"sources", "notes"})
    return True


def iter_wiki_files(wiki_root: Path, scope: str = SCOPE_KNOWLEDGE) -> list[Path]:
    files: list[Path] = []
    for p in wiki_root.rglob("*.md"):
        if _should_index(p, wiki_root, scope):
            files.append(p)
    return sorted(files)


def split_sections(content: str) -> list[tuple[str, str]]:
    parts = re.split(r"(?m)^##\s+", content)
    if not parts:
        return [("", content)]
    sections: list[tuple[str, str]] = []
    preamble = parts[0].strip()
    if preamble:
        sections.append(("", preamble))
    for block in parts[1:]:
        lines = block.split("\n", 1)
        title = lines[0].strip()
        body = lines[1].strip() if len(lines) > 1 else ""
        sections.append((title, body))
    return sections or [("", content)]


def score_chunk(query_tokens: list[str], heading: str, body: str, rel_path: str) -> float:
    if not query_tokens:
        return 0.0
    hay = f"{rel_path} {heading} {body}".lower()
    hay_tokens = set(tokenize(hay))
    qset = set(query_tokens)
    overlap = qset & hay_tokens
    if not overlap:
        return 0.0
    score = len(overlap) / len(qset)
    path_lower = rel_path.lower()
    for t in query_tokens:
        if t in path_lower:
            score += 0.35
        if t in heading.lower():
            score += 0.25
    score += min(len(body) / 8000, 0.15)
    return score


def search_wiki(
    wiki_root: Path,
    question: str,
    *,
    top_k: int = 8,
    min_score: float = 0.12,
    scope: str = SCOPE_KNOWLEDGE,
) -> list[WikiChunk]:
    query_tokens = tokenize(question)
    if not query_tokens:
        return []

    hits: list[WikiChunk] = []
    for path in iter_wiki_files(wiki_root, scope=scope):
        try:
            content = path.read_text(encoding="utf-8")
        except OSError:
            continue
        rel = path.relative_to(wiki_root).as_posix()
        for heading, body in split_sections(content):
            sc = score_chunk(query_tokens, heading, body, rel)
            if sc < min_score:
                continue
            excerpt = body[:1200] + ("…" if len(body) > 1200 else "")
            hits.append(
                WikiChunk(
                    path=path,
                    rel_path=rel,
                    heading=heading or "(서문)",
                    text=excerpt,
                    score=sc,
                )
            )

    hits.sort(key=lambda c: (-c.score, c.rel_path))
    seen: set[tuple[str, str]] = set()
    unique: list[WikiChunk] = []
    for h in hits:
        key = (h.rel_path, h.heading)
        if key in seen:
            continue
        seen.add(key)
        unique.append(h)
        if len(unique) >= top_k:
            break
    return unique
