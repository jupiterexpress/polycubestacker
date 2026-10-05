#!/bin/bash
# Pushes this folder to GitHub as "polycubestacker" using your GitHub CLI.
set -e
cd "$(dirname "$0")"
if gh repo view polycubestacker >/dev/null 2>&1; then
  url="$(gh repo view polycubestacker --json url -q .url).git"
  git remote add origin "$url" 2>/dev/null || git remote set-url origin "$url"
  git fetch origin
  if git ls-remote --exit-code --heads origin main >/dev/null 2>&1; then
    git pull --rebase origin main --allow-unrelated-histories -X ours || true
  fi
  git push -u origin main
else
  gh repo create polycubestacker --private --source=. --remote=origin --push
fi
echo "Done: $(gh repo view polycubestacker --json url -q .url)"
