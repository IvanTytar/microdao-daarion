#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="${REPO_DIR:-/opt/microdao-daarion}"
BRANCH="${SYNC_BRANCH:-main}"

cd "$REPO_DIR"

if [ ! -d .git ]; then
  echo "[docs-sync] Missing git repo in $REPO_DIR" >&2
  exit 1
fi

echo "[docs-sync] Fetching origin/$BRANCH"
git fetch origin "$BRANCH"

LOCAL=$(git rev-parse @)
REMOTE=$(git rev-parse "origin/$BRANCH")

if [ "$LOCAL" = "$REMOTE" ]; then
  echo "[docs-sync] Already up to date"
  exit 0
fi

echo "[docs-sync] Updating from origin/$BRANCH"
git pull --ff-only origin "$BRANCH"
