#!/usr/bin/env bash
# Aplica rewrites de Amplify Hosting (proxy /workflow-api → API Gateway).
# Uso local: bash scripts/apply-amplify-custom-rules.sh
# Requiere AWS CLI y permisos amplify:UpdateApp en la app.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
RULES="${ROOT}/infra/amplify/custom-rules.json"
APP_ID="${AMPLIFY_APP_ID:-${AWS_APP_ID:-${AMPLIFY_BACKEND_APP_ID:-d2yaf6u7gkp21}}}"

if [ ! -f "$RULES" ]; then
  echo "[amplify-rules] No existe $RULES" >&2
  exit 1
fi

if ! command -v aws >/dev/null 2>&1; then
  echo "[amplify-rules] Instala AWS CLI o copia infra/amplify/custom-rules.json en Amplify → Rewrites and redirects." >&2
  exit 1
fi

echo "[amplify-rules] Aplicando reglas en app ${APP_ID}..."
aws amplify update-app --app-id "$APP_ID" --custom-rules "file://${RULES}"
echo "[amplify-rules] OK. Prueba /admin/users en incógnito (limpia 301 en caché)."
