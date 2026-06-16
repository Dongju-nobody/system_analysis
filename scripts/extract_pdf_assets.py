#!/usr/bin/env python3
"""Extract PDF pages as PNG into llm-wiki/raw/assets/<slug>/pages/."""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

try:
    import fitz
except ImportError:
    print("pip install pymupdf", file=sys.stderr)
    sys.exit(1)


def slugify(name: str) -> str:
    s = re.sub(r"\.pdf$", "", name, flags=re.I)
    s = re.sub(r"^\d+\.\s*", "", s)
    s = s.lower()
    s = re.sub(r"[^a-z0-9]+", "-", s)
    return s.strip("-") or "pdf"


def extract(pdf_path: Path, out_dir: Path, dpi: int = 150) -> int:
    out_dir.mkdir(parents=True, exist_ok=True)
    pages_dir = out_dir / "pages"
    pages_dir.mkdir(exist_ok=True)
    doc = fitz.open(pdf_path)
    matrix = fitz.Matrix(dpi / 72, dpi / 72)
    for i, page in enumerate(doc):
        pix = page.get_pixmap(matrix=matrix, alpha=False)
        pix.save(str(pages_dir / f"page-{i + 1:02d}.png"))
    n = len(doc)
    doc.close()
    return n


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("pdf", type=Path)
    p.add_argument("--assets-root", type=Path, required=True)
    p.add_argument("--dpi", type=int, default=150)
    args = p.parse_args()
    slug = slugify(args.pdf.name)
    out = args.assets_root / slug
    n = extract(args.pdf, out, dpi=args.dpi)
    print(f"{slug}\t{n}")


if __name__ == "__main__":
    main()
