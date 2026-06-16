# LLM Wiki — Agent Rules (Package Harness)

> 상세 운영: [AGENTS.md](AGENTS.md) · 도메인: [docs/wiki-domain.md](docs/wiki-domain.md) · 30분 가이드: [README.md](README.md)

## 활성화 (접두사)

| 접두사 | 동작 |
|--------|------|
| `/wiki` | `wiki/sources/` + `wiki/notes/` 검색·답변·캡처 |
| `/sample` | 포켓몬 8샘플 → `wiki/sources/*-samples.md` (데모 도메인) |
| `/party-main` | 파티 편성 → `wiki/parties/*-party-main.md` (데모 도메인) |

`@llm-wiki`만으로는 위키 모드 **비활성**.

## 자료 투입 → 위키

1. **raw/** — PDF·CSV·텍스트 원본 (`raw/README.md`)
2. **ingest** — `python scripts/ingest_raw.py`
3. **notes** — `/wiki` 대화 확정 시 `python scripts/wiki_capture.py`
4. **schema** — `schema/*.schema.json` + `python scripts/wiki_lint.py --schema`

## MCP (`llm-wiki`)

| Tool | 용도 |
|------|------|
| `wiki_list` | 섹션별 MD 목록 |
| `wiki_get` | 페이지 JSON |
| `wiki_search` | 키워드 검색 |
| `wiki_open_in_viewer` | 브라우저 URL |
| `party_list` / `party_get` / `party_sync` / `party_open_in_viewer` | 파티 (데모) |

등록: `.cursor/mcp.json` · 실행: `npm run wiki:mcp`

## 검증

```bash
npm run wiki:dev          # http://localhost:5173
python scripts/wiki_lint.py --schema
```

## API 키 (LLM 생성)

- **`.env` / 환경변수만** — `GOOGLE_API_KEY`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `CURSOR_API_KEY`
- **금지:** 소스코드 하드코딩, GitHub에 `.env` 커밋, 웹 UI·HTTP로 키 전송
- Browse / MCP / `party_list` — 키 불필요 · Parties **생성** — env에 해당 provider 키 필요

`.env.example`을 복사해 로컬 `.env`에만 값을 넣고 API 서버를 재시작하세요.

## Cursor 리소스

- Rules: `.cursor/rules/llm-wiki.mdc`, `pokemon-sample.mdc`, `pokemon-party-main.mdc`
- Skill: `.cursor/skills/llm-wiki/SKILL.md`
- Hook: `.cursor/hooks.json` — `wiki/**/*.md` 저장 시 lint
