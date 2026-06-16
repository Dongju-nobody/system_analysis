# system_analysis

시·분· 과제

---

# LLM Wiki — 포켓몬 파티 편성 위키

**앵커 포켓몬 기준 싱글·메가 파티**를 설계·저장·조회하는 로컬 지식 베이스와 **Party Viewer** (웹 UI + MCP) 프로젝트입니다.
- 지식은 `wiki/` 아래 Markdown으로 관리합니다.
- 파티 생성은 `/party-main` (Cursor) 또는 Party Viewer 채팅 (멀티 LLM)으로 합니다.
- Cursor MCP `party-viewer`로 에이전트가 파티 목록·상세를 도구 호출합니다.

---

## 주요 기능

| 기능 | 설명 |
|------|------|
| **Wiki 검색** | `/wiki` + `wiki_query.py` — sources·concepts·notes 검색 |
| **샘플 수집** | `/sample` — 8이미지 → `wiki/sources/{이름}-samples.md` |
| **파티 편성** | `/party-main {앵커}` — 6마리 파티 MD + 평가 이력 |
| **Party Viewer** | 3열 웹 UI — 목록 · 상세 · AI 채팅 생성 |
| **MCP** | `party_list`, `party_get`, `party_sync`, `party_open_in_viewer` |

---

## 프로젝트 구조

```
llm-wiki/
├── README.md                 ← 이 문서
├── package.json
├── .env.example
├── .cursor/mcp.json          ← party-viewer MCP 등록
├── docs/
│   ├── wiki-domain.md        ← 지식 도메인 정의
│   ├── journal.md            ← 구현 의사결정 저널
│   ├── prd-party-viewer.md   ← PRD·사양서
│   ├── pokemon-party-composition.md
│   └── party-viewer-implementation.md
├── wiki/
│   ├── sources/              ← 150종 풀, 빌드 샘플
│   ├── concepts/             ← 상성, 편성 원칙
│   ├── parties/              ← 파티 MD + manifest.json
│   └── index.md
├── mcp/party-viewer/         ← HTTP API + MCP 서버
├── web/party-viewer/         ← React 웹 UI
└── scripts/                  ← wiki_query, ingest 등
```

---

## MCP Tool — `party-viewer`

Cursor가 `.cursor/mcp.json`을 통해 stdio로 MCP 서버를 실행합니다.

```json
{
  "mcpServers": {
    "party-viewer": {
      "command": "npx",
      "args": ["tsx", "mcp/party-viewer/src/mcp-server.ts"],
      "cwd": "${workspaceFolder}"
    }
  }
}
```

### 등록된 도구

| Tool | 설명 | 동작 |
|------|------|------|
| **`party_list`** | 파티 목록 | `wiki/parties/manifest.json` + MD 파싱 → slug, anchor, updated, 점수 |
| **`party_get`** | 파티 상세 | `slug`로 `{slug}-party-main.md` 읽어 구성·약점·연쇄·빌드 JSON 반환 |
| **`party_sync`** | manifest 갱신 | `wiki/parties/*-party-main.md` 스캔 후 `manifest.json` 재작성·정렬 |
| **`party_open_in_viewer`** | 웹 URL | `http://localhost:5173?party={slug}` (party:dev 실행 필요) |

### 동작 흐름

```
Cursor Agent
    │  MCP stdio
    ▼
mcp-server.ts
    │  parse-party.ts / manifest.ts
    ▼
wiki/parties/*.md  →  manifest.json
```

- **조회·동기화**는 API 키가 필요 없습니다.
- **파티 생성**은 HTTP API (`POST /api/parties/generate`) 또는 Cursor `/party-main`을 사용합니다. MCP에는 생성 tool이 없습니다 (의도적 분리).

---

## 실행 방법

### 요구 환경

| 항목 | 버전 |
|------|------|
| Node.js | 18+ 권장 |
| npm | 9+ |
| OS | Windows / macOS / Linux |

### 1. 의존성 설치

```bash
cd llm-wiki
npm install
```

**Windows (PowerShell 실행 정책):** `npm` 대신 `npm.cmd`를 사용하세요.

```powershell
npm.cmd install
```

### 2. 환경 변수

`.env.example`을 복사해 `.env`를 만듭니다.

```bash
cp .env.example .env
```

| 변수 | 설명 |
|------|------|
| `LLM_WIKI_ROOT` | 프로젝트 루트 절대 경로 |
| `PARTY_VIEWER_PORT` | HTTP API 포트 (기본 `3847`) |
| `PARTY_GENERATE_PROVIDER` | 기본 LLM (`google`, `anthropic`, `openai`, `cursor`) |
| `PARTY_MAX_ITERATIONS` | 생성 루프 횟수 (기본 `3`) |
| `GOOGLE_API_KEY` | Gemini (웹 UI 런타임 키가 우선) |
| `ANTHROPIC_API_KEY` | Claude |
| `OPENAI_API_KEY` | OpenAI |
| `CURSOR_API_KEY` | Cursor SDK |

파티 **조회만** 할 때는 `.env` 없이도 가능합니다. **생성** 시 키가 필요하며, 웹 UI 우측 상단에서 런타임으로 붙여넣을 수 있습니다 (디스크에 저장되지 않음).

### 3. Party Viewer 실행 (권장)

API(`3847`) + 웹(`5173`) 동시 실행:

```bash
npm run party:dev
```

| 스크립트 | 설명 |
|----------|------|
| `npm run party:server` | HTTP API만 (`mcp/party-viewer/src/http-server.ts`) |
| `npm run party:web` | Vite 웹만 |
| `npm run party:mcp` | MCP 서버만 (Cursor가 보통 spawn) |
| `npm run party:parse-test` | 파티 MD 파서 스모크 테스트 |

브라우저: **http://localhost:5173**

### 4. Wiki 검색 (선택)

```bash
python scripts/wiki_query.py "메가리자몽Y 약점 연쇄"
```

### 5. manifest 동기화 (API)

```bash
curl -X POST http://localhost:3847/api/parties/sync
```

---

## 에이전트 명령 (Cursor)

| 명령 | 예시 |
|------|------|
| `/wiki` | `/wiki 타입 상성표에서 물은 땅에게?` |
| `/sample` | `/sample 메가리자몽Y` + 이미지 첨부 |
| `/party-main` | `/party-main 메가리자몽Y` |

`@llm-wiki`만으로는 위키 모드가 켜지지 않습니다. 메시지는 해당 접두사로 **시작**해야 합니다.

---

## 문서 가이드

| 문서 | 용도 |
|------|------|
| [docs/wiki-domain.md](docs/wiki-domain.md) | 어떤 지식 도메인을 다루는지 |
| [docs/journal.md](docs/journal.md) | Wiki Tool 구현 의사결정 라운드 |
| [docs/prd-party-viewer.md](docs/prd-party-viewer.md) | 목표·요구사항 PRD |
| [docs/pokemon-party-composition.md](docs/pokemon-party-composition.md) | `/party-main` 재구현 스펙 |
| [docs/party-viewer-implementation.md](docs/party-viewer-implementation.md) | Web·MCP 이식 스펙 |
| [wiki/index.md](wiki/index.md) | 위키 목차 |

---

## 라이선스

Private project (`package.json`: `"private": true`).