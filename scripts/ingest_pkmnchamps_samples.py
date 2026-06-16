#!/usr/bin/env python3
"""Fetch Garchomp (445) public samples from pkmnchamps Supabase and save to wiki."""
import json
import urllib.parse
import urllib.request
from datetime import date
from pathlib import Path

SUPABASE = "https://misabaliuftjkqigysvv.supabase.co"
ANON_KEY = (
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9."
    "eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1pc2FiYWxpdWZ0amtxaWd5c3Z2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3NjczMjIsImV4cCI6MjA5MDM0MzMyMn0."
    "0HXY6wd5czlPCyyzWGYfkDlJkZLryDA3Arc544t9Ges"
)
POKEMON_ID = 445
TOP_N = 8
SOURCE_URL = "https://pkmnchamps.com/pokedex/445"
ROOT = Path(__file__).resolve().parent.parent
WIKI = ROOT / "wiki"
RAW = ROOT / "raw"


def supabase_get(table: str, params: dict) -> list:
    q = urllib.parse.urlencode(params, safe="*,()")
    url = f"{SUPABASE}/rest/v1/{table}?{q}"
    req = urllib.request.Request(
        url,
        headers={
            "apikey": ANON_KEY,
            "Authorization": f"Bearer {ANON_KEY}",
            "Accept": "application/json",
        },
    )
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read().decode("utf-8"))


def fetch_top_samples(limit: int = TOP_N) -> list[dict]:
    params = {
        "select": "*",
        "pokemon_id": f"eq.{POKEMON_ID}",
        "is_public": "eq.true",
        "copied_from": "is.null",
        "order": "view_count.desc,created_at.desc",
        "limit": str(limit),
    }
    return supabase_get("pokemon_samples", params)


def fmt_sample(s: dict, i: int) -> str:
    moves = s.get("move_slots") or s.get("moves") or []
    if isinstance(moves, str):
        try:
            moves = json.loads(moves)
        except json.JSONDecodeError:
            moves = [moves]
    moves = [m for m in moves if m]

    sps = s.get("sps") or s.get("evs") or s.get("ev_spread") or {}
    if isinstance(sps, str):
        try:
            sps = json.loads(sps)
        except json.JSONDecodeError:
            sps = {}

    form = s.get("mega_form") or s.get("form") or s.get("pokemon_form") or "기본"

    lines = [
        f"### 샘플 {i}",
        "",
        f"- **순위:** {i} (조회수 {s.get('view_count', 0)})",
        f"- **이름/제목:** {s.get('title') or s.get('name') or '(제목 없음)'}",
        f"- **폼:** {form}",
        f"- **레벨:** {s.get('level') or '-'}",
        f"- **성격:** {s.get('nature') or '-'}",
        f"- **특성:** {s.get('ability') or '-'}",
        f"- **도구:** {s.get('item') or '-'}",
    ]
    if sps:
        lines.append(f"- **배율(sps):** `{json.dumps(sps, ensure_ascii=False)}`")
    if moves:
        lines.append("- **기술:**")
        for m in moves:
            lines.append(f"  - {m}")
    note = s.get("description") or s.get("memo") or s.get("comment")
    if note:
        lines.append(f"- **메모:** {note}")
    lines.append("")
    return "\n".join(lines)


def build_md(samples: list[dict]) -> str:
    today = date.today().isoformat()
    body = [
        "---",
        'title: "한카리아스 상위 샘플 8 (pkmnchamps #445)"',
        f"source_url: {SOURCE_URL}",
        "pokemon_id: 445",
        "pokemon_name: 한카리아스",
        f"sample_count: {len(samples)}",
        "selection: view_count.desc 상위 8",
        f"updated: {today}",
        "tags: [pkmnchamps, sample, garchomp]",
        "---",
        "",
        "# 한카리아스 상위 샘플 (PkmnChamps)",
        "",
        f"**출처:** [{SOURCE_URL}]({SOURCE_URL})  ",
        "**데이터:** PkmnChamps 공개 `pokemon_samples` — **조회수(`view_count`) 상위 8개**  ",
        f"**수집일:** {today}  ",
        f"**샘플 수:** {len(samples)}",
        "",
        "---",
        "",
    ]
    if not samples:
        body.append("_공개 샘플이 없거나 조회에 실패했습니다._")
    else:
        for i, s in enumerate(samples, 1):
            body.append(fmt_sample(s, i))
            body.append("---")
            body.append("")
    return "\n".join(body).rstrip() + "\n"


def update_index(wiki_stem: str) -> None:
    index = WIKI / "index.md"
    text = index.read_text(encoding="utf-8") if index.exists() else "# LLM Wiki\n"
    line = f"- [한카리아스 샘플 (pkmnchamps)](sources/{wiki_stem}.md) — 웹 ingest"
    if line not in text:
        marker = "## 소스 (`sources/`) — PDF→MD"
        if marker in text:
            insert_at = text.find("\n## ", text.index(marker) + 1)
            if insert_at == -1:
                text = text.rstrip() + "\n" + line + "\n"
            else:
                # insert after marker block first bullet or empty
                if "(없음" in text:
                    text = text.replace("- (없음 — `raw/`에 PDF 넣고 `ingest-raw.bat` 실행)", line)
                else:
                    text = text.rstrip() + "\n" + line + "\n"
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
    RAW.mkdir(parents=True, exist_ok=True)
    (WIKI / "sources").mkdir(parents=True, exist_ok=True)

    samples = fetch_top_samples()
    raw_path = RAW / "pkmnchamps-garchomp-445-samples.json"
    raw_path.write_text(json.dumps(samples, ensure_ascii=False, indent=2), encoding="utf-8")

    md = build_md(samples)
    out = WIKI / "sources" / "pkmnchamps-garchomp-445-samples.md"
    out.write_text(md, encoding="utf-8")
    update_index(out.stem)
    append_log(
        f"pkmnchamps 한카리아스 상위 샘플 {len(samples)}건 (view_count) "
        f"→ sources/{out.name}"
    )
    print(f"samples={len(samples)} -> {out}")


if __name__ == "__main__":
    main()
