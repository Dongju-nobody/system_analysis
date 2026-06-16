#!/usr/bin/env bash
# Fail-open lint after wiki MD edit
input=$(cat)
path=$(echo "$input" | python -c "import sys,json; d=json.load(sys.stdin); print(d.get('file_path',''))" 2>/dev/null || true)
if [[ "$path" =~ /wiki/.*\.md$ ]]; then
  cd "$(dirname "$0")/../../scripts" && python wiki_lint.py --no-save 2>/dev/null || true
fi
exit 0
