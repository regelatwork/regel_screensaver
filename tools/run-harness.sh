#!/usr/bin/env bash
# regel_screensaver - Developer Test Harness Launcher
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

echo "==> Launching Regel Interactive Developer Harness..."
echo "    Workspace: ${WORKSPACE_ROOT}"

# Automatically ensure Qt 6 RHI shaders are compiled
"${SCRIPT_DIR}/build-shaders.sh"

# 1. Prefer python3 runner (uses installed PyQt6, bypasses Debian qtchooser conflicts)
if command -v python3 &>/dev/null && python3 -c "import PyQt6.QtQuick" &>/dev/null; then
    exec python3 "${SCRIPT_DIR}/harness/runner.py" "$@"
# 2. Native Qt 6 binary options
elif command -v qml-qt6 &>/dev/null; then
    exec qml-qt6 "${SCRIPT_DIR}/harness/harness.qml" "$@"
elif [ -x "/usr/lib/qt6/bin/qml" ]; then
    exec /usr/lib/qt6/bin/qml "${SCRIPT_DIR}/harness/harness.qml" "$@"
elif command -v qml6 &>/dev/null; then
    exec qml6 "${SCRIPT_DIR}/harness/harness.qml" "$@"
elif command -v qml &>/dev/null; then
    export QT_SELECT=qt6
    exec qml "${SCRIPT_DIR}/harness/harness.qml" "$@"
else
    echo "Error: No suitable Qt 6 / PyQt6 runtime found to run the QML harness."
    echo "Please install python3-pyqt6 or qml-qt6: sudo apt install python3-pyqt6 qml-qt6"
    exit 1
fi
