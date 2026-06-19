#!/usr/bin/env bash
set -euo pipefail

PORT="${1:-8766}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

URL="http://127.0.0.1:${PORT}/docs/submissions/PULSO-DEMO.html?step=1&autoplay=1"

echo "[pulso-demo] serving from: $ROOT"
echo "[pulso-demo] open: $URL"
echo "[pulso-demo] stop with Ctrl+C"

exec python3 -m http.server "$PORT"
