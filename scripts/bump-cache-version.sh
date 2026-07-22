#!/usr/bin/env bash
# Bumps the ?v= cache-busting query string on every internal script/import
# reference. GitHub Pages doesn't hash filenames, so an unchanged URL can
# keep serving a phone browser's stale cached copy of one file even after a
# new deploy -- run this before every push so the whole module graph is
# forced to refetch together.
set -euo pipefail
cd "$(dirname "$0")/.."

OLD=$(grep -o 'v=[0-9a-z]*' index.html | head -1 | cut -d= -f2)
NEW="$(date +%Y%m%d%H%M%S)"

if [ -z "$OLD" ]; then
  echo "Could not find an existing ?v= version in index.html" >&2
  exit 1
fi

grep -rlZ "v=${OLD}" index.html src/ | xargs -0 sed -i "s/v=${OLD}/v=${NEW}/g"
echo "Bumped cache-busting version: ${OLD} -> ${NEW}"
