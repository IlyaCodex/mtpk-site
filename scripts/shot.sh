#!/bin/bash
# Скриншот страницы для проверки верстки.
# Использование:
#   scripts/shot.sh design/prototypes/foo.html /tmp/shot.png   # локальный файл
#   scripts/shot.sh https://new.uralinduktor.ru/ /tmp/prod.png # живой URL
# Первый запуск: npx playwright install chromium
set -e
SRC="$1"; OUT="${2:-/tmp/shot.png}"; W="${3:-1440}"
if [[ "$SRC" == http* ]]; then
  URL="$SRC"
else
  # сервер от корня проекта, чтобы абсолютные пути /brand/ /picture/ работали
  python3 -m http.server 4399 --directory "$(cd "$(dirname "$0")/.." && pwd)" >/dev/null 2>&1 &
  SRV=$!; sleep 1
  URL="http://localhost:4399/$SRC"
fi
npx --yes playwright screenshot --viewport-size="$W,900" --full-page "$URL" "$OUT"
[[ -n "$SRV" ]] && kill $SRV 2>/dev/null
echo "OK: $OUT"
