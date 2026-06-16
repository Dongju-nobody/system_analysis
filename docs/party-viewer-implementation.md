---
title: "Party Viewer Web + MCP — 구현 스펙"
kind: implementation-spec
version: "1.0"
updated: 2026-06-14
tags: [party-viewer, mcp, web-ui, multi-provider, portable]
related:
  - docs/pokemon-party-composition.md
  - wiki/parties/_party-main-template.md
---

# Party Viewer Web + MCP — 이식용 구현 스펙

> **이 문서만 읽고** 다른 PC·Gemini·Claude·에이전트가 **동일한 Party Viewer**를 처음부터 재구현할 수 있도록 작성되었다.  
> 파티 **생성 로직**(약점 연쇄·루브릭·150종 풀)은 [docs/pokemon-party-composition.md](./pokemon-party-composition.md) v1.1+ 를 따른다. 본 문서는 **뷰어·API·MCP·멀티 프로바이더·웹 키 연동**에 집중한다.

---

## 0. 한 줄 요약

| 구성요소 | 기술 | 포트 |
|----------|------|------|
| 웹 UI | Vite + React | `5173` |
| HTTP API | Express (TypeScript) | `3847` |
| MCP 서버 | `@modelcontextprotocol/sdk` stdio | (Cursor가 spawn) |
| 공유 코어 | MD 파서 + manifest | `mcp/party-viewer/src/core/` |
| 파티 생성 | Cursor SDK **또는** Gemini/Claude/OpenAI (3회 루프) | — |

```bash
npm run party:dev   # API + 웹 동시 실행
```

---

## 1. 목표 UI

3열 CSS Grid: `240px | 1fr | 360px`, `100vh`

| 열 | 컴포넌트 | 역할 |
|----|----------|------|
| 왼쪽 | `PartySidebar` | `manifest.json` 파티 목록, 점수·날짜, 동기화 버튼 |
| 가운데 | `PartyDetail` | 선택 파티 상세 (구성·약점·연쇄·커버·평가·선발3·빌드) |
| 오른쪽 | `ChatPanel` | AI 선택 + **상단 API 키 붙여넣기** + 파티 생성 채팅 |

**조회**(목록·상세)는 API 키 **불필요**. **생성**만 키 필요.

---

## 2. 디렉터리 구조

```
llm-wiki/
├── package.json
├── .env.example
├── .cursor/mcp.json
├── docs/
│   ├── pokemon-party-composition.md    # /party-main 생성 스펙 (별도)
│   └── party-viewer-implementation.md  # 본 문서
├── mcp/party-viewer/
│   ├── tsconfig.json
│   └── src/
│       ├── http-server.ts
│       ├── mcp-server.ts
│       ├── generate.ts
│       ├── env.ts
│       ├── core/
│       │   ├── types.ts
│       │   ├── paths.ts
│       │   ├── parse-party.ts
│       │   └── manifest.ts
│       └── providers/
│           ├── types.ts
│           ├── config.ts
│           ├── runtime-keys.ts
│           ├── context.ts
│           ├── llm.ts
│           ├── party-loop.ts
│           ├── write-party.ts
│           └── cursor.ts
├── web/party-viewer/
│   ├── index.html
│   ├── vite.config.ts
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── api.ts
│       ├── PartySidebar.tsx
│       ├── PartyDetail.tsx
│       ├── ChatPanel.tsx
│       └── styles.css
└── wiki/parties/
    ├── manifest.json
    ├── _party-main-template.md
    └── {앵커}-party-main.md
```

---

## 3. 아키텍처

```mermaid
flowchart LR
  subgraph web [web/party-viewer :5173]
    Sidebar[PartySidebar]
    Detail[PartyDetail]
    Chat[ChatPanel]
  end
  subgraph api [http-server :3847]
    Health[/api/health]
    Parties[/api/parties]
    Gen[/api/parties/generate]
  end
  subgraph core [party-core]
    Parser[parse-party]
    Manifest[manifest.json]
  end
  subgraph mcp [mcp-server stdio]
    Tools[party_list party_get party_sync]
  end
  subgraph gen [생성]
    Cursor[Cursor SDK]
    Loop[party-loop x3]
  end
  Sidebar --> Parties
  Detail --> Parties
  Chat --> Gen
  Parties --> core
  Gen --> Cursor
  Gen --> Loop
  Loop --> wikiMD[wiki/parties/*.md]
  Cursor --> wikiMD
  mcp --> core
```

