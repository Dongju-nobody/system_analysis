# LLM Wiki Package

**Clone → 자료 1건 → 30분 안에 위키 페이지 + 브라우저 확인**이 목표인 LLM Wiki 패키지입니다.  
포켓몬 파티 데모 데이터가 포함되어 있어 clone 직후 Browse/Parties에서 바로 탐색할 수 있습니다.

- [RULES.md](RULES.md) — Agent 하네스 진입점
- [demo/wiki-viewer-screenshot.png](demo/wiki-viewer-screenshot.png) — UI 실사용 증명
- [docs/package-checklist.md](docs/package-checklist.md) — Package 5요구 충족표

---

## 30분 Quickstart

| 시간 | 단계 |
|------|------|
| 0–5분 | Clone · 설치 |
| 5–10분 | 데모 위키 Browse/Parties |
| 10–20분 | **내 note 1건** 추가 |
| 20–25분 | MCP 연동 |
| 25–30분 | lint 검증 |

### 0–5분: Clone & Install

```bash
git clone https://github.com/Dongju-nobody/system_analysis.git
cd system_analysis
npm install
```

**Windows:** PowerShell 실행 정책 시 `npm.cmd install`

**Python (ingest/lint):** Python 3.8+ · PDF ingest 시 `pip install pymupdf`

`.env` (로컬 전용 — **GitHub에 커밋 금지**):

```bash
cp .env.example .env
# LLM_WIKI_ROOT=<repo 절대경로>
# 파티 생성용 (선택, Browse/MCP는 키 불필요):
# GOOGLE_API_KEY=...
# ANTHROPIC_API_KEY=...
# OPENAI_API_KEY=...
# CURSOR_API_KEY=...
```

키는 **환경변수/`.env`만** 사용합니다. 웹 UI나 HTTP로 API 키를 전송하지 않습니다.

### 5–10분: 데모 위키 보기

```bash
npm run wiki:dev
```

브라우저: **http://localhost:5173**

1. **Browse** → `Notes` → `Quickstart — My First Wiki Page`
2. **Parties** → 메가리자몽Y 등 3파티 확인

### 10–20분: 내 자료 1건 추가

**방법 A — MD 직접 작성**

```bash
cp wiki/notes/quickstart-my-first-page.md wiki/notes/my-topic.md
# title·본문 수정
```

Browse → Notes → `my-topic.md` 새로고침 후 확인.

**방법 B — 캡처 스크립트**

```bash
cd scripts
python wiki_capture.py --title "My Topic" --text "본문 요약" --context "Quickstart"
```

**방법 C — raw 투입 (PDF)**

`raw/`에 PDF 배치 후:

```bash
python scripts/ingest_raw.py
```

### 20–25분: MCP (에이전트)

[`.cursor/mcp.json`](.cursor/mcp.json) — `llm-wiki` 서버

| Tool | 동작 |
|------|------|
| `wiki_list` | sources/notes/concepts/parties MD 목록 |
| `wiki_get` | `wiki/notes/my-topic.md` JSON |
| `wiki_search` | 키워드 검색 |
| `wiki_open_in_viewer` | Browse URL |
| `party_list` / `party_get` / `party_sync` / `party_open_in_viewer` | 파티 데모 |

Cursor에서 MCP 재시작 후 tool 호출.

### 25–30분: 검증

```bash
python scripts/wiki_lint.py --schema
python scripts/wiki_query.py "메가리자몽Y 약점"
```

- Browse에서 새 note 표시 확인
- `wiki/log.md`에 `note |` 또는 `lint |` 기록 (선택)

---

## Package 구조

```
├── RULES.md                 # Harness 진입
├── AGENTS.md                # 상세 Agent 지침
├── schema/                  # frontmatter JSON schema
├── raw/                     # 원본 투입
├── wiki/                    # LLM Wiki (sources, notes, concepts, parties)
├── tools/
│   ├── llm-wiki-core/       # paths, wiki-index, search, party parse
│   ├── llm-wiki-api/        # HTTP :3847
│   └── llm-wiki-mcp/        # MCP stdio
├── web/wiki-viewer/         # 통합 UI :5173
├── scripts/                 # wiki_query, ingest, lint
├── demo/                    # 스크린샷 PNG
└── .cursor/
    ├── rules/               # llm-wiki.mdc 등
    ├── skills/llm-wiki/
    └── hooks.json           # wiki MD 저장 후 lint
```

---

## npm scripts

| Script | 설명 |
|--------|------|
| `npm run wiki:dev` | API(3847) + Web(5173) |
| `npm run wiki:server` | API만 |
| `npm run wiki:web` | Web만 |
| `npm run wiki:mcp` | MCP stdio |
| `npm run party:dev` | `wiki:dev` alias |

---

## Agent 명령 (Cursor)

| 접두사 | 용도 |
|--------|------|
| `/wiki` | 위키 검색·캡처 |
| `/sample` | 포켓몬 샘플 (데모) |
| `/party-main` | 파티 편성 (데모) |

---

## 문서

| 문서 | 용도 |
|------|------|
| [docs/wiki-domain.md](docs/wiki-domain.md) | 지식 도메인 |
| [docs/journal.md](docs/journal.md) | 의사결정 저널 |
| [docs/prd-party-viewer.md](docs/prd-party-viewer.md) | PRD |
| [docs/pokemon-party-composition.md](docs/pokemon-party-composition.md) | 파티 편성 스펙 |
| [docs/party-viewer-implementation.md](docs/party-viewer-implementation.md) | API/MCP 상세 |

---

## Legacy

`mcp/party-viewer/` → `tools/`로 이전됨. `party:*` npm script는 alias.
