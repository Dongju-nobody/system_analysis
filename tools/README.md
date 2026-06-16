# tools/

Package 시각화·MCP 진입점.

| 디렉터리 | 역할 |
|----------|------|
| `llm-wiki-core/` | paths, wiki-index/page/search, party manifest/parse |
| `llm-wiki-api/` | Express HTTP `:3847` (wiki + party API) |
| `llm-wiki-mcp/` | MCP stdio (`wiki_*`, `party_*`) |

```bash
npm run wiki:server   # llm-wiki-api
npm run wiki:mcp      # llm-wiki-mcp
```

Legacy: `mcp/party-viewer/` → 위 경로로 이전 (thin re-export).
