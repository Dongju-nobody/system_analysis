---
title: "LLM Wiki — 구현 저널 (Journal)"
kind: journal
updated: 2026-06-14
tags: [wiki, journal, agent, decisions]
---

# LLM Wiki — 구현 저널

Wiki Tool과 Party Viewer를 만들기 위해 **에이전트·사용자가 거친 의사결정 라운드**를 시간순으로 기록한다.  
재현·이관 시 "왜 이렇게 했는가"를 추적하는 용도다.

형식: **라운드** = 한 번의 스코프 확정 또는 아키텍처 분기.

---

## Round 0 — 위키 골격 (2026-06-14)

**질문:** LLM이 읽고 쓸 지식 저장소를 어떤 형태로 둘 것인가?

**결정:**

- 저장 형식: **Markdown + YAML frontmatter** (Git 친화, 에이전트 가독성)
- 루트: `wiki/` — `sources/`, `concepts/`, `notes/`, `queries/`, `parties/`
- 검색: Python `wiki_query.py` / `wiki_search.py` (로컬 키워드, 외부 벡터 DB 없음)
- 변경 이력: `wiki/log.md` append-only

**근거:** 단일 PC·오프라인에서도 동작, Cursor가 파일 직접 읽기 가능.

---

## Round 1 — `/wiki` 프로토콜 vs `@` 멘션

**질문:** 위키 모드를 언제 켤 것인가?

**결정:**

- **`/wiki`로 메시지가 시작할 때만** 위키 검색·캡처 모드
- `@llm-wiki`만으로는 활성화 **안 함** (일반 코딩 채팅과 분리)

**근거:** 의도 없는 위키 오염 방지, 명령 스코프 명확화.

---

## Round 2 — 원천 데이터 ingest

**질문:** 파티 후보와 샘플을 어디서 가져올 것인가?

**결정:**

| 소스 | 경로 | 방법 |
|------|------|------|
| Google Sheets 150종 | `sources/pokemon-party-mega-list.md` | `ingest_google_sheet_pokemon.py` |
| pkmnchamps 샘플 | `sources/*-samples.md` | 수동·스크립트 |
| 타입 상성 이미지 | `concepts/pokemon-type-effectiveness.md` | 이미지 ingest |

**논쟁:** PDF ingest (`ingest_pdfs.py`)는 보조. 파티 도메인 핵심은 **시트 + 커뮤니티 샘플**.

---

## Round 3 — `/sample` 프로토콜

**질문:** 빌드 샘플을 어떤 형식으로 정리할 것인가?

**결정:**

- 입력: 포켓몬 이름 + **8장 이미지** (또는 그에 준하는 샘플)
- 출력: `wiki/sources/{이름}-samples.md`
- 구조: 원본 8건 보존 + **빌드 병합** + 후보 기술 목록
- 템플릿: `_sample-template.md`

**근거:** LLM이 party-main에서 **날조 없이** 빌드를 인용하려면 출처 단위가 필요.

---

## Round 4 — 파티 구성 원칙 확정

**질문:** "좋은 파티"를 어떤 규칙으로 정의할 것인가?

**결정** (`concepts/pokemon-party-building.md`):

1. **앵커** 중심 설계
2. **약점 연쇄** — ×½ 이하 약점을 순환 보완
3. **공격 타입 커버** — 동시에 쓸 수 있는 타입 폭
4. **싱글·메가 규칙** — 1인슬롯, 메가 체인 거리, 선발3 메가 ≤1

**후속:** 마스터 스펙 `docs/pokemon-party-composition.md` v1.0 → v1.1

---

## Round 5 — `/party-main` + 이중 서브에이전트

**질문:** 파티 생성을 한 번의 프롬프트로 끝낼 것인가?

**결정:**

