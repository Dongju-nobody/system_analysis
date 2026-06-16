# schema/

위키 Markdown frontmatter 검증 스키마.

| 파일 | 적용 경로 |
|------|-----------|
| `note.schema.json` | `wiki/notes/*.md` |
| `source.schema.json` | `wiki/sources/*.md` |
| `party-main.schema.json` | `wiki/parties/*-party-main.md` |

검증:

```bash
python scripts/wiki_lint.py --schema
```

`updated` 날짜는 YAML에서 `"YYYY-MM-DD"` 따옴표 권장 (미따옴표 시 `2026-06-14` → 숫자 2006 파싱 버그).