---

## 4. party-core

### 4.1 `PartyRecord` (JSON 상세 모델)

```typescript
interface PartyRecord {
  slug: string;           // "메가리자몽Y"
  anchor: string;
  types: string;
  updated: string;
  filePath: string;       // wiki/parties/메가리자몽Y-party-main.md
  evaluation?: {
    iterations: number;
    finalScore: number;
    finalStatus: "passed" | "best_of_10" | "best_of_3";
    selectedIteration: number;
  };
  members: { slot: string; name: string; types: string; role: string }[];
  weaknesses: { type: string; multiplier: string; note?: string }[];
  weaknessChain: string;
  attackCoverage: { type: string; owners: string }[];
  evaluationHistory: { round: number; score: number; passed: boolean; feedback: string }[];
  bring3: { name: string; mega: boolean; reason: string }[];
  memberBuilds: {
    name: string; types: string; role: string;
    recommended: string; samplePath?: string; allBuilds: string[];
  }[];
}
```

### 4.2 `parsePartyMarkdown(md, slug?)`

`gray-matter`로 frontmatter 파싱. 섹션 헤더 기준:

| 섹션 | 파싱 |
|------|------|
| `## 파티 구성` | 테이블 → members (cols: #, 포켓몬, 타입, 슬롯, 역할) |
| `## 앵커 약점` | 테이블 → weaknesses |
| `## 약점 연쇄` | 코드블록 텍스트 |
| `## 공격 타입 커버` | 테이블 → attackCoverage |
| `## 편성·평가 이력` | 없으면 `[]` (구 파티 호환) |
| `## 선발 3 예시` | 테이블 → bring3 |
| `## 멤버별 샘플` | `###` 블록 → memberBuilds |

### 4.3 manifest

**경로:** `wiki/parties/manifest.json`

```json
{
  "parties": [
    { "slug": "메가리자몽Y", "anchor": "메가리자몽Y", "file": "메가리자몽Y-party-main.md", "updated": "2026-06-14" }
  ]
}
```

| 함수 | 동작 |
|------|------|
| `listParties()` | manifest 읽기 → 요약 목록 (types는 MD에서 추출) |
| `getParty(slug)` | `{slug}-party-main.md` 읽기 → parse |
| `syncManifest()` | `*-party-main.md` 스캔 (`_` 제외), manifest 갱신 |

**wiki root:** `LLM_WIKI_ROOT` env 또는 `mcp/party-viewer/src/core` 기준 4단계 상위.

---

## 5. HTTP API (`:3847`)

### 5.1 엔드포인트

| Method | Path | Body | 응답 |
|--------|------|------|------|
| GET | `/api/health` | — | `{ ok, providers, defaultProvider, maxIterations }` |
| GET | `/api/parties` | — | `{ parties: PartyListItem[] }` |
| GET | `/api/parties/:slug` | — | `{ party: PartyRecord }` |
| POST | `/api/parties/sync` | — | `{ manifest }` |
| POST | `/api/parties/generate` | `{ anchor, provider? }` | `202 { jobId, anchor, provider }` |
| GET | `/api/parties/generate/:jobId/stream` | — | SSE |
| GET | `/api/parties/generate/:jobId` | — | `{ job }` |

### 5.2 SSE 이벤트

```json
{ "type": "message", "text": "..." }
{ "type": "done", "slug": "한카리아스", "anchor": "한카리아스" }
{ "type": "error", "error": "..." }
```

500ms 간격으로 job.messages 폴링.

### 5.3 Vite proxy

`web/party-viewer/vite.config.ts`:

```typescript
server: {
  port: 5173,
  proxy: { "/api": { target: "http://localhost:3847", changeOrigin: true } }
}
```

---

## 6. API 키 — 환경변수 전용

| 변수 | Provider |
|------|----------|
| `GOOGLE_API_KEY` | google (Gemini) |
| `ANTHROPIC_API_KEY` | anthropic (Claude) |
| `OPENAI_API_KEY` | openai |
| `CURSOR_API_KEY` | cursor |

- **저장:** 로컬 `.env` 또는 OS 환경변수만 (`.gitignore`에 `.env`)
- **금지:** 웹 UI 붙여넣기, `POST /api/providers/key`, 소스코드 하드코딩, GitHub에 secret 커밋
- **재시작:** `.env` 변경 후 API 서버 재시작 필요

```typescript
// runtime-keys.ts — env 읽기 + provider 검증
getEnvKey(provider)
isValidProvider(value)

// config.ts
getApiKey(provider)  // process.env only
hasProviderKey(provider)
```

### 6.1 웹 UI

1. AI 드롭다운: `google` | `anthropic` | `openai` | `cursor`
2. env에 키가 있으면 드롭다운 `✓`, `{Provider} (env)` 배지
3. welcome: `.env` 설정 + 서버 재시작 안내 (키 입력 필드 없음)

---

## 7. 멀티 프로바이더 생성

`provider`: `"cursor" | "anthropic" | "google" | "openai"`

### 7.1 Cursor 경로

```typescript
Agent.prompt(`/party-main ${anchor}`, {
  apiKey: getApiKey("cursor"),
  model: { id: "composer-2.5" },
  local: { cwd: LLM_WIKI_ROOT },
});
```

완료 후 `syncManifest()` — Cursor 에이전트가 MD·index·log를 직접 씀.

### 7.2 Gemini / Claude / OpenAI 경로

Node가 wiki 컨텍스트를 프롬프트에 **주입** (tool-calling 없음):

| 파일 | 용도 |
|------|------|
| `docs/pokemon-party-composition.md` | §3b·§11·§8 발췌 |
| `wiki/concepts/pokemon-party-building.md` | 구성 원칙 |
| `wiki/concepts/pokemon-type-effectiveness.md` | 상성표 |
| `wiki/sources/pokemon-party-mega-list.md` | 150종 풀 |
| `wiki/parties/_party-main-template.md` | 출력 템플릿 |
| `wiki/sources/{이름}-samples.md` | 멤버별 샘플 (존재 시) |

**3회 루프** (`PARTY_MAX_ITERATIONS=3`):

```
for i in 1..3:
  draft = callBuilder(anchor, i, prevFeedback)
  eval = callEvaluator(draft, i)  // JSON { score, feedback, passed }
  if i==1 and score>=7 → score=6.5, feedback += "[1회차 7점 미만 강제]"
  if score > 8 → passed, break
else → best_of_3 (최고점 draft)
writePartyFile(anchor, result)
```

Vercel AI SDK:

```typescript
import { generateText } from "ai";
import { google } from "@ai-sdk/google";
// anthropic(modelId, { apiKey }), openai(modelId, { apiKey })
```

### 7.3 생성 후 저장 (`write-party.ts`)

1. `wiki/parties/{anchor}-party-main.md` 쓰기
2. `wiki/index.md` 파티 링크 append (없을 때만)
3. `wiki/log.md` 한 줄 append
4. `syncManifest()`

### 7.4 검증 (1차)

- 멤버가 150종 풀에 있는지
- `wiki/sources/{이름}-samples.md` 존재 여부
- 경고는 MD HTML 주석으로 append

---

## 8. MCP 서버 (stdio)

**등록:** `.cursor/mcp.json`

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

| Tool | 입력 | 출력 |
|------|------|------|
| `party_list` | — | `{ parties }` JSON |
| `party_get` | `slug` | `{ party }` JSON |
| `party_sync` | — | `{ manifest }` JSON |
| `party_open_in_viewer` | `slug` | `{ url: "http://localhost:5173?party={slug}" }` |

MCP는 **읽기·동기화**만. **생성은 HTTP+웹** 담당.

`@modelcontextprotocol/sdk` — `McpServer` + `registerTool` + `StdioServerTransport`.

---

## 9. 웹 컴포넌트 상세

### 9.1 `PartySidebar`

- `GET /api/parties`
- 클릭 → URL `?party=slug` + center fetch
- [새로고침] → `POST /api/parties/sync`

### 9.2 `PartyDetail`

- `GET /api/parties/:slug`
- 섹션: 구성, 약점, 연쇄(`pre`), 커버, 평가 이력, 선발3, 멤버 빌드 카드

### 9.3 `ChatPanel`

- 마운트: `GET /api/health`
- 헤더: 키 입력 + [연동]
- AI 드롭다운 + 생성 폼
- `POST /api/parties/generate` → `EventSource` SSE

### 9.4 스타일

- 다크 테마, 한글 UI, 외부 UI 라이브러리 없음
- Grid `240px 1fr 360px`

---

## 10. 환경변수 (`.env.example`)

```env
PARTY_GENERATE_PROVIDER=google
PARTY_MAX_ITERATIONS=3
LLM_WIKI_ROOT=/path/to/llm-wiki
PARTY_VIEWER_PORT=3847

CURSOR_API_KEY=
ANTHROPIC_API_KEY=
GOOGLE_API_KEY=
OPENAI_API_KEY=

PARTY_MODEL_ANTHROPIC=claude-sonnet-4-5
PARTY_MODEL_GOOGLE=gemini-2.0-flash
PARTY_MODEL_OPENAI=gpt-4o
```

`env.ts`: 시작 시 `.env` 읽기 (`process.env`에 없는 키만 설정).

---

## 11. package.json 스크립트

```json
{
  "scripts": {
    "party:server": "tsx mcp/party-viewer/src/http-server.ts",
    "party:mcp": "tsx mcp/party-viewer/src/mcp-server.ts",
    "party:web": "vite --config web/party-viewer/vite.config.ts",
    "party:dev": "concurrently \"npm run party:server\" \"npm run party:web\"",
    "party:parse-test": "tsx mcp/party-viewer/src/test-parse.ts"
  }
}
```

### 의존성

**runtime:** `express`, `cors`, `gray-matter`, `zod`, `@modelcontextprotocol/sdk`, `@cursor/sdk`, `ai`, `@ai-sdk/anthropic`, `@ai-sdk/google`, `@ai-sdk/openai`

**dev:** `tsx`, `typescript`, `vite`, `@vitejs/plugin-react`, `react`, `react-dom`, `concurrently`

---

## 12. 구현 순서 (권장)

1. `party-core` — types, paths, parse-party, manifest + `party:parse-test` (기존 MD 2건)
2. `manifest.json` 시드 + HTTP list/get/sync
3. HTTP server + Vite 웹 (읽기 전용 3열)
4. MCP stdio + `.cursor/mcp.json`
5. providers — config, runtime-keys, llm, context, party-loop, write-party, cursor
6. generate + SSE + ChatPanel 생성
7. ChatPanel API 키 붙여넣기 UI
8. 문서·index·log

---

## 13. 완료 기준 (체크리스트)

- [ ] `npm run party:dev` → `localhost:5173` 3열 UI
- [ ] 메가리자몽Y·대쓰여너 선택 시 가운데 상세 렌더 (키 없이)
- [ ] 웹 상단 키 붙여넣기 → 연동 → 생성 버튼 활성화
- [ ] Gemini/Claude/OpenAI/Cursor 각각 생성 동작 (해당 키 있을 때)
- [ ] 3회 루프 SSE에 회차별 메시지
- [ ] MCP `party_list` / `party_get` 동작
- [ ] 서버 재시작 후 런타임 키 소멸 (`.env` 키는 유지)

---

## 14. Gemini에게 넘길 때 프롬프트 예시

```
다음 문서를 읽고 Party Viewer를 처음부터 구현해줘.

1. docs/party-viewer-implementation.md (본 문서 — 뷰어·API·MCP·키 연동)
2. docs/pokemon-party-composition.md (파티 생성 스펙 — /party-main)

저장소 루트에 llm-wiki/ 가 있다고 가정.
wiki/parties/ 에 기존 *-party-main.md 가 있으면 파서 테스트에 사용.
Canvas는 제외. 브라우저 웹앱 + MCP만.
```

---

## 15. 관련 문서

| 문서 | 내용 |
|------|------|
| [pokemon-party-composition.md](./pokemon-party-composition.md) | `/party-main` 파티 편성·평가 루프·루브릭 |
| [wiki/parties/_party-main-template.md](../wiki/parties/_party-main-template.md) | 출력 MD 템플릿 |
| [wiki/index.md](../wiki/index.md) | 위키 목차 |

---

## 변경 이력

| 날짜 | 내용 |
|------|------|
| 2026-06-14 | v1.0 — Party Viewer 이식용 통합 스펙 (웹+MCP+멀티프로바이더+런타임 키 UI) |
