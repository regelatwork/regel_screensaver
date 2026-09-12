#!/usr/bin/env bash
# =============================================================================
# regel_screensaver - Debian Package Builder (.deb)
# Builds release binaries, compiles Qt 6 RHI shaders, stages FHS directories,
# and generates a signed-ready .deb package for KDE Plasma 6 on modern Linux.
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

# Color formatting
BOLD='\033[1m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BOLD}${CYAN}======================================================${NC}"
echo -e "${BOLD}${CYAN}   regel_screensaver - Debian (.deb) Package Builder  ${NC}"
echo -e "${BOLD}${CYAN}======================================================${NC}"
echo "  Workspace: ${WORKSPACE_ROOT}"

# 1. Dependency checks
echo -e "\n${BOLD}--> 1. Checking build prerequisites...${NC}"
command -v dpkg-deb >/dev/null 2>&1 || { echo -e "${RED}Error: dpkg-deb not found. Install dpkg-dev.${NC}" >&2; exit 1; }
command -v cargo >/dev/null 2>&1 || { echo -e "${RED}Error: cargo not found.${NC}" >&2; exit 1; }
command -v rustc >/dev/null 2>&1 || { echo -e "${RED}Error: rustc not found.${NC}" >&2; exit 1; }

QSB_BIN=""
for candidate in qsb /usr/lib/qt6/bin/qsb /usr/bin/qsb; do
    if command -v "${candidate}" &>/dev/null || [ -x "${candidate}" ]; then
        QSB_BIN="${candidate}"
        break
    fi
done

if [ -z "${QSB_BIN}" ]; then
    echo -e "${RED}Error: Qt 6 Shader Baker (qsb) not found. Install qt6-shadertools.${NC}" >&2
    exit 1
fi
echo -e "${GREEN}    Prerequisites verified (qsb: ${QSB_BIN})${NC}"

# 2. Package metadata & architecture resolution
VERSION=$(grep -m1 '^version' "${WORKSPACE_ROOT}/Cargo.toml" | cut -d '"' -f 2 || echo "0.1.0")
DEB_REVISION="${DEB_REVISION:-1}"

RAW_ARCH="$(dpkg --print-architecture 2>/dev/null || uname -m)"
case "${RAW_ARCH}" in
    x86_64|amd64) ARCH="amd64" ;;
    aarch64|arm64) ARCH="arm64" ;;
    *) ARCH="${RAW_ARCH}" ;;
esac

MULTIARCH="$(dpkg-architecture -qDEB_HOST_MULTIARCH 2>/dev/null || echo "${ARCH}-linux-gnu")"

PKG_NAME="regel-screensaver"
DEB_FILE="${PKG_NAME}_${VERSION}-${DEB_REVISION}_${ARCH}.deb"
DIST_DIR="${WORKSPACE_ROOT}/dist"
STAGE_DIR="${DIST_DIR}/staging_${PKG_NAME}_${VERSION}-${DEB_REVISION}_${ARCH}"

echo -e "    Package:      ${BOLD}${PKG_NAME}${NC}"
echo -e "    Version:      ${BOLD}${VERSION}-${DEB_REVISION}${NC}"
echo -e "    Architecture: ${BOLD}${ARCH}${NC} (${MULTIARCH})"
echo -e "    Output:       ${BOLD}${DIST_DIR}/${DEB_FILE}${NC}"

# 3. Build Qt 6 RHI shaders
echo -e "\n${BOLD}--> 2. Compiling Qt 6 RHI shaders...${NC}"
"${WORKSPACE_ROOT}/tools/build-shaders.sh"

# 4. Build Rust workspace in release mode
echo -e "\n${BOLD}--> 3. Compiling Rust release binaries (regel-daemon & regel-engine)...${NC}"
cargo build --release --workspace

LIB_ENGINE="${WORKSPACE_ROOT}/target/release/libregel_engine.so"
BIN_DAEMON="${WORKSPACE_ROOT}/target/release/regel-daemon"

