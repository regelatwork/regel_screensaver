#!/usr/bin/env bash
# regel_screensaver - Developer Test Harness Launcher
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

echo "==> Launching Regel Interactive Developer Harness..."
echo "    Workspace: ${WORKSPACE_ROOT}"

if command -v qml6 &>/dev/null; then
    exec qml6 "${SCRIPT_DIR}/harness/harness.qml"
elif command -v qml &>/dev/null; then
    exec qml "${SCRIPT_DIR}/harness/harness.qml"
elif command -v qmlscene &>/dev/null; then
    exec qmlscene "${SCRIPT_DIR}/harness/harness.qml"
else
    echo "Error: Neither qml6, qml, nor qmlscene was found."
    exit 1
fi
