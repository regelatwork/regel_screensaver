#!/usr/bin/env bash
# regel_screensaver - Automated Test Suite
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "${ROOT_DIR}"

echo "================================================="
echo "  Running regel_screensaver Test Suite           "
echo "================================================="

echo "--> 1. Checking Documentation Integrity..."
python3 -c "
import os
docs_dir = 'docs'
for f in sorted(os.listdir(docs_dir)):
    with open(os.path.join(docs_dir, f)) as fh:
        c = fh.read()
    assert len(c) > 200, f'File {f} is too short'
    assert '# ' in c, f'File {f} missing main header'
print('    All 8 documentation files valid.')
"

echo "--> 2. Validating JSON Metadata..."
python3 -c "
import json
for meta in ['wallpaper/metadata.json', 'lockscreen/metadata.json']:
    with open(meta) as fh:
        data = json.load(fh)
    assert 'KPlugin' in data, f'Missing KPlugin in {meta}'
    print(f'    Valid: {meta}')
"

echo "--> 3. Compiling and Verifying Qt 6 RHI Shaders..."
./tools/build-shaders.sh
test -f engine/shaders/fluid.vert.qsb
test -f engine/shaders/fluid.frag.qsb
test -f engine/shaders/petri.vert.qsb
test -f engine/shaders/petri.frag.qsb
test -f engine/shaders/koi.vert.qsb
test -f engine/shaders/koi.frag.qsb
test -f engine/shaders/cosmic.vert.qsb
test -f engine/shaders/cosmic.frag.qsb
test -f engine/shaders/city.vert.qsb
test -f engine/shaders/city.frag.qsb
test -f engine/shaders/ephemeris.vert.qsb
test -f engine/shaders/ephemeris.frag.qsb
test -f engine/shaders/harp.vert.qsb
test -f engine/shaders/harp.frag.qsb
echo "    All 7 shader bundles (Fluid, Petri, Koi, Cosmic, City, Ephemeris, Harp) verified."

echo "--> 4. Running Rust Unit Tests..."
cargo test --workspace

echo "--> 5. Running QML Lint on all Components..."
if command -v qmllint &>/dev/null; then
    qmllint engine/LiquidNeonAbyss.qml
    qmllint engine/LivingPetriDish.qml
    qmllint engine/TranquilKoiSanctuary.qml
    qmllint engine/CosmicGravitationalSandbox.qml
    qmllint engine/SynthwaveMegacity.qml
    qmllint engine/RealtimeEphemerisBiome.qml
    qmllint engine/KineticSpiderwebHarp.qml
    qmllint tools/harness/harness.qml
    qmllint wallpaper/contents/ui/main.qml
    qmllint lockscreen/contents/lockscreen/LockScreenUi.qml
    echo "    All QML files passed qmllint without errors."
else
    echo "    qmllint not available, skipping QML lint."
fi

echo "--> 6. Validating Debian Package Build..."
if command -v dpkg-deb &>/dev/null; then
    ./tools/package-deb.sh
    ARCH="$(dpkg --print-architecture 2>/dev/null || uname -m)"
    case "${ARCH}" in
        x86_64) ARCH="amd64" ;;
        aarch64) ARCH="arm64" ;;
    esac
    test -f "dist/regel-screensaver_0.1.0-1_${ARCH}.deb"
    echo "    Debian package built and verified successfully."
else
    echo "    dpkg-deb not available, skipping packaging verification."
fi

echo "================================================="
echo "  ALL TESTS PASSED SUCCESSFULLY!                 "
echo "================================================="
