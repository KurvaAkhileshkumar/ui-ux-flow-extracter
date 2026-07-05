#!/usr/bin/env bash
set -euo pipefail

# ── Resolve project root regardless of where the script is called from ─────
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

# ── Colours ────────────────────────────────────────────────────────────────
BOLD=$'\033[1m'
DIM=$'\033[2m'
GREEN=$'\033[0;32m'
BLUE=$'\033[0;34m'
YELLOW=$'\033[1;33m'
CYAN=$'\033[0;36m'
RED=$'\033[0;31m'
RESET=$'\033[0m'

header() {
  echo ""
  echo -e "${BOLD}${BLUE}  ╔═══════════════════════════════════════════════════╗${RESET}"
  echo -e "${BOLD}${BLUE}  ║       Dashboard Design Inspector  v2.0            ║${RESET}"
  echo -e "${BOLD}${BLUE}  ║       SASTRA.ai · Faculty Dashboard               ║${RESET}"
  echo -e "${BOLD}${BLUE}  ╚═══════════════════════════════════════════════════╝${RESET}"
  echo ""
}

step()  { echo -e "\n${CYAN}${BOLD}▶ $1${RESET}"; }
ok()    { echo -e "  ${GREEN}✓${RESET} $1"; }
warn()  { echo -e "  ${YELLOW}⚠${RESET}  $1"; }
err()   { echo -e "  ${RED}✗${RESET}  $1"; }
info()  { echo -e "  ${DIM}$1${RESET}"; }

# ── Parse flags ────────────────────────────────────────────────────────────
CLEAN=false
HEADED=false
DEBUG=false
URL_OVERRIDE=""

for arg in "$@"; do
  case "$arg" in
    --clean)   CLEAN=true  ;;
    --headed)  HEADED=true ;;
    --debug)   DEBUG=true  ;;
    --url=*)   URL_OVERRIDE="${arg#--url=}" ;;
    --help|-h)
      echo "Usage: bash run.sh [options]"
      echo ""
      echo "Options:"
      echo "  --clean        Wipe output/ before running"
      echo "  --headed       Show the browser window"
      echo "  --debug        Open Playwright Inspector (step-through)"
      echo "  --url=<URL>    Override the target URL"
      echo "  --help         Show this message"
      echo ""
      exit 0
      ;;
    *)
      warn "Unknown flag: $arg  (try --help)"
      ;;
  esac
done

# ── Header ─────────────────────────────────────────────────────────────────
header

# ── Preflight: Node.js ─────────────────────────────────────────────────────
step "Checking environment"

if ! command -v node &>/dev/null; then
  err "Node.js not found. Install from https://nodejs.org (v18+)"
  exit 1
fi

NODE_VER=$(node --version)
ok "Node.js $NODE_VER"

# ── Step 1: npm install ────────────────────────────────────────────────────
step "Dependencies"

if [ ! -d "$ROOT/node_modules" ]; then
  info "node_modules not found — installing..."
  npm install --silent
  ok "Packages installed"
else
  ok "node_modules present"
fi

# ── Step 2: Playwright browser ─────────────────────────────────────────────
step "Playwright browser"

PLAYWRIGHT="$ROOT/node_modules/.bin/playwright"

# install is idempotent — fast if already present
"$PLAYWRIGHT" install chromium 2>&1 | grep -v "^$" | grep -v "Downloading\|Installing" | \
  sed 's/^/  /' || true
ok "Chromium ready"

# ── Step 3: Output directories ─────────────────────────────────────────────
step "Output directories"

if [ "$CLEAN" = true ]; then
  warn "Cleaning previous output..."
  rm -rf "$ROOT/output"
fi

mkdir -p \
  "$ROOT/output/json" \
  "$ROOT/output/screenshots/cards" \
  "$ROOT/output/screenshots/buttons"

ok "output/ ready  →  $ROOT/output"

# ── Step 4: URL override (write to env if provided) ────────────────────────
if [ -n "$URL_OVERRIDE" ]; then
  step "Target URL override"
  export INSPECTOR_URL="$URL_OVERRIDE"
  ok "URL → $URL_OVERRIDE"
fi

# ── Step 5: Run Playwright ─────────────────────────────────────────────────
step "Running inspector"
echo ""

PW_ARGS="--project=chromium"

if [ "$DEBUG" = true ]; then
  PW_ARGS="$PW_ARGS --debug"
elif [ "$HEADED" = true ]; then
  PW_ARGS="$PW_ARGS --headed"
fi

# Run — inherit stdio so all console output is visible
"$PLAYWRIGHT" test $PW_ARGS
STATUS=$?

# ── Step 6: Result ─────────────────────────────────────────────────────────
echo ""

if [ $STATUS -ne 0 ]; then
  err "Inspector exited with errors (code $STATUS)"
  info "Run with --headed or --debug to investigate"
  exit $STATUS
fi

# Count outputs
JSON_COUNT=$(find "$ROOT/output/json" -name "*.json" 2>/dev/null | wc -l | tr -d ' ')
SHOT_COUNT=$(find "$ROOT/output/screenshots" -name "*.png" 2>/dev/null | wc -l | tr -d ' ')
ELEM_COUNT="—"
if [ -f "$ROOT/output/summary.json" ]; then
  ELEM_COUNT=$(node -e "try{const s=require('./output/summary.json');process.stdout.write(String(s.statistics.totalElements))}catch(e){process.stdout.write('—')}" 2>/dev/null)
fi

echo -e "${BOLD}${GREEN}  ╔═══════════════════════════════════════════════════╗"
echo -e "  ║   Done!                                           ║"
echo -e "  ╚═══════════════════════════════════════════════════╝${RESET}"
echo ""
echo -e "  ${BOLD}Elements captured${RESET}  :  $ELEM_COUNT"
echo -e "  ${BOLD}JSON reports${RESET}       :  $JSON_COUNT files  →  output/json/"
echo -e "  ${BOLD}Screenshots${RESET}        :  $SHOT_COUNT images  →  output/screenshots/"
echo ""
echo -e "  ${DIM}Key files:${RESET}"
echo -e "  ${DIM}  output/summary.json                    ← quick stats${RESET}"
echo -e "  ${DIM}  output/json/index.json                 ← section map${RESET}"
echo -e "  ${DIM}  output/json/sections/<name>.json       ← per-section (colors, typography, tokens, elements)${RESET}"
echo -e "  ${DIM}  output/json/full-page/colors.json      ← full-page colour palette${RESET}"
echo -e "  ${DIM}  output/json/full-page/typography.json  ← full-page fonts + sizes + weights${RESET}"
echo -e "  ${DIM}  output/json/full-page/design-tokens.json ← full-page design tokens${RESET}"
echo ""
