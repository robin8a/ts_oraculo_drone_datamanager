# Aplica rewrites de Amplify Hosting (proxy /workflow-api → API Gateway).
# Uso: .\scripts\apply-amplify-custom-rules.ps1
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$Rules = Join-Path $Root "infra\amplify\custom-rules.json"
$AppId = $env:AMPLIFY_APP_ID
if (-not $AppId) { $AppId = $env:AWS_APP_ID }
if (-not $AppId) { $AppId = $env:AMPLIFY_BACKEND_APP_ID }
if (-not $AppId) { $AppId = "d2yaf6u7gkp21" }

if (-not (Test-Path $Rules)) {
  Write-Error "No existe $Rules"
}

if (-not (Get-Command aws -ErrorAction SilentlyContinue)) {
  Write-Error "Instala AWS CLI o pega infra/amplify/custom-rules.json en Amplify → Rewrites and redirects."
}

Write-Host "[amplify-rules] Aplicando reglas en app $AppId..."
aws amplify update-app --app-id $AppId --custom-rules "file://$($Rules -replace '\\','/')"
Write-Host "[amplify-rules] OK. Prueba /admin/users en incognito."
