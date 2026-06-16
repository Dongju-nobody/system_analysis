#!/usr/bin/env python3
"""Ingest public Google Sheet: Pokémon party list + mega (1-slot) flags."""
import csv
import io
import json
import urllib.request
from datetime import date
from pathlib import Path

SHEET_ID = "1cwn7jw9pM4Di1D8fXUVCcjhbJtPiFzhrB4nofJrbyhw"
GID = "0"
SOURCE_URL = (
    f"https://docs.google.com/spreadsheets/d/{SHEET_ID}/edit?hl=ko&gid={GID}#gid={GID}"
)
EXPORT_URL = (
    f"https://docs.google.com/spreadsheets/d/{SHEET_ID}/export?format=csv&gid={GID}"
)
ROOT = Path(__file__).resolve().parent.parent
WIKI = ROOT / "wiki"
RAW = ROOT / "raw"
STEM = "pokemon-party-mega-list"

# 스프레드시트 오타 보정 (원본 B값 → 수정 B값)
SLOT_FIXES: dict[str, str] = {
    "메가엘레이드": "1",
}


def format_types(type1: str, type2: str) -> str:
    """C열=1타입, D열=2타입(비어 있으면 단일 타입)."""
    t1 = type1.strip()
    t2 = type2.strip()
    if t1 and t2:
        return f"{t1}/{t2}"
    return t1 or t2 or "—"


def row_from_name_slot(name: str, slot: str, type1: str = "", type2: str = "") -> dict:
    if name in SLOT_FIXES:
        slot = SLOT_FIXES[name]
    types = format_types(type1, type2)
    return {
        "name": name,
        "slot": slot,
        "type1": type1.strip(),
        "type2": type2.strip(),
        "types": types,
        "is_dual_type": bool(type1.strip() and type2.strip()),
        "is_one_slot": slot == "1",
        "is_six_party": slot == "0",
        "is_mega_named": name.startswith("메가"),
        "slot_corrected": name in SLOT_FIXES,
    }


