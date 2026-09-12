#!/usr/bin/env bash
# =============================================================================
# regel_screensaver - Headless Capture & Benchmarking Launcher
# Captures authentic, pixel-perfect frames, animations, or videos directly
# from the Qt 6 RHI GPU engine.
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

# Ensure shaders are compiled
"${SCRIPT_DIR}/build-shaders.sh"

exec /usr/bin/python3 "${SCRIPT_DIR}/capture.py" "$@"
