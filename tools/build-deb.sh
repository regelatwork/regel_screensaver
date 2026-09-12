#!/usr/bin/env bash
# =============================================================================
# regel_screensaver - Debian Binary Package Builder (.deb)
# 
# Builds the binary Debian package (.deb) strictly from the Debian source
# package (.orig.tar.gz + .debian.tar.xz + .dsc) via the standard Debian
# toolchain (dpkg-source, debhelper dh $@, dpkg-buildpackage, and lintian).
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
echo -e "${BOLD}${CYAN}   regel_screensaver - Debian Package Builder (.deb)  ${NC}"
echo -e "${BOLD}${CYAN}======================================================${NC}"
echo "  Workspace: ${WORKSPACE_ROOT}"

# 1. Step 1: Call package-src.sh to build and validate the source package
echo -e "\n${BOLD}--> Step 1: Building and validating Debian Source Package...${NC}"
"${SCRIPT_DIR}/package-src.sh"

# Extract metadata
VERSION=$(dpkg-parsechangelog -S Version -l "${WORKSPACE_ROOT}/debian/changelog" 2>/dev/null || echo "0.1.0-1")
UPSTREAM_VERSION="${VERSION%%-*}"
PKG_NAME="regel-screensaver"

RAW_ARCH="$(dpkg --print-architecture 2>/dev/null || uname -m)"
case "${RAW_ARCH}" in
    x86_64|amd64) ARCH="amd64" ;;
    aarch64|arm64) ARCH="arm64" ;;
    *) ARCH="${RAW_ARCH}" ;;
esac

DIST_DIR="${WORKSPACE_ROOT}/dist"
SRC_DIST_DIR="${DIST_DIR}/source"
DSC_FILE="${SRC_DIST_DIR}/${PKG_NAME}_${VERSION}.dsc"
BUILD_DIR="${DIST_DIR}/build"
BUILD_SRC_DIR="${BUILD_DIR}/${PKG_NAME}-${UPSTREAM_VERSION}"
DEB_FILE="${PKG_NAME}_${VERSION}_${ARCH}.deb"

if [ ! -f "${DSC_FILE}" ]; then
    echo -e "${RED}Error: Source package ${DSC_FILE} not found!${NC}" >&2
    exit 1
fi

# 2. Step 2: Extract the source package into a clean build directory
echo -e "\n${BOLD}--> Step 2: Extracting source package into clean build workspace...${NC}"
rm -rf "${BUILD_DIR}"
mkdir -p "${BUILD_DIR}"

(
    cd "${BUILD_DIR}"
    dpkg-source -x "${DSC_FILE}" "${PKG_NAME}-${UPSTREAM_VERSION}"
)

# 3. Step 3: Build binary package from extracted source via dpkg-buildpackage
echo -e "\n${BOLD}--> Step 3: Compiling binary package from source package via dpkg-buildpackage...${NC}"
(
    cd "${BUILD_SRC_DIR}"
    dpkg-buildpackage -us -uc -b
)

# 4. Step 4: Collect generated debian artifacts into dist/
echo -e "\n${BOLD}--> Step 4: Collecting built binary packages...${NC}"
cp "${BUILD_DIR}/${PKG_NAME}_${VERSION}_${ARCH}.deb" "${DIST_DIR}/${DEB_FILE}"
if [ -f "${BUILD_DIR}/${PKG_NAME}-dbgsym_${VERSION}_${ARCH}.deb" ]; then
    cp "${BUILD_DIR}/${PKG_NAME}-dbgsym_${VERSION}_${ARCH}.deb" "${DIST_DIR}/"
fi
if [ -f "${BUILD_DIR}/${PKG_NAME}_${VERSION}_${ARCH}.buildinfo" ]; then
    cp "${BUILD_DIR}/${PKG_NAME}_${VERSION}_${ARCH}.buildinfo" "${DIST_DIR}/"
fi
if [ -f "${BUILD_DIR}/${PKG_NAME}_${VERSION}_${ARCH}.changes" ]; then
    cp "${BUILD_DIR}/${PKG_NAME}_${VERSION}_${ARCH}.changes" "${DIST_DIR}/"
fi

# Clean temporary build directory
rm -rf "${BUILD_DIR}"

echo -e "${GREEN}    Generated: ${DIST_DIR}/${DEB_FILE} ($(du -h "${DIST_DIR}/${DEB_FILE}" | cut -f1))${NC}"

# 5. Step 5: Verify binary package with Lintian
echo -e "\n${BOLD}--> Step 5: Running Lintian conformance check on binary package...${NC}"
echo "    Flags: -I -E --pedantic"

LINTIAN_BIN_OUT=""
LINTIAN_BIN_OUT=$(lintian -I -E --pedantic "${DIST_DIR}/${DEB_FILE}" 2>&1) || true

if [ -n "${LINTIAN_BIN_OUT}" ]; then
    echo "${LINTIAN_BIN_OUT}"
else
    echo -e "${GREEN}    Lintian passed with zero errors, warnings, or notes!${NC}"
fi

BIN_ERRORS=$(echo "${LINTIAN_BIN_OUT}" | grep -c "^E:" || true)
if [ "${BIN_ERRORS}" -gt 0 ]; then
    echo -e "\n${RED}${BOLD}FAILED: Lintian detected ${BIN_ERRORS} error(s) in the binary package!${NC}" >&2
    exit 1
else
    echo -e "\n${GREEN}${BOLD}PASSED: Binary package complies with Debian Policy!${NC}"
fi

# 6. Step 6: Summary & Inspection
echo -e "\n${BOLD}${GREEN}======================================================${NC}"
echo -e "${BOLD}${GREEN}   Debian Package (.deb) Successfully Created!        ${NC}"
echo -e "${BOLD}${GREEN}======================================================${NC}"

echo -e "\n${BOLD}--> Package Control Summary:${NC}"
dpkg-deb -I "${DIST_DIR}/${DEB_FILE}"

echo -e "\n${BOLD}--> Staged Package File Listing (first 35 entries):${NC}"
dpkg-deb -c "${DIST_DIR}/${DEB_FILE}" > "${DIST_DIR}/staged-files.txt"
head -n 35 "${DIST_DIR}/staged-files.txt"
TOTAL_FILES=$(wc -l < "${DIST_DIR}/staged-files.txt")
echo "    [... and ${TOTAL_FILES} total entries recorded in ${DIST_DIR}/staged-files.txt]"

echo -e "\n${BOLD}${CYAN}To install this package on Debian/Ubuntu/Kubuntu:${NC}"
echo -e "    ${BOLD}sudo apt install ${DIST_DIR}/${DEB_FILE}${NC}"
echo -e "or:"
echo -e "    ${BOLD}sudo dpkg -i ${DIST_DIR}/${DEB_FILE} && sudo apt-get install -f${NC}"