if [ ! -f "${LIB_ENGINE}" ]; then
    echo -e "${RED}Error: ${LIB_ENGINE} was not produced by cargo build.${NC}" >&2
    exit 1
fi
if [ ! -f "${BIN_DAEMON}" ]; then
    echo -e "${RED}Error: ${BIN_DAEMON} was not produced by cargo build.${NC}" >&2
    exit 1
fi

# 5. Clean & prepare staging directory hierarchy
echo -e "\n${BOLD}--> 4. Staging Debian directory structure...${NC}"
rm -rf "${STAGE_DIR}"
mkdir -p \
    "${STAGE_DIR}/DEBIAN" \
    "${STAGE_DIR}/usr/bin" \
    "${STAGE_DIR}/usr/lib/${MULTIARCH}" \
    "${STAGE_DIR}/usr/lib/${MULTIARCH}/qt6/qml/org/regel/engine/shaders" \
    "${STAGE_DIR}/usr/lib/systemd/user" \
    "${STAGE_DIR}/usr/share/applications" \
    "${STAGE_DIR}/usr/share/icons/hicolor/scalable/apps" \
    "${STAGE_DIR}/usr/share/plasma/wallpapers/org.regel.wallpaper/contents/ui" \
    "${STAGE_DIR}/usr/share/plasma/wallpapers/org.regel.wallpaper/contents/engine/shaders" \
    "${STAGE_DIR}/usr/share/plasma/look-and-feel/org.regel.lockscreen/contents/lockscreen" \
    "${STAGE_DIR}/usr/share/plasma/look-and-feel/org.regel.lockscreen/contents/engine" \
    "${STAGE_DIR}/usr/share/regel/harness" \
    "${STAGE_DIR}/usr/share/doc/${PKG_NAME}"

# 6. Install binaries and shared libraries
echo "    Copying binaries and libraries..."
install -m 755 "${BIN_DAEMON}" "${STAGE_DIR}/usr/bin/regel-daemon"
install -m 644 "${LIB_ENGINE}" "${STAGE_DIR}/usr/lib/${MULTIARCH}/libregel_engine.so"

# 7. Install regel-harness launcher script
cat << 'INNER_EOF' > "${STAGE_DIR}/usr/bin/regel-harness"
#!/usr/bin/env bash
# =============================================================================
# regel-harness - Interactive Developer Harness & Screensaver Previewer
# =============================================================================
set -euo pipefail

HARNESS_DIR="/usr/share/regel/harness"

if [ -f "${HARNESS_DIR}/runner.py" ]; then
    exec /usr/bin/python3 "${HARNESS_DIR}/runner.py" "$@"
elif command -v qml6 &>/dev/null; then
    exec qml6 "${HARNESS_DIR}/harness.qml" "$@"
elif [ -x "/usr/lib/qt6/bin/qml" ]; then
    exec /usr/lib/qt6/bin/qml "${HARNESS_DIR}/harness.qml" "$@"
else
    echo "Error: Qt 6 QML runtime or Python 3 PyQt6 not found." >&2
    echo "Please install python3-pyqt6: sudo apt install python3-pyqt6" >&2
    exit 1
fi
INNER_EOF
chmod 755 "${STAGE_DIR}/usr/bin/regel-harness"

# 8. Install engine components into Qt 6 QML module directory
echo "    Installing Qt 6 QML engine module (org.regel.engine)..."
cp "${WORKSPACE_ROOT}/engine/"*.qml "${STAGE_DIR}/usr/lib/${MULTIARCH}/qt6/qml/org/regel/engine/"
cp "${WORKSPACE_ROOT}/engine/qmldir" "${STAGE_DIR}/usr/lib/${MULTIARCH}/qt6/qml/org/regel/engine/"
cp "${WORKSPACE_ROOT}/engine/shaders/"*.qsb "${STAGE_DIR}/usr/lib/${MULTIARCH}/qt6/qml/org/regel/engine/shaders/"

