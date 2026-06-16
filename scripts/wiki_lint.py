#!/usr/bin/env python3
"""
LLM Wiki Maintenance (Lint): health-check wiki MD, write report, append log.

Usage:
  python wiki_lint.py
  python wiki_lint.py --json
  python wiki_lint.py --scope knowledge   # sources+notes+concepts (default)
  python wiki_lint.py --no-save
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from urllib.parse import unquote
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path

_LINK_RE = re.compile(r"!?\[([^\]]*)\]\(([^)]+)\)")
_FRONTMATTER_RE = re.compile(r"^---\s*\n.*?\n---\s*\n", re.DOTALL)
_SKIP_DIRS = {"maintenance"}


@dataclass
class Finding:
    kind: str
    location: str
    detail: str
    action: str = ""


@dataclass
class LintReport:
    scope: str
    findings: list[Finding] = field(default_factory=list)

    def add(self, kind: str, location: str, detail: str, action: str = "") -> None:
        self.findings.append(Finding(kind, location, detail, action))


def _llm_wiki_root() -> Path:
    return Path(__file__).resolve().parent.parent


def strip_frontmatter(text: str) -> str:
    return _FRONTMATTER_RE.sub("", text, count=1)


def list_wiki_pages(wiki_root: Path, scope: str) -> list[Path]:
    pages: list[Path] = []
    for p in wiki_root.rglob("*.md"):
        if p.name.startswith("_"):
            continue
        rel_parts = set(p.relative_to(wiki_root).parts)
        if rel_parts & _SKIP_DIRS:
            continue
        if scope == "knowledge":
            if not (rel_parts & {"sources", "notes", "concepts"}):
                continue
        elif scope == "all":
            if "queries" in rel_parts:
                continue
        pages.append(p)
    return sorted(pages)


def list_all_indexed_md(wiki_root: Path) -> list[Path]:
    out: list[Path] = []
    for p in wiki_root.rglob("*.md"):
        if p.name.startswith("_"):
            continue
        parts = p.relative_to(wiki_root).parts
        if parts[0] in _SKIP_DIRS:
            continue
        out.append(p)
    return sorted(out)


def extract_links(content: str, from_file: Path, wiki_root: Path) -> list[tuple[str, Path | None, bool]]:
    """Return (raw, resolved_path or None, is_external) per link."""
    results: list[tuple[str, Path | None, bool]] = []
    for _text, target in _LINK_RE.findall(content):
        target = unquote(target.strip())
        if target.startswith("<") and ">" in target:
            target = target[1 : target.index(">")]
        elif target.startswith("<"):
            target = target.lstrip("<")
        target = target.strip()
        if "?" in target and not target.startswith("<"):
            target = target.split()[0]
        if target.startswith(("http://", "https://", "mailto:")):
            results.append((target, None, True))
            continue
        if target.startswith("#"):
            results.append((target, from_file, False))
            continue
        resolved = (from_file.parent / target).resolve()
        results.append((target, resolved, False))
    return results


def normalize_wiki_ref(path: Path, wiki_root: Path) -> str | None:
    try:
        rel = path.relative_to(wiki_root.resolve())
        if rel.suffix.lower() == ".md":
            return rel.as_posix()
    except ValueError:
        pass
    return None


def collect_inbound_links(wiki_root: Path) -> dict[str, set[str]]:
    """wiki-relative path -> set of files that link to it."""
    inbound: dict[str, set[str]] = {}
    for md in list_all_indexed_md(wiki_root):
        rel_from = md.relative_to(wiki_root).as_posix()
        try:
            content = md.read_text(encoding="utf-8")
        except OSError:
            continue
        for raw, resolved, external in extract_links(content, md, wiki_root):
            if external or resolved is None:
                continue
            if raw.startswith("#"):
                continue
            if not resolved.exists():
                continue
            ref = normalize_wiki_ref(resolved, wiki_root)
            if ref:
                inbound.setdefault(ref, set()).add(rel_from)
    return inbound


def parse_index_links(index_path: Path) -> set[str]:
    if not index_path.is_file():
        return set()
    text = index_path.read_text(encoding="utf-8")
    refs: set[str] = set()
    for _t, target in _LINK_RE.findall(text):
        target = target.strip().split()[0]
        if target.endswith(".md") and not target.startswith("http"):
            refs.add(target.replace("\\", "/"))
    return refs


def _parse_frontmatter(content: str) -> dict | None:
    m = re.match(r"^---\s*\n(.*?)\n---", content, re.DOTALL)
    if not m:
        return None
    data: dict = {}
    for line in m.group(1).splitlines():
        if not line.strip() or line.strip().startswith("#"):
            continue
        if ":" not in line:
            continue
        key, val = line.split(":", 1)
        key = key.strip()
        val = val.strip()
        if val.startswith('"') and val.endswith('"'):
            val = val[1:-1]
        elif val.startswith("'") and val.endswith("'"):
            val = val[1:-1]
        data[key] = val
    return data if data else None


def _load_schema(name: str) -> dict | None:
    root = _llm_wiki_root()
    path = root / "schema" / name
    if not path.is_file():
        return None
    return json.loads(path.read_text(encoding="utf-8"))


def _validate_against_schema(data: dict, schema: dict) -> list[str]:
    errors: list[str] = []
    required = schema.get("required") or []
    props = schema.get("properties") or {}
    for key in required:
        if key not in data:
            errors.append(f"missing required field `{key}`")
    for key, spec in props.items():
        if key not in data:
            continue
        val = data[key]
        if "const" in spec and val != spec["const"]:
            errors.append(f"`{key}` must be {spec['const']!r}, got {val!r}")
        if spec.get("type") == "string" and not isinstance(val, str):
            errors.append(f"`{key}` must be string, got {type(val).__name__}")
        if spec.get("type") == "array" and not isinstance(val, list):
            errors.append(f"`{key}` must be array")
    return errors


def run_schema_lint(wiki_root: Path, report: LintReport) -> None:
    schemas = {
        "notes": "note.schema.json",
        "sources": "source.schema.json",
        "parties": "party-main.schema.json",
    }
    for folder, schema_name in schemas.items():
        schema = _load_schema(schema_name)
        if not schema:
            report.add("schema_missing", f"schema/{schema_name}", "schema file not found", "add schema JSON")
            continue
        dir_path = wiki_root / folder
        if not dir_path.is_dir():
            continue
        for md in sorted(dir_path.glob("*.md")):
            if md.name.startswith("_"):
                continue
            if folder == "parties" and not md.name.endswith("-party-main.md"):
                continue
            rel = md.relative_to(wiki_root).as_posix()
            try:
                content = md.read_text(encoding="utf-8")
            except OSError as e:
                report.add("read_error", rel, str(e), "fix encoding")
                continue
            fm = _parse_frontmatter(content)
            if fm is None:
                report.add("schema_error", rel, "no valid YAML frontmatter", "add --- block")
                continue
            for err in _validate_against_schema(fm, schema):
                report.add("schema_error", rel, err, f"fix frontmatter per schema/{schema_name}")


def run_lint(wiki_root: Path, scope: str) -> LintReport:
    report = LintReport(scope=scope)
    wiki_root = wiki_root.resolve()
    index_path = wiki_root / "index.md"
    inbound = collect_inbound_links(wiki_root)
    index_refs = parse_index_links(index_path)

    knowledge_pages = list_wiki_pages(wiki_root, scope)

    # --- index drift: sources not in index ---
    if index_path.is_file():
        for p in sorted((wiki_root / "sources").glob("*.md")):
            if p.name.startswith("_"):
                continue
            rel = f"sources/{p.name}"
            if rel not in index_refs:
                report.add(
                    "index_drift",
                    rel,
                    "index.md 목차에 링크 없음",
                    f"index.md의 소스 섹션에 [{p.stem}]({rel}) 추가",
                )

    for md in list_all_indexed_md(wiki_root):
        rel = md.relative_to(wiki_root).as_posix()
        try:
            content = md.read_text(encoding="utf-8")
        except OSError as e:
            report.add("read_error", rel, str(e), "파일 인코딩·권한 확인")
            continue

        body = strip_frontmatter(content)

        # --- broken links ---
        for raw, resolved, external in extract_links(content, md, wiki_root):
            if external or raw.startswith("#"):
                continue
            if resolved is None:
                continue
            if resolved.is_dir():
                continue
            if not resolved.exists():
                report.add(
                    "broken_link",
                    rel,
                    f"깨진 링크: `{raw}`",
                    "경로 수정 또는 대상 파일 생성",
                )

        # --- thin page (knowledge only) ---
        if md in knowledge_pages and len(body.strip()) < 150:
            report.add(
                "thin_page",
                rel,
                f"본문이 매우 짧음 ({len(body.strip())}자)",
                "내용 보강 또는 ingest 재실행",
            )

        # --- orphan (sources/notes/concepts) ---
        parts = set(md.relative_to(wiki_root).parts)
        if parts & {"sources", "notes", "concepts"}:
            if rel not in inbound and rel not in index_refs:
                report.add(
                    "orphan",
                    rel,
                    "다른 위키 페이지·index.md에서 링크되지 않음",
                    "index.md 또는 관련 sources/notes에 링크 추가",
                )

        # --- placeholder query answers ---
        if "queries" in parts and "_(답변 미작성" in content:
            report.add(
                "incomplete_query",
                rel,
                "답변 요약이 비어 있음",
                "답변 요약 섹션 작성",
            )

        # --- stale frontmatter (notes without recent update) ---
        if "notes" in parts:
            m = re.search(r"^updated:\s*(\S+)", content, re.M)
            if not m and "date:" not in content[:400]:
                report.add(
                    "missing_meta",
                    rel,
                    "frontmatter에 date/updated 없음",
                    "YAML에 date 또는 updated 추가",
                )

    # --- duplicate titles in sources ---
    titles: dict[str, list[str]] = {}
    for p in (wiki_root / "sources").glob("*.md"):
        if p.name.startswith("_"):
            continue
        try:
            text = p.read_text(encoding="utf-8")[:500]
        except OSError:
            continue
        m = re.search(r'^title:\s*["\']?(.+?)["\']?\s*$', text, re.M)
        title = m.group(1).strip() if m else p.stem
        titles.setdefault(title, []).append(f"sources/{p.name}")
    for title, paths in titles.items():
        if len(paths) > 1:
            report.add(
                "duplicate_title",
                ", ".join(paths),
                f"동일 title: {title}",
                "title 구분 또는 파일 병합 검토",
            )

    # --- assets: broken slide images in sources ---
    for p in (wiki_root / "sources").glob("*.md"):
        rel = f"sources/{p.name}"
        try:
            content = p.read_text(encoding="utf-8")
        except OSError:
            continue
        for _t, target in _LINK_RE.findall(content):
            if not target.endswith(".png"):
                continue
            resolved = (p.parent / target.strip()).resolve()
            if not resolved.is_file():
                report.add(
                    "broken_image",
                    rel,
                    f"이미지 없음: `{target}`",
                    "ingest_pdfs.py 또는 sync-from-wii.bat 재실행",
                )

    # --- summary stats ---
    n_sources = len(list((wiki_root / "sources").glob("*.md"))) - sum(
        1 for _ in (wiki_root / "sources").glob("_*")
    )
    if n_sources == 0:
        report.add(
            "missing_sources",
            "wiki/sources/",
            "sources/*.md 없음",
            "ingest_pdfs.py 로 PDF ingest",
        )

    return report


def format_report_md(report: LintReport) -> str:
    now = datetime.now()
    kinds = {}
    for f in report.findings:
        kinds.setdefault(f.kind, 0)
        kinds[f.kind] = kinds.get(f.kind, 0) + 1

    if not report.findings:
        summary = "발견된 문제 없음. 위키 구조·링크·index 목차가 정상으로 보입니다."
    else:
        summary = (
            f"총 **{len(report.findings)}**건 발견 "
            f"({', '.join(f'{k}: {v}' for k, v in sorted(kinds.items()))})."
        )

    lines = [
        "---",
        "kind: lint",
        f"date: {now.strftime('%Y-%m-%d')}",
        f"scope: {report.scope}",
        "---",
        "",
        "# Lint 요약",
        "",
        summary,
        "",
        "# 발견 사항",
        "",
        "| 유형 | 위치 | 상세 | 권장 조치 |",
        "|------|------|------|-----------|",
    ]
    if report.findings:
        for f in report.findings:
            detail = f.detail.replace("|", "\\|")
            action = f.action.replace("|", "\\|")
            lines.append(f"| {f.kind} | `{f.location}` | {detail} | {action} |")
    else:
        lines.append("| — | — | — | — |")

    lines.extend(
        [
            "",
            "# 수행한 수정",
            "",
            "- 이번 패스에서 파일 변경 없음 (보고서만 생성)",
            "",
            "# 권장 다음 작업",
            "",
        ]
    )
    if report.findings:
        for f in report.findings[:8]:
            if f.action:
                lines.append(f"- [{f.kind}] {f.location}: {f.action}")
    else:
        lines.append("- 정기적으로 `wiki_lint.py` 실행")
        lines.append("- PDF 변경 시 `sync-from-wii.bat` 후 Lint 재실행")
    lines.append("")
    return "\n".join(lines)


def append_log(wiki_root: Path, filename: str) -> None:
    log = wiki_root / "log.md"
    line = f"## [{datetime.now().strftime('%Y-%m-%d')}] lint | → `maintenance/lint/{filename}`"
    text = log.read_text(encoding="utf-8") if log.is_file() else "# log\n\n"
    if line not in text:
        log.write_text(text.rstrip() + "\n\n" + line + "\n", encoding="utf-8")


def main() -> int:
    ap = argparse.ArgumentParser(description="LLM Wiki Maintenance (Lint)")
    ap.add_argument("--wiki-root", type=Path, default=_llm_wiki_root() / "wiki")
    ap.add_argument(
        "--scope",
        choices=["knowledge", "all"],
        default="knowledge",
        help="knowledge=sources+notes+concepts 검사 강조",
    )
    ap.add_argument("--no-save", action="store_true")
    ap.add_argument("--json", action="store_true")
    ap.add_argument(
        "--schema",
        action="store_true",
        help="validate frontmatter against schema/*.schema.json",
    )
    args = ap.parse_args()

    wiki_root = args.wiki_root.resolve()
    if not wiki_root.is_dir():
        print(f"wiki root not found: {wiki_root}", file=sys.stderr)
        return 1

    report = run_lint(wiki_root, args.scope)
    if args.schema:
        run_schema_lint(wiki_root, report)

    if args.json:
        print(
            json.dumps(
                {
                    "scope": report.scope,
                    "count": len(report.findings),
                    "findings": [
                        {
                            "kind": f.kind,
                            "location": f.location,
                            "detail": f.detail,
                            "action": f.action,
                        }
                        for f in report.findings
                    ],
                },
                ensure_ascii=False,
                indent=2,
            )
        )
    else:
        print(format_report_md(report))

    if args.no_save:
        return 0 if len(report.findings) == 0 else 1

    lint_dir = wiki_root / "maintenance" / "lint"
    lint_dir.mkdir(parents=True, exist_ok=True)
    fname = f"{datetime.now().strftime('%Y-%m-%d_%H%M')}_lint.md"
    out = lint_dir / fname
    out.write_text(format_report_md(report), encoding="utf-8")
    append_log(wiki_root, fname)

    if not args.json:
        print(f"\n---\n저장: wiki/maintenance/lint/{fname}", file=sys.stderr)
    return 0 if len(report.findings) == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
