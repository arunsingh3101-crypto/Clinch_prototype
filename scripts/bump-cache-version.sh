#!/usr/bin/env bash
# Bumps the ?v= cache-busting query string on every internal script/import
# reference. GitHub Pages doesn't hash filenames, so an unchanged URL can
# keep serving a phone browser's stale cached copy of one file even after a
# new deploy -- run this before every push so the whole module graph is
# forced to refetch together.
#
# Also updates version.json and the APP_VERSION embedded in index.html's
# self-healing boot script, which detects when the browser is still serving
# a stale copy of index.html itself (the ?v= bump above only helps once a
# fresh index.html has been fetched) and force-reloads from a fresh URL.
set -euo pipefail
cd "$(dirname "$0")/.."

# Extracted from the APP_VERSION assignment rather than a bare 'v=' scan --
# 'v=' alone also false-matches inside http-equiv="..." attributes.
OLD=$(sed -n "s/.*APP_VERSION = '\([0-9a-z]*\)'.*/\1/p" index.html | head -1)
NEW="$(date +%Y%m%d%H%M%S)"

if [ -z "$OLD" ]; then
  echo "Could not find an existing APP_VERSION in index.html" >&2
  exit 1
fi

grep -rlZ "v=${OLD}" index.html src/ | xargs -0 sed -i "s/v=${OLD}/v=${NEW}/g"
sed -i "s/APP_VERSION = '${OLD}'/APP_VERSION = '${NEW}'/" index.html
printf '{"version": "%s"}\n' "$NEW" > version.json
echo "Bumped cache-busting version: ${OLD} -> ${NEW}"
