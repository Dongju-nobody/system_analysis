---
title: "LLM Wiki — 지식 도메인 정의"
kind: domain-definition
updated: 2026-06-14
tags: [wiki, pokemon, party, domain]
---

# LLM Wiki — 지식 도메인 정의

## 1. 한 줄 정의

**LLM Wiki**는 **포켓몬 배틀(싱글·메가진화 규칙)** 에서 **앵커 포켓몬을 중심으로 한 6마리 파티 편성**에 필요한 지식을 Markdown으로 축적·검색·생성하는 **로컬 지식 베이스**이다.

에이전트(Cursor, Gemini, Claude 등)가 파티를 설계할 때 **출처가 있는 근거**(샘플 빌드, 후보 풀, 상성표, 편성 원칙)를 읽고, 결과를 **재현 가능한 MD 파일**로 남긴다.

---

## 2. 도메인 경계

### 포함 (In scope)

| 영역 | 설명 |
|------|------|
| **싱글·메가 규칙** | 1인 슬롯(권장 1·허용 2), 배틀당 메가 1회, 선발 3 중 메가 ≤1 |
| **타입 상성** | 18타입 배율, 복합타입 곱연산, 타입별 고유 특성 |
| **파티 편성 논리** | 앵커 → 약점 연쇄 보완 → 공격 타입 커버 |
| **후보 풀** | Google Sheets 기반 150종(1인슬롯·메가·복합타입) |
| **실전 빌드 샘플** | 커뮤니티/이미지 기반 8샘플 → 정리된 빌드·후보 기술 |
| **파티 산출물** | `wiki/parties/{앵커}-party-main.md` (구성·연쇄·평가·선발3·멤버 빌드) |
| **조회·생성 도구** | Party Viewer Web UI, `party-viewer` MCP, `/party-main` 프로토콜 |

### 제외 (Out of scope)

| 영역 | 이유 |
|------|------|
| 더블·트리플·랭크 배틀 | 규칙·평가 기준이 다름 |
| VGC 팀 빌딩(4마리·테라스탈 중심) | 별도 메타·데이터셋 |
| 포켓몬 도감·스토리·육성 일반론 | 파티 편성과 직접 연결되지 않음 |
| 실시간 대전 매칭·시뮬레이터 | 외부 서비스 영역 |
| 샘플 MD에 없는 빌드 **날조** | 출처 없는 지식은 위키에 쓰지 않음 |

---

## 3. 지식 계층 (레이어)

```
┌─────────────────────────────────────────────────────────┐
│  parties/          최종 파티 (에이전트 산출·사용자 확정)   │
├─────────────────────────────────────────────────────────┤
│  concepts/         원칙·상성 (대화에서 확정된 규칙)        │
├─────────────────────────────────────────────────────────┤
│  sources/          원천 데이터 (시트·이미지·커뮤니티)     │
├─────────────────────────────────────────────────────────┤
│  notes/            /wiki 대화에서 캡처한 메모           │
├─────────────────────────────────────────────────────────┤
│  queries/          wiki_query.py 검색 기록              │
└─────────────────────────────────────────────────────────┘
```

### `sources/` — 근거 데이터

- `pokemon-party-mega-list.md` — **필수** 후보 150종
- `{포켓몬}-samples.md` — `/sample`로 수집한 8샘플 기반 빌드
- 외부 ingest (Google Sheets, pkmnchamps 등)

### `concepts/` — 도메인 규칙

- `pokemon-type-effectiveness.md` — 상성표
- `pokemon-party-building.md` — 앵커·연쇄·커버 원칙 요약

### `parties/` — 편성 결과

- `{앵커}-party-main.md` — `/party-main` 또는 Party Viewer 생성 결과
- `manifest.json` — 목록·정렬·점수 메타 (Party Viewer가 유지)

### `notes/` · `queries/`

- 대화 확정 지식 캡처 (`wiki_capture.py`)
- 질의 검색 로그 (`wiki_query.py`)

---

## 4. 에이전트 프로토콜 (명령 접두사)

| 접두사 | 활성 조건 | 읽기 | 쓰기 |
|--------|-----------|------|------|
| `/wiki` | 메시지가 `/wiki`로 **시작** | `sources/`, `notes/`, `concepts/` | `notes/` (확정 시) |
| `/sample` | `/sample` + 포켓몬명 + 이미지 | — | `sources/{이름}-samples.md` |
| `/party-main` | `/party-main` + 앵커명 | concepts, sources, samples | `parties/{앵커}-party-main.md` |

**주의:** `@llm-wiki`만으로는 위키 모드가 켜지지 않는다. 접두사가 스코프를 결정한다.

---

## 5. 핵심 개념 용어

| 용어 | 정의 |
|------|------|
| **앵커** | 파티 편성의 출발 포켓몬. 약점 연쇄의 첫 고리 |
| **약점 연쇄** | 앵커 약점 → 보완 멤버 → 그 멤버 약점 → … 순환 보완 |
| **공격 커버** | 파티가 한 턴에 쓸 수 있는 공격 타입의 폭 |
| **1인 슬롯** | 한 포켓몬이 두 역할을 겸하는 슬롯 (권장 1, 허용 2) |
| **메가 체인 거리** | 약점 연쇄 그래프에서 메가끼리 인접 단계 ≤3 금지 |
| **선발 3** | 실전 선발 예시 3마리 (메가는 최대 1마리) |

---

## 6. 품질·출처 원칙

1. **150종 밖 포켓몬**은 목록에 없으면 제안하지 않는다.
2. **빌드**는 `sources/*-samples.md`에 있는 것만 인용·요약한다.
3. **평가 루프** — 구상·평가 서브에이전트, 1회차 &lt;7점, 통과 &gt;8점 (Party Viewer는 3회 루프).
4. **YAML frontmatter** — `updated: "YYYY-MM-DD"`처럼 날짜는 **따옴표** 필수 (미따옴표 시 `2006` 숫자 파싱 버그).

---

## 7. Package 구조 (`tools/`)

| 경로 | 역할 |
|------|------|
| `tools/llm-wiki-core/` | wiki/party 공유 코어 |
| `tools/llm-wiki-api/` | HTTP API |
| `tools/llm-wiki-mcp/` | MCP (`wiki_*`, `party_*`) |
| `web/wiki-viewer/` | Browse + Parties UI |

## 8. 관련 문서

| 문서 | 역할 |
|------|------|
| [journal.md](./journal.md) | Wiki Tool 구현 시 에이전트 의사결정 기록 |
| [prd-party-viewer.md](./prd-party-viewer.md) | Party Viewer + Wiki Tool 목표·요구사항 |
| [pokemon-party-composition.md](./pokemon-party-composition.md) | `/party-main` 재구현 스펙 |
| [party-viewer-implementation.md](./party-viewer-implementation.md) | Web·API·MCP 이식 스펙 |
| [../wiki/index.md](../wiki/index.md) | 위키 목차·링크 허브 |
