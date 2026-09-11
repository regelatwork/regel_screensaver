#!/usr/bin/env bash
# regel_screensaver - Developer Test Harness Launcher
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

echo "==> Launching Regel Interactive Developer Harness..."
echo "    Workspace: ${WORKSPACE_ROOT}"

# Automatically ensure Qt 6 RHI shaders are compiled
"${SCRIPT_DIR}/build-shaders.sh"

# 1. Native Debian Qt 6 binary (from package qml-qt6)
if command -v qml-qt6 &>/dev/null; then
    exec qml-qt6 "${SCRIPT_DIR}/harness/harness.qml" "$@"
elif [ -x "/usr/lib/qt6/bin/qml" ]; then
    exec /usr/lib/qt6/bin/qml "${SCRIPT_DIR}/harness/harness.qml" "$@"
# 2. Python PyQt6 Runner (built-in, bypasses qtchooser wrapper issues)
elif [ -f "${SCRIPT_DIR}/harness/runner.py" ]; then
    exec python3 "${SCRIPT_DIR}/harness/runner.py" "$@"
else
    echo "Error: No Qt 6 runtime found."
    echo "Please install qml-qt6 via: sudo apt install qml-qt6"
    exit 1
fi