# 9. Install Plasma 6 Wallpaper Containment Plugin
echo "    Installing Plasma 6 wallpaper containment plugin (org.regel.wallpaper)..."
install -m 644 "${WORKSPACE_ROOT}/wallpaper/metadata.json" "${STAGE_DIR}/usr/share/plasma/wallpapers/org.regel.wallpaper/metadata.json"
install -m 644 "${WORKSPACE_ROOT}/wallpaper/contents/ui/main.qml" "${STAGE_DIR}/usr/share/plasma/wallpapers/org.regel.wallpaper/contents/ui/main.qml"
cp "${WORKSPACE_ROOT}/engine/"*.qml "${STAGE_DIR}/usr/share/plasma/wallpapers/org.regel.wallpaper/contents/engine/"
cp "${WORKSPACE_ROOT}/engine/qmldir" "${STAGE_DIR}/usr/share/plasma/wallpapers/org.regel.wallpaper/contents/engine/"
cp "${WORKSPACE_ROOT}/engine/shaders/"*.qsb "${STAGE_DIR}/usr/share/plasma/wallpapers/org.regel.wallpaper/contents/engine/shaders/"

# 10. Install Plasma 6 Look-and-Feel Lockscreen Theme
echo "    Installing Plasma 6 lockscreen theme (org.regel.lockscreen)..."
install -m 644 "${WORKSPACE_ROOT}/lockscreen/metadata.json" "${STAGE_DIR}/usr/share/plasma/look-and-feel/org.regel.lockscreen/metadata.json"
install -m 644 "${WORKSPACE_ROOT}/lockscreen/contents/lockscreen/LockScreenUi.qml" "${STAGE_DIR}/usr/share/plasma/look-and-feel/org.regel.lockscreen/contents/lockscreen/LockScreenUi.qml"
# Link engine directly to avoid duplicating shader blobs
rm -rf "${STAGE_DIR}/usr/share/plasma/look-and-feel/org.regel.lockscreen/contents/engine"
ln -s "../../../wallpapers/org.regel.wallpaper/contents/engine" "${STAGE_DIR}/usr/share/plasma/look-and-feel/org.regel.lockscreen/contents/engine"

# 11. Install Developer Harness & Previewer
echo "    Installing interactive preview harness..."
install -m 755 "${WORKSPACE_ROOT}/tools/harness/runner.py" "${STAGE_DIR}/usr/share/regel/harness/runner.py"
install -m 644 "${WORKSPACE_ROOT}/tools/harness/harness.qml" "${STAGE_DIR}/usr/share/regel/harness/harness.qml"
ln -s "../../plasma/wallpapers/org.regel.wallpaper/contents/engine" "${STAGE_DIR}/usr/share/regel/harness/engine"

# 12. Install Desktop Entry, Icon, and Systemd Service
echo "    Installing systemd service, desktop launcher, and icon..."
install -m 644 "${WORKSPACE_ROOT}/assets/regel-daemon.service" "${STAGE_DIR}/usr/lib/systemd/user/regel-daemon.service"
install -m 644 "${WORKSPACE_ROOT}/assets/org.regel.harness.desktop" "${STAGE_DIR}/usr/share/applications/org.regel.harness.desktop"
install -m 644 "${WORKSPACE_ROOT}/assets/icons/regel-screensaver.svg" "${STAGE_DIR}/usr/share/icons/hicolor/scalable/apps/regel-screensaver.svg"

# 13. Documentation & Copyright
echo "    Installing documentation & copyright notices..."
install -m 644 "${WORKSPACE_ROOT}/README.md" "${STAGE_DIR}/usr/share/doc/${PKG_NAME}/README.md"
mkdir -p "${STAGE_DIR}/usr/share/doc/${PKG_NAME}/docs"
cp "${WORKSPACE_ROOT}/docs/"*.md "${STAGE_DIR}/usr/share/doc/${PKG_NAME}/docs/"

cat << 'INNER_EOF' > "${STAGE_DIR}/usr/share/doc/${PKG_NAME}/copyright"
Format: https://www.debian.org/doc/packaging-manuals/copyright-format/1.0/
Upstream-Name: regel-screensaver
Upstream-Contact: Regel Contributors <info@regel.org>
Source: https://github.com/rchandia/regel_screensaver

