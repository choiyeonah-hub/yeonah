#!/usr/bin/env bash
# Prepares element-lock/ as a standalone repository WITHOUT changing this repository.
# - Keeps element-lock history (git subtree split) in a new local branch.
# - Copies the CI workflow to .github/workflows/ at the new root (it auto-detects the folder layout).
# Only committed files are exported. Nothing is deleted here and nothing is pushed. You create the new (private or public) repo yourself.
#
# Usage (from the parent repository root):
#   element-lock/tools/export-to-new-repo.sh ../element-lock-standalone
set -euo pipefail
DEST=${1:?usage: export-to-new-repo.sh <new-directory>}
ROOT=$(git rev-parse --show-toplevel)
cd "$ROOT"
BRANCH=element-lock-export
git subtree split --prefix=element-lock -b "$BRANCH" >/dev/null
git clone --quiet --branch "$BRANCH" "$ROOT" "$DEST"
git branch --quiet -D "$BRANCH"   # leave the parent repository exactly as it was
mkdir -p "$DEST/.github/workflows"
cp "$ROOT/.github/workflows/element-lock.yml" "$DEST/.github/workflows/element-lock.yml"
cd "$DEST"
git remote remove origin
git checkout --quiet -b main
git branch --quiet -D "$BRANCH"
git add .github && git commit --quiet -m "Add CI workflow"
echo "Standalone repository ready at $DEST (branch main, no remote)."
echo "Next: create an empty repository on GitHub, then: git remote add origin <url> && git push -u origin main"
echo "Note: a PRIVATE repository uses paid Actions minutes for macOS runners beyond the free quota."
