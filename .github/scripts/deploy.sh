#!/usr/bin/env bash

set -euo pipefail

REPO_DIR="${REPO_DIR:-$HOME/mm-auto}"
PM2_APP="${PM2_APP:-mm-auto}"
HEALTH_URL="${HEALTH_URL:-http://127.0.0.1:3000/mm-auto/health/}"
COMMIT_SHA="${COMMIT_SHA:?COMMIT_SHA must be set}"

export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
if [ -s "$NVM_DIR/nvm.sh" ]; then
  # shellcheck disable=SC1091
  . "$NVM_DIR/nvm.sh"
fi

for cmd in git node npm pm2 curl; do
  command -v "$cmd" > /dev/null || { echo "Missing command: $cmd"; exit 1; }
done

cd "$REPO_DIR"
 
PREVIOUS_SHA="$(git rev-parse HEAD)"
echo "Deploying $COMMIT_SHA (currently on $PREVIOUS_SHA)"
 
build_and_reload() {
  cd "$REPO_DIR/server"
  npm ci --include=dev
  npm run build
  pm2 reload "$PM2_APP" --update-env
}
 
rollback() {
  echo "Deploy failed, rolling back to $PREVIOUS_SHA"
  cd "$REPO_DIR"
  git checkout --force "$PREVIOUS_SHA"
  build_and_reload
  exit 1
}

git fetch --prune origin master
git checkout --force "$COMMIT_SHA"
 
build_and_reload || rollback
 
if ! curl -fsS --retry 10 --retry-delay 3 --retry-connrefused "$HEALTH_URL" > /dev/null; then
  rollback
fi
 
echo "Deployed $COMMIT_SHA"
