#!/usr/bin/env bash
set -euo pipefail

# Amplify Hosting define AWS_APP_ID automáticamente. Fallback: team-provider-info.json
APP_ID="${AWS_APP_ID:-d2yaf6u7gkp21}"
BACKEND_ENV="${AMPLIFY_BACKEND_ENV:-dev}"

echo "[amplify-pull] appId=${APP_ID} envName=${BACKEND_ENV}"

npx --yes @aws-amplify/cli@14.2.3 pull \
  --appId "${APP_ID}" \
  --envName "${BACKEND_ENV}" \
  --yes

if [ ! -f src/amplifyconfiguration.json ] && [ -f amplifyconfiguration.json ]; then
  echo "[amplify-pull] Copiando amplifyconfiguration.json → src/"
  cp amplifyconfiguration.json src/amplifyconfiguration.json
fi

if [ ! -f src/amplifyconfiguration.json ]; then
  echo "[amplify-pull] ERROR: no se generó src/amplifyconfiguration.json"
  exit 1
fi

echo "[amplify-pull] OK: src/amplifyconfiguration.json listo"
