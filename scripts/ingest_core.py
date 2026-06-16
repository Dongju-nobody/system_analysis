"""Shared PDF → wiki/sources ingest logic."""

from __future__ import annotations

import re
import shutil
from dataclasses import dataclass
from datetime import date
from pathlib import Path

try:
    import fitz
except ImportError:
    fitz = None  # type: ignore

from extract_pdf_assets import extract, slugify

SOURCE_NAMES = {
    "vibe-coding-and-agent-coding": "vibe-coding-and-agent-coding",
    "1-vibe-coding-and-agent-coding": "vibe-coding-and-agent-coding",
    "sdlc-pipeline-in-vibe-coding": "sdlc-pipeline-in-vibe-coding",
    "2-sdlc-pipeline-in-vibe-coding": "sdlc-pipeline-in-vibe-coding",
    "agents-subprocess-calling": "agents-subprocess-calling",
    "3-agents-subprocess-calling": "agents-subprocess-calling",
    "plan-mode-sequential-and-parallel-agents": "plan-mode-sequential-and-parallel-agents",
    "4-plan-mode-sequential-and-parallel-agents": "plan-mode-sequential-and-parallel-agents",
    "agent-specifications": "agent-specifications",
    "5-agent-specifications": "agent-specifications",
    "agent-pool-and-orchestrator": "agent-pool-and-orchestrator",
    "6-agent-pool-and-orchestrator": "agent-pool-and-orchestrator",
    "harness-and-skills": "harness-and-skills",
    "7-harness-and-skills": "harness-and-skills",
    "model-context-protocol": "model-context-protocol",
    "8-model-context-protocol": "model-context-protocol",
    "loop-and-hooks": "loop-and-hooks",
    "9-loop-and-hooks": "loop-and-hooks",
}


@dataclass
class IngestResult:
    pdf_name: str
    wiki_name: str
    pages: int
    skipped: bool = False


def wiki_name_for_slug(slug: str) -> str:
    return SOURCE_NAMES.get(slug, slug)


def _fix_korean_spacing(text: str) -> str:
    if not text or re.search(r"[가-힣]\s+[가-힣]", text):
        return text.strip()
    return text.strip()


def page_title(text: str, page_num: int) -> str:
    lines = [ln.strip() for ln in text.splitlines() if ln.strip()]
    skip = re.compile(r"CSE3308|Practical Session|LLM-based", re.I)
    for ln in lines:
        if skip.search(ln):
            continue
        if len(ln) > 3 and len(ln) < 120:
            return ln
    return f"Slide {page_num}"


def extract_page_texts(pdf_path: Path) -> list[tuple[int, str]]:
    if fitz is None:
        raise RuntimeError("pip install pymupdf")
    doc = fitz.open(pdf_path)
    pages = [(i + 1, _fix_korean_spacing(page.get_text())) for i, page in enumerate(doc)]
    doc.close()
    return pages


def build_source_md(
    pdf_name: str,
    assets_slug: str,
    pages: list[tuple[int, str]],
    *,
    synced_from: str,
) -> str:
    today = date.today().isoformat()
    raw_link = f"../../raw/{pdf_name}"
    lines = [
        "---",
        f'title: "{pdf_name.replace(".pdf", "")}"',
        f'source_raw: "../../raw/{pdf_name}"',
        f'assets_slug: "{assets_slug}"',
        "tags: [cse3308, pdf-ingest]",
        f"updated: {today}",
        f"pages: {len(pages)}",
        f"synced_from: {synced_from}",
        "---",
        "",
        f"# {pdf_name.replace('.pdf', '')}",
        "",
        f"**원본:** [`{pdf_name}`](<{raw_link}>)  ",
        f"**슬라이드 이미지:** [`pages/`](../../raw/assets/{assets_slug}/pages/) ({len(pages)}장)  ",
        f"**파이프라인:** `{synced_from}`",
        "",
        "---",
        "",
    ]
    for num, text in pages:
        title = page_title(text, num)
        img = f"../../raw/assets/{assets_slug}/pages/page-{num:02d}.png"
        lines.append(f"### Page {num} — {title}")
        lines.append("")
        lines.append(f"![슬라이드 {num}]({img})")
        lines.append("")
        if text.strip():
            lines.append("#### 추출 텍스트")
            lines.append("")
            for para in re.split(r"\n{2,}", text.strip()):
                para = para.strip()
                if para:
                    lines.append(para)
                    lines.append("")
        else:
            lines.append("_이 페이지는 추출 텍스트가 거의 없습니다. 위 이미지를 참고하세요._")
            lines.append("")
        lines.append("---")
        lines.append("")
    return "\n".join(lines).rstrip() + "\n"