def fetch_rows() -> list[dict]:
    with urllib.request.urlopen(EXPORT_URL, timeout=30) as r:
        csv_text = r.read().decode("utf-8")
    RAW.mkdir(parents=True, exist_ok=True)
    (RAW / f"{STEM}.csv").write_text(csv_text, encoding="utf-8")

    rows: list[dict] = []
    for row in csv.reader(io.StringIO(csv_text)):
        if not row or not row[0].strip():
            continue
        name = row[0].strip()
        slot = row[1].strip() if len(row) > 1 else ""
        type1 = row[2].strip() if len(row) > 2 else ""
        type2 = row[3].strip() if len(row) > 3 else ""
        rows.append(row_from_name_slot(name, slot, type1, type2))
    (RAW / f"{STEM}.json").write_text(
        json.dumps(rows, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    return rows


def build_md(rows: list[dict]) -> str:
    today = date.today().isoformat()
    one_slot = [r for r in rows if r["is_one_slot"]]
    six_party = [r for r in rows if r["is_six_party"]]
    mega_named = [r["name"] for r in rows if r["is_mega_named"]]
    mega_one_slot = [r["name"] for r in one_slot if r["is_mega_named"]]
    mega_six_party = [r["name"] for r in six_party if r["is_mega_named"]]
    one_slot_other = [r["name"] for r in one_slot if not r["is_mega_named"]]
    corrected = [r["name"] for r in rows if r.get("slot_corrected")]

    lines = [
        "---",
        'title: "포켓몬 파티·메가진화 목록 (Google Sheets)"',
        f"source_url: {SOURCE_URL}",
        f"pokemon_count: {len(rows)}",
        f"one_slot_count: {len(one_slot)}",
        f"six_party_count: {len(six_party)}",
        f"mega_named_count: {len(mega_named)}",
        f"mega_one_slot_count: {len(mega_one_slot)}",
        f"updated: {today}",
        "tags: [pokemon, google-sheets, mega-evolution, party]",
        "---",
        "",
        "# 포켓몬 파티·메가진화 목록",
        "",
        f"**출처:** [{SOURCE_URL}]({SOURCE_URL})  ",
        f"**수집일:** {today}  ",
        f"**총 포켓몬 수:** {len(rows)}",
        "",
        "## 컬럼 의미",
        "",
        "| 컬럼 | 의미 |",
        "|------|------|",
        "| A | 포켓몬 이름 |",
        "| B = `0` | **6마리 파티** 구성용 포켓몬 |",
        "| B = `1` | **1인 슬롯** 포켓몬 (대부분 메가진화) |",
        "| C | 1타입 (단일 타입이면 C만 채움) |",
        "| D | 2타입 (비어 있으면 단일 타입) |",
        "",
        "## 요약",
        "",
        f"- **6마리 파티용 (B=0):** {len(six_party)}마리",
        f"- **1인 슬롯 (B=1):** {len(one_slot)}마리",
        f"- **이름이 `메가`로 시작 (전체):** {len(mega_named)}마리",
        f"- **1인 슬롯이면서 `메가` 이름:** {len(mega_one_slot)}마리",
        "",
        "B=1은 1인 슬롯 포켓몬을 뜻하며, 스프레드시트 기준으로는 거의 전부 메가진화 포켓몬입니다.",
        f"예외 (B=1, 메가 아님): {', '.join(one_slot_other) if one_slot_other else '(없음)'}.",
    ]
    if corrected:
        fixes = ", ".join(f"{n} → B={SLOT_FIXES[n]}" for n in corrected)
        lines.append(f"로컬 보정 (스프레드시트 오타): {fixes}.")
    if mega_six_party:
        lines.append(
            f"참고 (B=0, 메가 이름): {', '.join(mega_six_party)} — 6마리 파티 목록에 있지만 이름은 메가."
        )
    lines.extend(
        [
            "",
            "---",
            "",
            "## 메가진화 포켓몬 (이름 `메가` 접두, 1인 슬롯 B=1)",
            "",
        ]
    )
    mega_by_name = {r["name"]: r for r in rows if r["is_mega_named"] and r["is_one_slot"]}
    for i, name in enumerate(mega_one_slot, 1):
        types = mega_by_name.get(name, {}).get("types", "—")
        lines.append(f"{i}. {name} — {types}")

    if mega_six_party:
        lines.extend(
            [
                "",
                "---",
                "",
                "## 메가 이름이지만 6마리 파티 (B=0)",
                "",
            ]
        )
        for i, name in enumerate(mega_six_party, 1):
            lines.append(f"{i}. {name}")

    if one_slot_other:
        lines.extend(
            [
                "",
                "---",
                "",
                "## 1인 슬롯이지만 메가가 아닌 포켓몬 (B=1)",
                "",
            ]
        )
        for i, name in enumerate(one_slot_other, 1):
            lines.append(f"{i}. {name}")

    lines.extend(
        [
            "",
            "---",
            "",
            "## 6마리 파티용 포켓몬 (B=0)",
            "",
        ]
    )
    for i, r in enumerate(six_party, 1):
        lines.append(f"{i}. {r['name']} — {r['types']}")

    lines.extend(
        [
            "",
            "---",
            "",
            "## 전체 목록 (원본 순서)",
            "",
            "| # | 포켓몬 | 타입 | B | 구분 |",
            "|---|--------|------|---|------|",
        ]
    )
    for i, r in enumerate(rows, 1):
        kind = "1인 슬롯" if r["is_one_slot"] else "6마리 파티"
        if r["is_mega_named"]:
            kind += " · 메가"
        if r.get("slot_corrected"):
            kind += " · 보정"
        lines.append(f"| {i} | {r['name']} | {r['types']} | {r['slot']} | {kind} |")

    lines.append("")
    return "\n".join(lines)


def update_index(stem: str) -> None:
    index = WIKI / "index.md"
    text = index.read_text(encoding="utf-8") if index.exists() else "# LLM Wiki\n"
    line = f"- [포켓몬 파티·메가 목록 (Google Sheets)](sources/{stem}.md) — 웹 ingest"
    if line not in text:
        marker = "## 소스 (`sources/`) — PDF→MD"
        if marker in text:
            insert = text.find(marker) + len(marker)
            text = text[:insert] + "\n\n" + line + text[insert:]
        else:
            text = text.rstrip() + f"\n\n## 소스\n\n{line}\n"
    index.write_text(text, encoding="utf-8")


def append_log(msg: str) -> None:
    log = WIKI / "log.md"
    line = f"## [{date.today().isoformat()}] ingest | {msg}"
    text = log.read_text(encoding="utf-8") if log.is_file() else "# log\n\n"
    if line not in text:
        log.write_text(text.rstrip() + "\n\n" + line + "\n", encoding="utf-8")


def main() -> None:
    (WIKI / "sources").mkdir(parents=True, exist_ok=True)
    rows = fetch_rows()
    out = WIKI / "sources" / f"{STEM}.md"
    out.write_text(build_md(rows), encoding="utf-8")
    update_index(STEM)
    one_slot = sum(1 for r in rows if r["is_one_slot"])
    mega = sum(1 for r in rows if r["is_mega_named"])
    mega_one = sum(1 for r in rows if r["is_mega_named"] and r["is_one_slot"])
    dual = sum(1 for r in rows if r["is_dual_type"])
    append_log(
        f"Google Sheets 포켓몬 목록 {len(rows)}종 "
        f"(1인슬롯 {one_slot}, 메가·1인슬롯 {mega_one}, C/D 타입 반영·복합타입 {dual}) "
        f"→ sources/{out.name}"
        + ("; 보정: 메가엘레이드 B=1" if any(r.get("slot_corrected") for r in rows) else "")
    )
    print(f"rows={len(rows)} one_slot={one_slot} mega={mega} mega_one_slot={mega_one} -> {out}")


if __name__ == "__main__":
    main()
