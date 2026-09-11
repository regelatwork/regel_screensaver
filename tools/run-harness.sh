#!/usr/bin/env bash
# regel_screensaver - Developer Test Harness Launcher
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

echo "==> Launching Regel Interactive Developer Harness..."
echo "    Workspace: ${WORKSPACE_ROOT}"

# 1. Ensure Qt 6 RHI shaders are compiled
"${SCRIPT_DIR}/build-shaders.sh"

# 2. Ensure Rust engine and daemon workspace is compiled
echo "==> Building Rust workspace (regel-engine & regel-daemon)..."
cargo build --workspace

# 3. Launch via Python runner (providing C ABI FFI engineCore and PipeWire audio stream)
if [ -x "/usr/bin/python3" ] && [ -f "${SCRIPT_DIR}/harness/runner.py" ]; then
    exec /usr/bin/python3 "${SCRIPT_DIR}/harness/runner.py" "$@"
elif command -v python3 &>/dev/null && [ -f "${SCRIPT_DIR}/harness/runner.py" ]; then
    exec python3 "${SCRIPT_DIR}/harness/runner.py" "$@"
elif command -v qml-qt6 &>/dev/null; then
    exec qml-qt6 "${SCRIPT_DIR}/harness/harness.qml" "$@"
elif [ -x "/usr/lib/qt6/bin/qml" ]; then
    exec /usr/lib/qt6/bin/qml "${SCRIPT_DIR}/harness/harness.qml" "$@"
else
    echo "Error: No Qt 6 runtime found."
    echo "Please install python3-pyqt6 via: sudo apt install python3-pyqt6"
    exit 1
fi
