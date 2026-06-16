---
name: llm-wiki
description: LLM Wiki clone 온보딩 — wiki:dev, ingest, MCP, 첫 note 페이지. Use when setting up or extending this repo's wiki.
---

# LLM Wiki Skill

## 30분 Quickstart

1. `npm install` · `npm run wiki:dev` → http://localhost:5173
2. Browse 탭: `sources/` 데모 · Parties 탭: 3파티
3. `wiki/notes/my-topic.md` 작성 (템플릿: `wiki/notes/_template.md`)
4. Browse에서 새 페이지 확인
5. MCP: `wiki_search`, `wiki_get`, `party_list`

## Ingest

```bash
python scripts/ingest_raw.py
python scripts/wiki_capture.py --title "제목" --text "본문"
python scripts/wiki_lint.py --schema
```

## MCP

`.cursor/mcp.json` → `llm-wiki` 서버. Tools: `wiki_*`, `party_*`.

See [README.md](../../README.md), [RULES.md](../../RULES.md).
