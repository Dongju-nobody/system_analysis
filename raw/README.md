# raw/ — 원본 자료 투입

| 형식 | 처리 |
|------|------|
| `*.pdf` | `python scripts/ingest_raw.py` → `wiki/sources/*.md` |
| `*.csv` | 수동 ingest 또는 스크립트 |
| `*.txt` | Quickstart 샘플 · note 캡처 전 참고 |

```bash
cd scripts
python ingest_raw.py
python ingest_raw.py --force
```

자산: `raw/assets/<slug>/` (PDF 슬라이드 PNG)

Quickstart 예시: [quickstart-sample.txt](quickstart-sample.txt)
