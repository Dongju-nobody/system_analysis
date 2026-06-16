# Package Checklist

과제 Package 5요구 × 충족 파일.

| # | 요구 | 충족 | 증거 |
|---|------|------|------|
| 1 | **Harness** — RULES + SKILL/Hook 등 | OK | [RULES.md](../RULES.md), [.cursor/rules/](../.cursor/rules/), [.cursor/skills/llm-wiki/](../.cursor/skills/llm-wiki/), [.cursor/hooks.json](../.cursor/hooks.json) |
| 2 | **LLM Wiki** — raw/, wiki/, schema, 뷰어 | OK | [raw/](../raw/), [wiki/](../wiki/), [schema/](../schema/), Browse 탭 in [web/wiki-viewer/](../web/wiki-viewer/) |
| 3 | **tools/** MCP + 뷰어 | OK | [tools/llm-wiki-mcp/](../tools/llm-wiki-mcp/), [tools/llm-wiki-api/](../tools/llm-wiki-api/), [web/wiki-viewer/](../web/wiki-viewer/) |
| 4 | **README** 30분 Quickstart | OK | [README.md](../README.md) §30분 Quickstart |
| 5 | **demo/** PNG 1장 | OK | [demo/wiki-viewer-screenshot.png](../demo/wiki-viewer-screenshot.png) |

## MCP Tools (`llm-wiki`)

- `wiki_list`, `wiki_get`, `wiki_search`, `wiki_open_in_viewer`
- `party_list`, `party_get`, `party_sync`, `party_open_in_viewer`

## 검증 명령

```bash
npm run wiki:dev
python scripts/wiki_lint.py --schema
```

## Acceptance

- [ ] Browse → notes 90+ sources, quickstart note
- [ ] Parties → 3파티
- [ ] MCP `wiki_search` / `wiki_get` 응답
- [ ] Hook: wiki MD 저장 시 lint (fail-open)
