# LLM Wiki — 목차

## 어떻게 쓰나

1. **Cursor:** 메시지를 **`/wiki`로 시작** (예: `/wiki 에이전트 코딩이란?`). `@llm-wiki`만으로는 위키 모드가 **켜지지 않음**.
2. **샘플 수집:** **`/sample`로 시작** + 포켓몬 이름 + 8샘플 이미지 → `wiki/sources/<이름>-samples.md`
3. **파티 구성:** **`/party-main`로 시작** + 앵커 포켓몬 이름 → `wiki/parties/<이름>-party-main.md` (파티 + 멤버별 샘플). **구현 스펙:** [docs/pokemon-party-composition.md](../docs/pokemon-party-composition.md)
4. **파티 뷰어:** `npm run wiki:dev` → [Wiki Viewer](http://localhost:5173) (Browse · Parties). MCP: `llm-wiki` (`wiki_*`, `party_*`)
5. **답할 때:** `wiki/sources/` + `wiki/notes/` 검색 (`wiki_query.py`)
6. **남길 때:** `/wiki` 대화에서 확정한 내용 → `wiki/notes/` (`wiki_capture.py`)

## 소스 (`sources/`) — PDF→MD

- [포켓몬 파티·메가 목록 (Google Sheets)](sources/pokemon-party-mega-list.md) — 웹 ingest

- [한카리아스 샘플 8](sources/한카리아스-samples.md) — `/sample` 수동 수집

- [브리두라스 샘플 8](sources/브리두라스-samples.md) — `/sample` 수동 수집

- [아머까오 샘플 8](sources/아머까오-samples.md) — `/sample` 수동 수집

- [누리레느 샘플 8](sources/누리레느-samples.md) — `/sample` 수동 수집

- [하마돈 샘플 8](sources/하마돈-samples.md) — `/sample` 수동 수집

- [플라엣테 (영원의 꽃) 샘플 8](sources/플라엣테-영원의-꽃-samples.md) — `/sample` 수동 수집

- [마스카나 샘플 8](sources/마스카나-samples.md) — `/sample` 수동 수집

- [대쓰여너 샘플 8](sources/대쓰여너-samples.md) — `/sample` 수동 수집

- [킬가르도 샘플 8](sources/킬가르도-samples.md) — `/sample` 수동 수집

- [메가팬텀 샘플 8](sources/메가팬텀-samples.md) — `/sample` 수동 수집

- [메가아쿠스타 샘플 8](sources/메가아쿠스타-samples.md) — `/sample` 수동 수집

- [파라블레이즈 샘플 8](sources/파라블레이즈-samples.md) — `/sample` 수동 수집

- [따라큐 샘플 8](sources/따라큐-samples.md) — `/sample` 수동 수집

- [메가이어롭 샘플 8](sources/메가이어롭-samples.md) — `/sample` 수동 수집

- [대도각참 샘플 8](sources/대도각참-samples.md) — `/sample` 수동 수집

- [메가핫삼 샘플 8](sources/메가핫삼-samples.md) — `/sample` 수동 수집

- [불카모스 샘플 8](sources/불카모스-samples.md) — `/sample` 수동 수집

- [삼삼드래 샘플 8](sources/삼삼드래-samples.md) — `/sample` 수동 수집

- [메가리자몽Y 샘플 8](sources/메가리자몽Y-samples.md) — `/sample` 수동 수집 (이미지 10장, X 제외)

- [메가리자몽X 샘플 6](sources/메가리자몽X-samples.md) — `/sample` 수동 수집 (이미지 10장, Y 제외)

- [메가망나뇽 샘플 7](sources/메가망나뇽-samples.md) — `/sample` 수동 수집 (이미지 8장, 일반 망나뇽 제외)

- [메가캥카 샘플 8](sources/메가캥카-samples.md) — `/sample` 수동 수집

- [메가갸라도스 샘플 6](sources/메가갸라도스-samples.md) — `/sample` 수동 수집

- [갸라도스 샘플 2](sources/갸라도스-samples.md) — `/sample` 수동 수집 (비메가)

- [로토무 (워시) 샘플 6](sources/로토무-워시-samples.md) — `/sample` 수동 수집

- [로토무 (히트) 샘플 3](sources/로토무-히트-samples.md) — `/sample` 수동 수집 (이미지 4장, 비히트 1건 제외)

- [메가마폭시 샘플 8](sources/메가마폭시-samples.md) — `/sample` 수동 수집

- [메가루카리오 샘플 8](sources/메가루카리오-samples.md) — `/sample` 수동 수집

- [메가픽시 샘플 9](sources/메가픽시-samples.md) — `/sample` 수동 수집 (이미지 10장, 비메가 1건 제외)

- [메가이상해꽃 샘플 7](sources/메가이상해꽃-samples.md) — `/sample` 수동 수집 (이미지 10장, 비메가 3건 제외)

- [메가킬라플로르 샘플 8](sources/메가킬라플로르-samples.md) — `/sample` 수동 수집

- [킬라플로르 샘플 2](sources/킬라플로르-samples.md) — `/sample` 수동 수집 (비메가)

- [포푸니크 샘플 8](sources/포푸니크-samples.md) — `/sample` 수동 수집

- [메가거북왕 샘플 8](sources/메가거북왕-samples.md) — `/sample` 수동 수집

- [대검귀 (히스이) 샘플 6](sources/대검귀-히스이-samples.md) — `/sample` 수동 수집 (이미지 8장, 일반 대검귀 2건 제외)

- [찌리배리 샘플 8](sources/찌리배리-samples.md) — `/sample` 수동 수집

- [블래키 샘플 8](sources/블래키-samples.md) — `/sample` 수동 수집

- [더시마사리 샘플 8](sources/더시마사리-samples.md) — `/sample` 수동 수집

- [메가개굴닌자 샘플 3](sources/메가개굴닌자-samples.md) — `/sample` 수동 수집

- [개굴닌자 샘플 9](sources/개굴닌자-samples.md) — `/sample` 수동 수집 (비메가)

- [패리퍼 샘플 8](sources/패리퍼-samples.md) — `/sample` 수동 수집

- [메가무장조 샘플 7](sources/메가무장조-samples.md) — `/sample` 수동 수집

- [무장조 샘플 5](sources/무장조-samples.md) — `/sample` 수동 수집 (비메가)

- [메가스코빌런 샘플 4](sources/메가스코빌런-samples.md) — `/sample` 수동 수집 (이미지 6장, 분노가루 2건 제외)

- [메가메가니움 샘플 8](sources/메가메가니움-samples.md) — `/sample` 수동 수집

- [라우드본 샘플 8](sources/라우드본-samples.md) — `/sample` 수동 수집

- [클레스퍼트라 샘플 8](sources/클레스퍼트라-samples.md) — `/sample` 수동 수집

- [야도킹 (가라르) 샘플 7](sources/야도킹-가라르-samples.md) — `/sample` 수동 수집 (이미지 8장, 일반 야도킹 1건 제외)

- [깨비물거미 샘플 8](sources/깨비물거미-samples.md) — `/sample` 수동 수집

- [엠페르트 샘플 8](sources/엠페르트-samples.md) — `/sample` 수동 수집

- [잠만보 샘플 8](sources/잠만보-samples.md) — `/sample` 수동 수집

- [브리무음 샘플 8](sources/브리무음-samples.md) — `/sample` 수동 수집

- [드래펄트 샘플 8](sources/드래펄트-samples.md) — `/sample` 수동 수집

- [맘모꾸리 샘플 8](sources/맘모꾸리-samples.md) — `/sample` 수동 수집

- [님피아 샘플 8](sources/님피아-samples.md) — `/sample` 수동 수집

- [조로아크 (히스이) 샘플 7](sources/조로아크-히스이-samples.md) — `/sample` 수동 수집 (이미지 8장, 일반 조로아크 1건 제외)

- [돌핀맨 샘플 4](sources/돌핀맨-samples.md) — `/sample` 수동 수집

- [엘풍 샘플 8](sources/엘풍-samples.md) — `/sample` 수동 수집

- [샤미드 샘플 6](sources/샤미드-samples.md) — `/sample` 수동 수집

- [메가엘레이드 샘플 8](sources/메가엘레이드-samples.md) — `/sample` 수동 수집

- [엘레이드 샘플 4](sources/엘레이드-samples.md) — `/sample` 수동 수집 (비메가)

- [나인테일 (알로라) 샘플 8](sources/나인테일-알로라-samples.md) — `/sample` 수동 수집

- [사마자르 샘플 8](sources/사마자르-samples.md) — `/sample` 수동 수집

- [포트데스 샘플 3](sources/포트데스-samples.md) — `/sample` 수동 수집

- [메가가디안 샘플 7](sources/메가가디안-samples.md) — `/sample` 수동 수집 (이미지 8장, 일반 가디안 1건 제외)

- [밀로틱 샘플 8](sources/밀로틱-samples.md) — `/sample` 수동 수집

- [파르토 샘플 8](sources/파르토-samples.md) — `/sample` 수동 수집

- [마릴리 샘플 8](sources/마릴리-samples.md) — `/sample` 수동 수집

- [윈디 (히스이) 샘플 3](sources/윈디-히스이-samples.md) — `/sample` 수동 수집 (이미지 8장, 일반 윈디 5건 분리)

- [윈디 샘플 5](sources/윈디-samples.md) — `/sample` 수동 수집 (이미지 8장, 히스이 3건 분리)

- [메가우츠보트 샘플 4](sources/메가우츠보트-samples.md) — `/sample` 수동 수집

- [몰드류 샘플 7](sources/몰드류-samples.md) — `/sample` 수동 수집 (이미지 8장, 메가 1건 분리)

- [메가몰드류 샘플 1](sources/메가몰드류-samples.md) — `/sample` 수동 수집 (이미지 8장, 일반 7건 분리)

- [파밀리쥐 샘플 5](sources/파밀리쥐-samples.md) — `/sample` 수동 수집 (이미지 8장, 날따름 3건 제외)

- [깜까미 샘플 3](sources/깜까미-samples.md) — `/sample` 수동 수집 (이미지 8장, 메가 5건 분리)

- [메가깜까미 샘플 5](sources/메가깜까미-samples.md) — `/sample` 수동 수집 (이미지 8장, 일반 3건 분리)

- [웨이니발 샘플 1](sources/웨이니발-samples.md) — `/sample` 수동 수집

- [프테라 샘플 6](sources/프테라-samples.md) — `/sample` 수동 수집 (이미지 10장, 메가 4건 분리)

- [메가프테라 샘플 4](sources/메가프테라-samples.md) — `/sample` 수동 수집 (이미지 10장, 일반 6건 분리)

- [메가후딘 샘플 4](sources/메가후딘-samples.md) — `/sample` 수동 수집

- [노보청 샘플 8](sources/노보청-samples.md) — `/sample` 수동 수집

- [어흥염 샘플 8](sources/어흥염-samples.md) — `/sample` 수동 수집

- [마기라스 샘플 5](sources/마기라스-samples.md) — `/sample` 수동 수집 (이미지 12장, 메가 7건 분리)

- [메가마기라스 샘플 7](sources/메가마기라스-samples.md) — `/sample` 수동 수집 (이미지 12장, 일반 5건 분리)

- [미끄래곤 샘플 1](sources/미끄래곤-samples.md) — `/sample` 수동 수집 (이미지 8장, 히스이 7건 분리)

- [미끄래곤 (히스이) 샘플 7](sources/미끄래곤-히스이-samples.md) — `/sample` 수동 수집 (이미지 8장, 일반 1건 분리)

- [메가장크로다일 샘플 7](sources/메가장크로다일-samples.md) — `/sample` 수동 수집

- [블레이범 샘플 4](sources/블레이범-samples.md) — `/sample` 수동 수집 (이미지 8장, 히스이 4건 분리)

- [블레이범 (히스이) 샘플 4](sources/블레이범-히스이-samples.md) — `/sample` 수동 수집 (이미지 8장, 일반 4건 분리)

- [콜로솔트 샘플 3](sources/콜로솔트-samples.md) — `/sample` 수동 수집

- [악비아르 샘플 8](sources/악비아르-samples.md) — `/sample` 수동 수집

- [메가전룡 샘플 6](sources/메가전룡-samples.md) — `/sample` 수동 수집

- [초염몽 샘플 8](sources/초염몽-samples.md) — `/sample` 수동 수집

- [메가독침붕 샘플 8](sources/메가독침붕-samples.md) — `/sample` 수동 수집

- [메가보스로라 샘플 7](sources/메가보스로라-samples.md) — `/sample` 수동 수집 (이미지 8장, 일반 1건 제외)

- [비비용 샘플 8](sources/비비용-samples.md) — `/sample` 수동 수집

## 대화 메모 (`notes/`)

- [Quickstart — My First Wiki Page](notes/quickstart-my-first-page.md) — Package 30분 온보딩 예시

## 개념 (`concepts/`)

- [포켓몬 타입 상성표](concepts/pokemon-type-effectiveness.md) — 이미지 ingest (18타입 상성 + 타입별 고유 특성)
- [포켓몬 파티 구성 원칙](concepts/pokemon-party-building.md) — 앵커 기준 약점 연쇄 보완 + 공격 타입 커버

## 파티 (`parties/`) — `/party-main`

- [메가리자몽Y 파티](parties/메가리자몽Y-party-main.md) — 앵커 메가리자몽Y (6종 + 샘플)
- [메가리자몽X 파티](parties/메가리자몽X-party-main.md) — 앵커 메가리자몽X (6종 + 샘플, 3회차 9.0점 통과)
- [대쓰여너 파티](parties/대쓰여너-party-main.md) — 앵커 대쓰여너 (6종 + 샘플)
- **Party Viewer** — `npm run wiki:dev` · `tools/llm-wiki-*` · `web/wiki-viewer`

## 구현 스펙 (`docs/`)

- [포켓몬 파티 편성 통합 스펙](../docs/pokemon-party-composition.md) — `/party-main` 재구현용 마스터 문서 (v1.1 · 구상·평가 서브에이전트 루프)
- [Party Viewer Web + MCP 구현 스펙](../docs/party-viewer-implementation.md) — 3열 웹앱·API·MCP·멀티 프로바이더·키 붙여넣기 UI 이식용
- [Party Viewer Gemini API 키 오류 패치](../docs/party-viewer-fix-gemini-api-key.md) — `llm.ts` 수정 (Gemini에 넘길 fix MD)

## 질의 (`queries/`)

- `wiki_query.py` 실행 시 자동 생성

## 유지보수 (`maintenance/lint/`)

- `wiki_lint.py` 실행 시 Lint 보고서 자동 생성
