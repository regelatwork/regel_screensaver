#!/usr/bin/env bash
# =============================================================================
# regel_screensaver - Debian Source Package Builder & Lintian Verifier
# Generates official Debian source packages (.orig.tar.gz, .debian.tar.xz, .dsc)
# compliant with Debian Policy and verifies them with lintian.
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
echo -e "${BOLD}${CYAN}   regel_screensaver - Debian Source Package Builder  ${NC}"
echo -e "${BOLD}${CYAN}======================================================${NC}"
echo "  Workspace: ${WORKSPACE_ROOT}"

# 1. Dependency checks
echo -e "\n${BOLD}--> 1. Checking Debian packaging toolchain...${NC}"
command -v dpkg-source >/dev/null 2>&1 || { echo -e "${RED}Error: dpkg-source not found. Install dpkg-dev.${NC}" >&2; exit 1; }
command -v lintian >/dev/null 2>&1 || { echo -e "${RED}Error: lintian not found. Install lintian.${NC}" >&2; exit 1; }
command -v rsync >/dev/null 2>&1 || { echo -e "${RED}Error: rsync not found.${NC}" >&2; exit 1; }
command -v tar >/dev/null 2>&1 || { echo -e "${RED}Error: tar not found.${NC}" >&2; exit 1; }

echo -e "${GREEN}    Prerequisites verified (dpkg-source, lintian, rsync, tar)${NC}"

# 2. Extract package version from debian/changelog and Cargo.toml
VERSION=$(dpkg-parsechangelog -S Version -l "${WORKSPACE_ROOT}/debian/changelog" 2>/dev/null || echo "0.1.0-1")
UPSTREAM_VERSION="${VERSION%%-*}"
DEB_REVISION="${VERSION##*-}"
PKG_NAME="regel-screensaver"

SRC_DIST_DIR="${WORKSPACE_ROOT}/dist/source"
SRC_TREE_DIR="${SRC_DIST_DIR}/${PKG_NAME}-${UPSTREAM_VERSION}"
ORIG_TARBALL="${SRC_DIST_DIR}/${PKG_NAME}_${UPSTREAM_VERSION}.orig.tar.gz"
DSC_FILE="${SRC_DIST_DIR}/${PKG_NAME}_${VERSION}.dsc"

echo -e "    Package:          ${BOLD}${PKG_NAME}${NC}"
echo -e "    Full Version:     ${BOLD}${VERSION}${NC}"
echo -e "    Upstream Version: ${BOLD}${UPSTREAM_VERSION}${NC}"
echo -e "    Debian Revision:  ${BOLD}${DEB_REVISION}${NC}"
echo -e "    Target Directory: ${BOLD}${SRC_DIST_DIR}${NC}"

# 3. Clean and prepare source staging directory
echo -e "\n${BOLD}--> 2. Preparing clean pristine upstream source tree...${NC}"
rm -rf "${SRC_DIST_DIR}"
mkdir -p "${SRC_DIST_DIR}"
mkdir -p "${SRC_TREE_DIR}"

# Export clean source files from git or workspace
# We exclude build artifacts, compiled shaders, target, and debian/ from upstream orig tarball
tar -czf "${ORIG_TARBALL}" \
    --exclude-vcs \
    --exclude='./dist' \
    --exclude='./target' \
    --exclude='./build' \
    --exclude='./debian' \
    --exclude='__pycache__' \
    --exclude='*.pyc' \
    --exclude='*.qsb' \
    --transform "s|^./|${PKG_NAME}-${UPSTREAM_VERSION}/|" \
    -C "${WORKSPACE_ROOT}" .

echo -e "${GREEN}    Created pristine upstream tarball: ${ORIG_TARBALL} ($(du -h "${ORIG_TARBALL}" | cut -f1))${NC}"

# 4. Unpack or populate the source directory for dpkg-source
echo -e "\n${BOLD}--> 3. Staging source tree with debian/ metadata...${NC}"
tar -xzf "${ORIG_TARBALL}" -C "${SRC_DIST_DIR}"

# Copy debian/ packaging directory into source tree
cp -a "${WORKSPACE_ROOT}/debian" "${SRC_TREE_DIR}/"

# 5. Build Debian source package using dpkg-source
echo -e "\n${BOLD}--> 4. Building Debian source package with dpkg-source...${NC}"
(
    cd "${SRC_DIST_DIR}"
    dpkg-source -b "${PKG_NAME}-${UPSTREAM_VERSION}"
)

if [ ! -f "${DSC_FILE}" ]; then
    echo -e "${RED}Error: ${DSC_FILE} was not generated!${NC}" >&2
    exit 1
fi

echo -e "${GREEN}    Successfully generated Debian source package:${NC}"
ls -lh "${SRC_DIST_DIR}/${PKG_NAME}_${VERSION}"* "${ORIG_TARBALL}"

# 6. Verify Debian source package with Lintian
echo -e "\n${BOLD}--> 5. Running Lintian conformance check on ${PKG_NAME}_${VERSION}.dsc...${NC}"
echo "    Flags: -I -E --pedantic"

LINTIAN_EXIT=0
LINTIAN_OUT=""
LINTIAN_OUT=$(lintian -I -E --pedantic "${DSC_FILE}" 2>&1) || LINTIAN_EXIT=$?

if [ -n "${LINTIAN_OUT}" ]; then
    echo "${LINTIAN_OUT}"
else
    echo -e "${GREEN}    Lintian passed with zero errors, warnings, or notes!${NC}"
fi

# In Debian packaging, experimental/pedantic tags may return 0 or non-zero depending on configuration
# Check if any errors (E:) or severe warnings (W:) were issued
ERRORS_COUNT=$(echo "${LINTIAN_OUT}" | grep -c "^E:" || true)
WARNINGS_COUNT=$(echo "${LINTIAN_OUT}" | grep -c "^W:" || true)

if [ "${ERRORS_COUNT}" -gt 0 ]; then
    echo -e "\n${RED}${BOLD}FAILED: Lintian detected ${ERRORS_COUNT} error(s) in the source package!${NC}" >&2
    exit 1
elif [ "${WARNINGS_COUNT}" -gt 0 ]; then
    echo -e "\n${YELLOW}${BOLD}WARNING: Lintian reported ${WARNINGS_COUNT} warning(s).${NC}"
else
    echo -e "\n${GREEN}${BOLD}PASSED: Source package strictly complies with Debian Policy!${NC}"
fi

echo -e "\n${BOLD}${CYAN}======================================================${NC}"
echo -e "${BOLD}${CYAN}   Debian Source Package Artifacts Ready:            ${NC}"
echo -e "${BOLD}${CYAN}======================================================${NC}"
echo -e "  - Upstream tarball:  ${BOLD}${ORIG_TARBALL}${NC}"
echo -e "  - Debian diff:      ${BOLD}${SRC_DIST_DIR}/${PKG_NAME}_${VERSION}.debian.tar.xz${NC}"
echo -e "  - Package control:  ${BOLD}${DSC_FILE}${NC}"
echo ""
echo -e "${BOLD}To test building from this source package on any Debian/Ubuntu system:${NC}"
echo -e "  dpkg-source -x ${DSC_FILE} /tmp/regel-test-build"
echo -e "  cd /tmp/regel-test-build && dpkg-buildpackage -us -uc"
echo ""
echo -e "${BOLD}To upload to Launchpad PPA or Debian Mentors:${NC}"
echo -e "  debuild -S -sa"
echo -e "  dput ppa:<your-ppa>/<repo> ${PKG_NAME}_${VERSION}_source.changes"