- 명령: `/party-main {앵커}`
- **구상 에이전트** + **평가 에이전트** 루프 (스펙 v1.1: 최대 10회)
- 루브릭: 1회차 **7점 미만** 필수, **8점 초과** 통과, 미통과 시 best-of
- 출력: `parties/{앵커}-party-main.md` + `index.md`·`log.md` 갱신

**근거:** 단일 패스는 약점 연쇄·메가 규칙 위반 빈번 → 평가 피드백 루프.

---

## Round 6 — Party Viewer (Web + MCP)

**질문:** MD 파티를 사람이 보고, 에이전트가 도구로 조회하려면?

**결정:**

| 구성 | 기술 | 포트 |
|------|------|------|
| Web UI | Vite + React, 3열 | 5173 |
| HTTP API | Express + TS | 3847 |
| MCP | `party-viewer` stdio | Cursor spawn |
| 코어 | `parse-party.ts` + `manifest.json` | 공유 |

**UI:** 사이드바(목록) · 상세 · 채팅(생성)

**MCP 도구:** `party_list`, `party_get`, `party_sync`, `party_open_in_viewer`

**근거:** `/party-main`은 Cursor 규칙에 묶여 있음 → **브라우저·다른 에이전트** 접근 필요.

---

## Round 7 — 멀티 프로바이더 + 런타임 API 키

**질문:** 파티 생성 LLM을 하나로 고정할 것인가?

**결정:**

- 프로바이더: **Google (Gemini)**, Anthropic, OpenAI, **Cursor SDK**
- Party Viewer 채팅 패널 **우측 상단 API 키 붙여넣기** (메모리만, `.env` 미저장)
- 우선순위: runtime key &gt; `.env` (`GOOGLE_API_KEY` 등)
- 생성 루프: **3회** (웹 앱 기본, 스펙 10회와 분리)

**근거:** Cursor만 쓰면 Gemini/Claude 사용자 배제; 키를 파일에 안 남기려는 요구.

---

## Round 8 — 운영 중 발견 버그

| 이슈 | 원인 | 해결 |
|------|------|------|
| `GOOGLE_GENERATIVE_AI_API_KEY missing` | `google(model, { apiKey })` 잘못된 API | `createGoogleGenerativeAI({ apiKey })(model)` |
| Gemini quota `limit: 0` | Google 무료 한도/결제 | 앱 버그 아님 — 다른 프로바이더 또는 결제 |
| `localeCompare is not a function` | YAML `updated: 2026-06-14` → 숫자 `2006` | `normalizeUpdated()`, manifest `String()`, frontmatter 따옴표 |

---

## Round 10 — Package 5요구 정렬 (2026-06-14)

**결정:**

- `tools/llm-wiki-{core,api,mcp}` — MCP + HTTP 공식 경로
- `web/wiki-viewer` — Browse + Parties 통합 UI
- `RULES.md` + `.cursor/rules` + skill + hook
- `schema/` + `wiki_lint.py --schema`
- `demo/wiki-viewer-screenshot.png` + README 30분 Quickstart

**근거:** 과제 Package 제출 — clone 후 범용 Wiki + 데모 즉시 사용.

---

## Round 11 — API 키 env-only (2026-06-14)

**결정:**

- `POST/DELETE /api/providers/key` 및 런타임 키 Map 제거
- `getApiKey()` → `process.env`만 (`GOOGLE_API_KEY` 등)
- ChatPanel 키 붙여넣기 UI 제거 — `.env` 설정 + 서버 재시작 안내

**근거:** 과제 지침 — 프로그램/UI에 API 키 넣지 말 것, GitHub secret 방지.

---

## 미결·향후 검토

- [ ] `wiki/notes/` 첫 실사용 캡처
- [ ] Party Viewer 생성 스트리밍 UX 개선
- [ ] `/party-main` Cursor 규칙 파일 (`.cursor/rules/`) 공식 커밋
- [ ] 벡터 검색 필요 시 `wiki_search` 확장

---

## 참고 로그

상세 ingest·sample 이력: [wiki/log.md](../wiki/log.md)
