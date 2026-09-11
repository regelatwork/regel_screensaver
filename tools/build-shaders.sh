#!/usr/bin/env bash
# regel_screensaver - Qt Shader Baker Build Script
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
SHADER_DIR="${ROOT_DIR}/engine/shaders"

QSB_BIN="/usr/lib/qt6/bin/qsb"
if ! command -v "${QSB_BIN}" &>/dev/null; then
    QSB_BIN="qsb"
fi

echo "==> Compiling Qt 6 RHI Shaders with ${QSB_BIN}..."

for vert in "${SHADER_DIR}"/*.vert; do
    if [ -f "${vert}" ]; then
        out="${vert}.qsb"
        echo "    [VERT] $(basename "${vert}") -> $(basename "${out}")"
        "${QSB_BIN}" --glsl "100 es,120,330" -o "${out}" "${vert}"
    fi
done

for frag in "${SHADER_DIR}"/*.frag; do
    if [ -f "${frag}" ]; then
        out="${frag}.qsb"
        echo "    [FRAG] $(basename "${frag}") -> $(basename "${out}")"
        "${QSB_BIN}" --glsl "100 es,120,330" -o "${out}" "${frag}"
    fi
done

echo "==> Shader compilation complete!"
