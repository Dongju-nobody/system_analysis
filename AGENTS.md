# LLM Wiki — 에이전트 스키마

## 활성화 조건 (Cursor)

**사용자 메시지가 `/wiki`로 시작할 때만** LLM Wiki를 사용한다.

- 예: `/wiki 바이브 코딩이 뭐야?` · `/wiki raw에 넣은 PDF ingest 해줘`
- **`@llm-wiki`**, **`llm-wiki` 문구만**, **`@llm-wiki/`** → 위키 모드 **아님** (일반 대화로 처리)
- `/wiki` 뒤 공백을 제거한 문자열이 실제 질문·지시

**`/sample`로 시작**하면 포켓몬 샘플 이미지 수집 모드 (아래 §Sample Ingest 참고).

---

## Sample Ingest (`/sample`)

**메시지가 `/sample`로 시작**하고 포켓몬 이름 + 8샘플 이미지가 오면:

1. 이미지에서 **8개 샘플 전부** 읽기 (누락 없이 저장)
2. `wiki/sources/<포켓몬명>-samples.md` 생성·갱신
3. 동일 세팅(도구·특성·성격·배율)끼리 빌드 정리
4. 기술만 다른 경우 → **후보 기술**로 분리, **관찰된 조합** 기록

### 샘플 카드 필드 (8건 모두 저장)

| 필드 | 내용 |
|------|------|
| 포켓몬 이름 | 카드에 표시된 이름 |
| 도구 / 특성 / 성격 | 지닌 도구, 특성, 성격 |
| 능력치 분배 | HP·공격·방어·특공·특방·스피 |
| 기술 | 기술1 / 기술2 / 기술3 / 기술4 |

템플릿: `wiki/sources/_sample-template.md`  
규칙: `.cursor/rules/pokemon-sample.mdc`

### Cursor 체크리스트 (`/sample`)

- `/sample` + 이미지 → 8건 원본 저장 + 빌드 정리 + 후보 기술
- `wiki/index.md` 링크 갱신, `wiki/log.md`에 `sample |` 한 줄 append
- `/sample`가 아니면 샘플 파싱·저장 **하지 않음**

---

## 지식의 두 층 (현재 운영)

| 층 | 경로 | 내용 |
|----|------|------|
| **교재·PDF 정리** | `wiki/sources/*.md` | PDF를 ingest한 **통합 MD**만 질의의 1차 근거로 쓴다. raw PDF는 읽지 않아도 된다. |
| **대화에서 쌓인 지식** | `wiki/notes/*.md` | **`/wiki`로 시작한 대화**에서 남기기로 한 결정·요약. 이후 `/wiki` 질의·검색에 포함. |

`queries/` = 질의 이력, `concepts/` = 운영 문서. **답변 근거 검색 기본값은 `sources` + `notes`.**

---

## User Query

```bash
cd llm-wiki/scripts
python wiki_query.py "질문"
python wiki_query.py "질문" --scope sources    # PDF MD만
python wiki_query.py "질문" --scope knowledge  # sources + notes (기본)
```

1. `wiki_query.py`로 `sources/`·`notes/` 검색
2. 근거 MD를 읽고 답변
3. `queries/`에 질의 기록, **답변 요약** 채우기

---

## 대화 캡처 (`/wiki`일 때만)

**메시지가 `/wiki`로 시작**하고, 새로 남길 **정의·결정·운영 방침**이 있으면 답변 후 **`wiki/notes/`에 MD로 저장**한다.

```bash
python wiki_capture.py --title "제목" --text "요약 본문" --context "어떤 대화에서"
python wiki_capture.py --title "..." --file body.md --source sources/foo.md
```

- 템플릿: `wiki/notes/_template.md`
- `wiki/log.md`에 `note |` 한 줄 append

### Cursor 에이전트 체크리스트

- 메시지가 **`/wiki`로 시작** → `wiki_query.py` 또는 `sources/`·`notes/` 읽고 답변
- **`/wiki`가 아니면** 위키 검색·저장·수정 **하지 않음**
- PDF 원본 대신 **`wiki/sources/` MD**만 근거로 사용 (일단은)
- `/wiki` 대화에서 확정한 내용 → `wiki_capture.py` 또는 `wiki/notes/`에 작성
- 단일 위키: 모든 지식은 `llm-wiki/wiki/` 아래만

---

## Raw → Wiki 파이프라인 (기본)

**`llm-wiki/raw/`에 PDF를 넣으면** 아래가 자동으로 돌아가도록 `ingest_raw.py`를 쓴다.

```bash
cd llm-wiki/scripts
python ingest_raw.py          # raw/ 안 새 PDF·변경된 PDF만 ingest
python ingest_raw.py --force  # raw/ PDF 전부 재처리
ingest-raw.bat
```

**백그라운드 감시 (선택):**

```bash
python ingest_raw.py --watch --interval 30
# 또는 ingest-raw-watch.bat
```

파이프라인이 하는 일:

1. `raw/*.pdf` 스캔 (이미 wiki에 있고 PDF가 안 바뀌었으면 **skip**)
2. 슬라이드 PNG → `raw/assets/<slug>/pages/`
3. 통합 MD → `wiki/sources/<name>.md`
4. `wiki/index.md`, `wiki/log.md` 갱신

공통 로직: `ingest_core.py` · 외부 폴더 복사: `ingest_pdfs.py` / `sync-from-wii.bat`

## OneDrive `wii` 동기화 (외부 → raw → wiki)

원본 PDF 폴더: `C:\Users\dongj\OneDrive\Desktop\wii`

```bash
sync-from-wii.bat
# = ingest_pdfs.py "C:\Users\dongj\OneDrive\Desktop\wii"
```

`wii` → `raw/` 복사 후 위와 동일하게 wiki에 반영된다.

## LLM Maintenance (Lint)

```bash
cd llm-wiki/scripts
python wiki_lint.py
python wiki_lint.py --json --no-save   # 보고서 저장 없이 JSON만
```

- **검사:** `index.md` 누락, 깨진 링크·이미지, 고아 페이지, 빈 질의 답변, 짧은 본문, frontmatter 등
- **저장:** `wiki/maintenance/lint/YYYY-MM-DD_HHMM_lint.md`
- **로그:** `wiki/log.md`에 `lint |` 한 줄
- **종료 코드:** 문제 0건 → `0`, 1건 이상 → `1` (CI·스크립트 연동용)

### Cursor에서

- ingest/sync 후 또는 주기적으로 `wiki_lint.py` 실행
- 발견 사항은 에이전트가 위키 MD를 직접 수정한 뒤 Lint 재실행
