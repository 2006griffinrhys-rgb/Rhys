#!/bin/bash

# =============================================================================
# fix_stripe_header.sh
# Fixes: stripe-react-native STPPaymentStatus redefinition error
# Works: Locally & on Codemagic CI
#
# Usage:
#   chmod +x fix_stripe_header.sh
#   ./fix_stripe_header.sh
#
# Or pass a custom iOS project root:
#   ./fix_stripe_header.sh /path/to/your/ios
# =============================================================================

set -euo pipefail

# ── Colour helpers ────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Colour

info()    { echo -e "${BLUE}[INFO]${NC}  $*"; }
success() { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error()   { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }

# ── Detect environment & set iOS root ────────────────────────────────────────
detect_ios_root() {
  # 1. Explicit argument wins
  if [ -n "${1:-}" ]; then
    echo "$1"
    return
  fi

  # 2. Codemagic – CM_BUILD_DIR (newer) or FCI_BUILD_DIR (legacy)
  if [ -n "${CM_BUILD_DIR:-}" ]; then
    echo "${CM_BUILD_DIR}/ios"
    return
  fi
  if [ -n "${FCI_BUILD_DIR:-}" ]; then
    echo "${FCI_BUILD_DIR}/ios"
    return
  fi

  # 3. Local: assume script lives in repo root or ios/ sibling
  SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

  # If script is inside ios/, parent is repo root
  if [[ "$SCRIPT_DIR" == */ios ]]; then
    echo "$SCRIPT_DIR"
    return
  fi

  # If an ios/ folder exists next to the script
  if [ -d "${SCRIPT_DIR}/ios" ]; then
    echo "${SCRIPT_DIR}/ios"
    return
  fi

  # Last resort: current working directory
  if [ -d "$(pwd)/ios" ]; then
    echo "$(pwd)/ios"
    return
  fi

  echo ""
}

# ── Patch a single header file ────────────────────────────────────────────────
patch_header() {
  local file="$1"
  local pattern='SWIFT_ENUM_FWD_DECL(NSInteger, STPPaymentStatus)'

  if grep -qF "$pattern" "$file" 2>/dev/null; then
    # macOS sed requires '' after -i; GNU sed (Linux/Codemagic) accepts it too
    sed -i '' "/${pattern//\(/\\(}/d" "$file" 2>/dev/null \
      || sed -i  "/${pattern//\(/\\(}/d" "$file"
    success "Patched → $file"
    return 0
  else
    info "Pattern not found (already clean) → $file"
    return 1
  fi
}

# ── Main ──────────────────────────────────────────────────────────────────────
main() {
  echo ""
  echo -e "${BLUE}======================================================${NC}"
  echo -e "${BLUE}  Stripe React Native – STPPaymentStatus Header Fix   ${NC}"
  echo -e "${BLUE}======================================================${NC}"
  echo ""

  IOS_ROOT="$(detect_ios_root "${1:-}")"

  if [ -z "$IOS_ROOT" ] || [ ! -d "$IOS_ROOT" ]; then
    error "Could not locate the iOS project directory.\n       Pass it explicitly: $0 /path/to/ios"
  fi

  info "iOS root: $IOS_ROOT"

  # ── Find all copies of the problematic header ────────────────────────────
  info "Searching for stripe_react_native-Swift.h ..."

  mapfile -t HEADERS < <(
    find "$IOS_ROOT" \
      -name "stripe_react_native-Swift.h" \
      \( \
        -path "*/Pods/*" \
        -o -path "*/DerivedData/*" \
        -o -path "*/Build/*" \
      \) \
      2>/dev/null
  )

  # Also catch copies outside Build/ (e.g. Headers/Public)
  mapfile -t EXTRA < <(
    find "$IOS_ROOT" \
      -name "stripe_react_native-Swift.h" \
      -not -path "*/DerivedData/*" \
      2>/dev/null
  )

  # Merge & deduplicate
  ALL_HEADERS=()
  declare -A SEEN
  for h in "${HEADERS[@]:-}" "${EXTRA[@]:-}"; do
    [ -z "$h" ] && continue
    if [ -z "${SEEN[$h]:-}" ]; then
      SEEN[$h]=1
      ALL_HEADERS+=("$h")
    fi
  done

  if [ ${#ALL_HEADERS[@]} -eq 0 ]; then
    warn "No stripe_react_native-Swift.h files found under $IOS_ROOT"
    warn "Ensure 'pod install' has been run before this script."
    exit 0
  fi

  info "Found ${#ALL_HEADERS[@]} header file(s)."
  echo ""

  PATCHED=0
  for header in "${ALL_HEADERS[@]}"; do
    patch_header "$header" && (( PATCHED++ )) || true
  done

  echo ""
  if [ "$PATCHED" -gt 0 ]; then
    success "$PATCHED file(s) patched successfully."
  else
    info "No files needed patching — all headers were already clean."
  fi

  echo ""
  success "Done. You can now run your Xcode build."
  echo ""
}

main "${@}"
