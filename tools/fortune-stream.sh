#!/usr/bin/env bash
# regel_screensaver - Background Fortune & Text Generator Daemon
# Periodically queries fortune or a custom command and writes formatted text for the Embossed Glyph Matrix.
set -euo pipefail

OUT_FILE="/tmp/regel_fortune.txt"
INTERVAL="${1:-24}"
CUSTOM_CMD="${2:-}"

echo "==> Starting Regel Text Inscription Stream Daemon (interval: ${INTERVAL}s)..."

while true; do
    if [ -n "${CUSTOM_CMD}" ]; then
        bash -c "${CUSTOM_CMD}" > "${OUT_FILE}.tmp" 2>/dev/null && mv -f "${OUT_FILE}.tmp" "${OUT_FILE}"
    elif [ -x "/usr/games/fortune" ]; then
        /usr/games/fortune -s > "${OUT_FILE}.tmp" 2>/dev/null && mv -f "${OUT_FILE}.tmp" "${OUT_FILE}"
    elif command -v fortune &>/dev/null; then
        fortune -s > "${OUT_FILE}.tmp" 2>/dev/null && mv -f "${OUT_FILE}.tmp" "${OUT_FILE}"
    fi
    sleep "${INTERVAL}"
done
