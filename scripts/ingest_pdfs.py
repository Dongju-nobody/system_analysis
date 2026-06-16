#!/usr/bin/env python3
"""
Sync PDFs from external folder → llm-wiki/raw, then wiki (via ingest_core).

Usage:
  python ingest_pdfs.py "C:\\Users\\...\\wii"
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from ingest_core import (
    append_log,
    ingest_one_pdf,
    rebuild_sources_index,
)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("source_dir", type=Path, help="Folder with PDFs (e.g. OneDrive wii)")
    ap.add_argument(
        "--llm-wiki",
        type=Path,
        default=Path(__file__).resolve().parent.parent,
    )
    ap.add_argument("--dpi", type=int, default=150)
    args = ap.parse_args()

    src_dir = args.source_dir.resolve()
    root = args.llm_wiki.resolve()
    raw_dir = root / "raw"
    wiki_root = root / "wiki"

    pdfs = sorted(src_dir.glob("*.pdf"))
    if not pdfs:
        print(f"No PDFs in {src_dir}", file=sys.stderr)
        return 1

    for pdf in pdfs:
        print(f"sync + ingest: {pdf.name}")
        ingest_one_pdf(
            pdf,
            root=root,
            dpi=args.dpi,
            synced_from="OneDrive/Desktop/wii",
            copy_into_raw=raw_dir,
        )

    rebuild_sources_index(wiki_root, raw_dir)
    append_log(wiki_root, f"external → raw: {len(pdfs)} PDFs, sources/*.md + assets")
    print(f"Done: {len(pdfs)} PDFs ingested.")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except RuntimeError as e:
        print(e, file=sys.stderr)
        sys.exit(1)
