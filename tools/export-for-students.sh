#!/usr/bin/env bash
set -euo pipefail

ROOT=$(cd "$(dirname "$0")/.." && pwd)
SEED=1
COUNT=15

while [ "$#" -gt 0 ]; do
  case "$1" in
    --seed) SEED="$2"; shift 2 ;;
    --count) COUNT="$2"; shift 2 ;;
    *) echo "usage: $0 [--seed N] [--count N]" >&2; exit 2 ;;
  esac
done

case "$SEED:$COUNT" in
  *[!0-9:]*|:*) echo "seed and count must be non-negative integers" >&2; exit 2 ;;
esac

STAGE=$(mktemp -d "${TMPDIR:-/tmp}/paisape-export.XXXXXX")
DEST="$ROOT/student-export"
cleanup() { rm -rf "$STAGE"; }
trap cleanup EXIT

mkdir -p "$STAGE/project"
tar -C "$ROOT" \
  --exclude='.git' --exclude='.gitignore' --exclude='node_modules' --exclude='.turbo' --exclude='coverage' \
  --exclude='private' --exclude='student-export' --exclude='PROGRESS.md' --exclude='INSTRUCTOR_BUG_GUIDE.md' \
  --exclude='tools/CLAUDE.md' --exclude='tools/README.md' --exclude='tools/inject' --exclude='tools/checks' \
  -cf - . | tar -C "$STAGE/project" -xf -

pnpm --dir "$ROOT" inject --seed "$SEED" --count "$COUNT" --target "$STAGE/project"
rm -rf "$STAGE/project/private" "$STAGE/project/tools/inject" "$STAGE/project/tools/checks"

if [ -e "$DEST" ]; then
  rm -rf "$DEST"
fi
mv "$STAGE/project" "$DEST"
pnpm --dir "$ROOT" checks "$DEST"
echo "student export written to $DEST"