Files: *
Copyright: 2026 Regel Contributors
License: GPL-2.0-or-later

License: GPL-2.0-or-later
 This program is free software; you can redistribute it and/or modify
 it under the terms of the GNU General Public License as published by
 the Free Software Foundation; either version 2 of the License, or
 (at your option) any later version.
 .
 On Debian systems, the complete text of the GNU General Public License
 version 2 can be found in `/usr/share/common-licenses/GPL-2'.
INNER_EOF

# Compressed Debian changelog
cat << INNER_EOF | gzip -9c > "${STAGE_DIR}/usr/share/doc/${PKG_NAME}/changelog.Debian.gz"
${PKG_NAME} (${VERSION}-${DEB_REVISION}) unstable; urgency=medium

  * Initial Debian package release.
  * Complete 7-concept visual and acoustic simulation suite:
    - Concept 1: Liquid Neon Abyss (Fluid dynamics)
    - Concept 2: The Living Petri Dish (Lenia artificial life)
    - Concept 3: The Tranquil Sanctuary (Koi pond & caustics)
    - Concept 4: Cosmic Gravitational Sandbox (Black hole & lensing)
    - Concept 5: Procedural Synthwave Megacity (Raymarched cityscape)
    - Concept 6: Real-Time Ephemeris Biome (Painterly weather terrarium)
    - Concept 7: Kinetic Spiderweb & Resonance Harp (Tactile elastic lattice)
  * Safe Rust PipeWire audio tap and SIMD FFT analyzer.
  * Native Qt 6 RHI SPIR-V shader pipeline.
  * KDE Plasma 6 wallpaper containment & kscreenlocker integration.

 -- Regel Developers <info@regel.org>  $(date -R)
INNER_EOF

# 14. Debian Control File
echo -e "\n${BOLD}--> 5. Generating DEBIAN control and maintainer scripts...${NC}"

# Calculate installed size in KB
INSTALLED_SIZE=$(du -sk "${STAGE_DIR}" | cut -f1)

cat << INNER_EOF > "${STAGE_DIR}/DEBIAN/control"
Package: ${PKG_NAME}
Version: ${VERSION}-${DEB_REVISION}
Section: kde
Priority: optional
Architecture: ${ARCH}
Installed-Size: ${INSTALLED_SIZE}
Maintainer: Regel Project Contributors <info@regel.org>
Depends: libc6 (>= 2.34), pipewire (>= 0.3.65) | pipewire-audio-client-libraries, python3 (>= 3.10), python3-pyqt6, qml6-module-qtquick, qml6-module-qtquick-controls, plasma-workspace (>= 6.0.0)
Recommends: kscreenlocker, wireplumber, libplasma7 | libplasma6
Suggests: pulseaudio-utils
Homepage: https://github.com/rchandia/regel_screensaver
Description: Audio-reactive interactive wallpapers and screensavers for KDE Plasma 6
 Regel is an audio-reactive, physics-driven desktop canvas and screensaver
 suite running natively on modern Linux desktops using KDE Plasma 6 on Wayland.
 .
 Features 7 high-performance procedural archetypes:
  * Liquid Neon Abyss: Navier-Stokes fluid dynamics and chromatic cymatics
  * The Living Petri Dish: Continuous artificial life (Lenia) solitons
  * The Tranquil Sanctuary: Caustic koi pond, depth refraction & boid flocking
  * Cosmic Gravitational Sandbox: Relativistic black hole lensing & dust jets
  * Synthwave Megacity: 3D raymarched cyberpunk skyline with rain acoustics
  * Real-Time Ephemeris Biome: Real solar/lunar ephemeris & weather terrarium
  * Kinetic Spiderweb & Resonance Harp: Mass-spring transverse wave harmonics
 .
 Ships with a low-latency PipeWire audio FFT engine, lockscreen authentication
 security reactivity, and an interactive developer testing harness.
INNER_EOF

# Post-install script
cat << 'INNER_EOF' > "${STAGE_DIR}/DEBIAN/postinst"
#!/bin/sh
set -e

if [ "$1" = "configure" ]; then
    # Register libregel_engine in ldconfig cache
    ldconfig || true

    # Update system desktop database & icon cache
    if command -v update-icon-caches >/dev/null 2>&1; then
        update-icon-caches /usr/share/icons/hicolor || true
    fi
    if command -v update-desktop-database >/dev/null 2>&1; then
        update-desktop-database -q /usr/share/applications || true
    fi

    # Reload systemd user daemon definitions
    if command -v systemctl >/dev/null 2>&1; then
        systemctl --global daemon-reload 2>/dev/null || true
    fi
fi

exit 0
INNER_EOF
chmod 755 "${STAGE_DIR}/DEBIAN/postinst"

# Pre-removal script
cat << 'INNER_EOF' > "${STAGE_DIR}/DEBIAN/prerm"
#!/bin/sh
set -e

if [ "$1" = "remove" ] || [ "$1" = "deconfigure" ]; then
    # Stop background daemon service
    if command -v systemctl >/dev/null 2>&1; then
        systemctl --global stop regel-daemon.service 2>/dev/null || true
    fi
fi

exit 0
INNER_EOF
chmod 755 "${STAGE_DIR}/DEBIAN/prerm"

# Post-removal script
cat << 'INNER_EOF' > "${STAGE_DIR}/DEBIAN/postrm"
#!/bin/sh
set -e

if [ "$1" = "purge" ] || [ "$1" = "remove" ]; then
    ldconfig || true
    if command -v update-icon-caches >/dev/null 2>&1; then
        update-icon-caches /usr/share/icons/hicolor || true
    fi
    if command -v update-desktop-database >/dev/null 2>&1; then
        update-desktop-database -q /usr/share/applications || true
    fi
    if command -v systemctl >/dev/null 2>&1; then
        systemctl --global daemon-reload 2>/dev/null || true
    fi
fi

exit 0
INNER_EOF
chmod 755 "${STAGE_DIR}/DEBIAN/postrm"

# Generate md5sums
(
    cd "${STAGE_DIR}"
    find . -type f ! -path './DEBIAN/*' | sed 's|^\./||' | sort | xargs md5sum > "${STAGE_DIR}/DEBIAN/md5sums"
)

# 15. Package creation via dpkg-deb
echo -e "\n${BOLD}--> 6. Building Debian package with dpkg-deb...${NC}"
mkdir -p "${DIST_DIR}"
dpkg-deb --build --root-owner-group "${STAGE_DIR}" "${DIST_DIR}/${DEB_FILE}"

# Cleanup staging directory
rm -rf "${STAGE_DIR}"

echo -e "\n${BOLD}${GREEN}======================================================${NC}"
echo -e "${BOLD}${GREEN}   Successfully built: ${DIST_DIR}/${DEB_FILE}   ${NC}"
echo -e "${BOLD}${GREEN}======================================================${NC}"

# 16. Inspect package info and contents
echo -e "\n${BOLD}--> 7. Package Summary:${NC}"
dpkg-deb -I "${DIST_DIR}/${DEB_FILE}"

echo -e "\n${BOLD}--> 8. Staged Package File Listing (first 35 entries):${NC}"
dpkg-deb -c "${DIST_DIR}/${DEB_FILE}" > "${DIST_DIR}/staged-files.txt"
head -n 35 "${DIST_DIR}/staged-files.txt"
TOTAL_FILES=$(wc -l < "${DIST_DIR}/staged-files.txt")
echo "    [... and ${TOTAL_FILES} total staged entries recorded in ${DIST_DIR}/staged-files.txt]"

echo -e "\n${BOLD}${CYAN}To install this package on Debian/Ubuntu/Kubuntu:${NC}"
echo -e "    ${BOLD}sudo apt install ${DIST_DIR}/${DEB_FILE}${NC}"
echo -e "or:"
echo -e "    ${BOLD}sudo dpkg -i ${DIST_DIR}/${DEB_FILE} && sudo apt-get install -f${NC}"
