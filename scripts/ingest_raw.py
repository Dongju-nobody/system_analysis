#!/usr/bin/env python3
"""
Raw folder ingest pipeline: PDF in llm-wiki/raw/ → assets + wiki/sources/*.md

Usage:
  python ingest_raw.py              # process new/changed PDFs in raw/
  python ingest_raw.py --force      # re-ingest all PDFs in raw/
  python ingest_raw.py --watch      # poll raw/ every N seconds
  python ingest_raw.py --watch --interval 10
"""

from __future__ import annotations

import argparse
import sys
import time
from pathlib import Path

from extract_pdf_assets import slugify
from ingest_core import (
    append_log,
    ingest_one_pdf,
    list_raw_pdfs,
    needs_reingest,
    rebuild_sources_index,
    wiki_name_for_slug,
)
def _root() -> Path:
    return Path(__file__).resolve().parent.parent


def run_pipeline(root: Path, *, force: bool, dpi: int) -> int:
    raw_dir = root / "raw"
    wiki_root = root / "wiki"
    raw_dir.mkdir(parents=True, exist_ok=True)

    pdfs = list_raw_pdfs(raw_dir)
    if not pdfs:
        print(f"No PDFs in {raw_dir} — drop files into raw/ and run again.")
        return 0

    processed = 0
    skipped = 0

    for pdf in pdfs:
        slug = slugify(pdf.name)
        wiki_name = wiki_name_for_slug(slug)
        if not force and not needs_reingest(pdf, root, wiki_name, slug):
            print(f"skip (up-to-date): {pdf.name}")
            skipped += 1
            continue
        print(f"ingest: {pdf.name}")
        ingest_one_pdf(
            pdf,
            root=root,
            dpi=dpi,
            synced_from="llm-wiki/raw pipeline",
            copy_into_raw=None,
        )
        processed += 1

    rebuild_sources_index(wiki_root, raw_dir)
    if processed:
        append_log(wiki_root, f"raw pipeline: {processed} PDF(s) → sources/*.md + assets")
        print(f"Done: {processed} ingested, {skipped} skipped.")
    else:
        print(f"Nothing to do ({skipped} already up-to-date).")
    return 0


def watch_loop(root: Path, interval: float, force: bool, dpi: int) -> None:
    print(f"Watching {root / 'raw'} every {interval}s (Ctrl+C to stop)")
    while True:
        run_pipeline(root, force=force, dpi=dpi)
        time.sleep(interval)


def main() -> int:
    ap = argparse.ArgumentParser(description="Ingest PDFs from llm-wiki/raw/ into wiki")
    ap.add_argument("--llm-wiki", type=Path, default=_root())
    ap.add_argument("--force", action="store_true", help="Re-ingest all PDFs")
    ap.add_argument("--watch", action="store_true", help="Poll raw/ for new/changed PDFs")
    ap.add_argument("--interval", type=float, default=30.0, help="Watch poll interval (seconds)")
    ap.add_argument("--dpi", type=int, default=150)
    args = ap.parse_args()

    root = args.llm_wiki.resolve()
    try:
        if args.watch:
            watch_loop(root, args.interval, args.force, args.dpi)
            return 0
        return run_pipeline(root, force=args.force, dpi=args.dpi)
    except KeyboardInterrupt:
        print("\nStopped.")
        return 0
    except RuntimeError as e:
        print(e, file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