def ingest_one_pdf(
    pdf_path: Path,
    *,
    root: Path,
    dpi: int = 150,
    synced_from: str = "llm-wiki/raw pipeline",
    copy_into_raw: Path | None = None,
) -> IngestResult:
    """Process one PDF into assets + wiki/sources."""
    root = root.resolve()
    raw_dir = root / "raw"
    assets_root = raw_dir / "assets"
    sources_dir = root / "wiki" / "sources"

    raw_dir.mkdir(parents=True, exist_ok=True)
    sources_dir.mkdir(parents=True, exist_ok=True)

    if copy_into_raw is not None:
        dest = copy_into_raw / pdf_path.name
        shutil.copy2(pdf_path, dest)
        work_pdf = dest
    else:
        work_pdf = pdf_path.resolve()

    slug = slugify(work_pdf.name)
    wiki_name = wiki_name_for_slug(slug)
    assets_slug = slug

    extract(work_pdf, assets_root / assets_slug, dpi=dpi)
    pages = extract_page_texts(work_pdf)
    md = build_source_md(work_pdf.name, assets_slug, pages, synced_from=synced_from)
    (sources_dir / f"{wiki_name}.md").write_text(md, encoding="utf-8")

    return IngestResult(work_pdf.name, wiki_name, len(pages))


def needs_reingest(pdf: Path, root: Path, wiki_name: str, slug: str) -> bool:
    """True if PDF is new or newer than wiki output."""
    sources_md = root / "wiki" / "sources" / f"{wiki_name}.md"
    pages_dir = root / "raw" / "assets" / slug / "pages"
    if not sources_md.is_file():
        return True
    if pdf.stat().st_mtime > sources_md.stat().st_mtime:
        return True
    if not pages_dir.is_dir() or not any(pages_dir.glob("*.png")):
        return True
    return False


def list_raw_pdfs(raw_dir: Path) -> list[Path]:
    return sorted(p for p in raw_dir.glob("*.pdf") if p.is_file())


def rebuild_sources_index(wiki_root: Path, raw_dir: Path) -> None:
    """Rebuild index.md sources section from all sources/*.md."""
    sources_dir = wiki_root / "sources"
    entries: list[tuple[str, str, int]] = []
    for md in sorted(sources_dir.glob("*.md")):
        if md.name.startswith("_"):
            continue
        wiki_name = md.stem
        text = md.read_text(encoding="utf-8")
        m_pages = re.search(r"^pages:\s*(\d+)", text, re.M)
        n = int(m_pages.group(1)) if m_pages else 0
        m_raw = re.search(r'^source_raw:\s*"(.+?)"', text, re.M)
        pdf_name = Path(m_raw.group(1)).name if m_raw else f"{wiki_name}.pdf"
        if not (raw_dir / pdf_name).is_file():
            for c in raw_dir.glob("*.pdf"):
                if slugify(c.name) == wiki_name or wiki_name in slugify(c.name):
                    pdf_name = c.name
                    break
        entries.append((wiki_name, pdf_name, n))

    index_path = wiki_root / "index.md"
    block = ["## 소스 (`sources/`) — PDF→MD", ""]
    for wiki_name, pdf_name, n in entries:
        block.append(
            f"- [{wiki_name.replace('-', ' ').title()}](sources/{wiki_name}.md) — "
            f"`{pdf_name}` ({n}p)"
        )
    block.append("")

    if index_path.exists():
        content = index_path.read_text(encoding="utf-8")
        marker = "## 소스 (`sources/`) — PDF→MD"
        if marker in content:
            start = content.index(marker)
            end = content.find("\n## ", start + 1)
            if end == -1:
                end = len(content)
            content = content[:start] + "\n".join(block) + content[end:]
        else:
            content = content.rstrip() + "\n\n" + "\n".join(block)
    else:
        content = "# LLM Wiki\n\n" + "\n".join(block)
    index_path.write_text(content, encoding="utf-8")


def append_log(wiki_root: Path, msg: str) -> None:
    log = wiki_root / "log.md"
    line = f"## [{date.today().isoformat()}] ingest | {msg}"
    text = log.read_text(encoding="utf-8") if log.is_file() else "# log\n\n"
    if line not in text:
        log.write_text(text.rstrip() + "\n\n" + line + "\n", encoding="utf-8")
