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
files = [f for f in sorted(os.listdir(docs_dir)) if f.endswith('.md')]
for f in files:
    with open(os.path.join(docs_dir, f)) as fh:
        c = fh.read()
    assert len(c) > 200, f'File {f} is too short'
    assert '# ' in c, f'File {f} missing main header'
assert len(files) == 10, f'Expected 10 docs files, found {len(files)}'
print(f'    All {len(files)} documentation files valid.')
"

echo "--> 2. Validating JSON Metadata..."
python3 -c "
import json
for meta in ['wallpaper/metadata.json', 'lockscreen/metadata.json', 'plasmoid/metadata.json']:
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
CARGO_TARGET_DIR="${CARGO_TARGET_DIR:-/home/rchandia/.gemini/antigravity-cli/brain/95bcad37-d3ce-494a-b37c-fe8e35613e09/scratch/target}" cargo test --workspace --locked --offline

echo "--> 5. Running QML Lint on all Components..."
if command -v qmllint &>/dev/null; then
    qmllint engine/LiquidNeonAbyss.qml
    qmllint engine/LivingPetriDish.qml
    qmllint engine/TranquilKoiSanctuary.qml
    qmllint engine/CosmicGravitationalSandbox.qml
    qmllint engine/SynthwaveMegacity.qml
    qmllint engine/RealtimeEphemerisBiome.qml
    qmllint engine/KineticSpiderwebHarp.qml
    qmllint engine/AnalogTelemetryConsole.qml
    qmllint tools/harness/harness.qml
    qmllint wallpaper/contents/ui/main.qml
    qmllint wallpaper/contents/ui/config.qml
    qmllint lockscreen/contents/lockscreen/LockScreenUi.qml
    qmllint plasmoid/contents/ui/main.qml
    qmllint plasmoid/contents/ui/FullRepresentation.qml
    qmllint plasmoid/contents/ui/CompactRepresentation.qml
    qmllint plasmoid/contents/ui/ConfigGeneral.qml
    echo "    All QML files passed qmllint without errors."
else
    echo "    qmllint not available, skipping QML lint."
fi

echo "--> 6. Validating Debian Package Build..."
VERSION="$(dpkg-parsechangelog -S Version -l debian/changelog 2>/dev/null || echo '0.3.0-1')"
UPSTREAM_VERSION="${VERSION%%-*}"
ARCH="$(dpkg --print-architecture 2>/dev/null || uname -m)"
case "${ARCH}" in
    x86_64) ARCH="amd64" ;;
    aarch64) ARCH="arm64" ;;
esac

if [ "${BUILD_PACKAGES:-0}" = "1" ] && command -v dpkg-deb &>/dev/null; then
    ./tools/package-deb.sh
fi

if [ -f "dist/regel-screensaver_${VERSION}_${ARCH}.deb" ]; then
    test -f "dist/regel-screensaver_${VERSION}_${ARCH}.deb"
    if command -v lintian &>/dev/null; then
        lintian "dist/regel-screensaver_${VERSION}_${ARCH}.deb"
    fi
    echo "    Debian package dist/regel-screensaver_${VERSION}_${ARCH}.deb verified successfully."
else
    echo "    Debian package not found or skipped."
fi

echo "--> 7. Validating Debian Source Package & Lintian Conformance..."
if [ "${BUILD_PACKAGES:-0}" = "1" ] && command -v dpkg-source &>/dev/null && command -v lintian &>/dev/null; then
    ./tools/package-src.sh
fi

if [ -f "dist/source/regel-screensaver_${VERSION}.dsc" ]; then
    test -f "dist/source/regel-screensaver_${UPSTREAM_VERSION}.orig.tar.gz"
    test -f "dist/source/regel-screensaver_${VERSION}.dsc"
    if command -v lintian &>/dev/null; then
        lintian "dist/source/regel-screensaver_${VERSION}.dsc"
    fi
    echo "    Debian source package verified with Lintian successfully."
else
    echo "    Debian source package not found or skipped."
fi

echo "================================================="
echo "  ALL TESTS PASSED SUCCESSFULLY!                 "
echo "================================================="
