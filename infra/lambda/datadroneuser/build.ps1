# Genera datadroneuser.zip listo para subir a AWS Lambda
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

if (Test-Path datadroneuser.zip) { Remove-Item datadroneuser.zip -Force }
if (-not (Test-Path node_modules)) {
  Write-Host 'npm install...'
  npm install
}

Write-Host 'Creando datadroneuser.zip (index.js en la raiz)...'
Compress-Archive -Path index.js, package.json, node_modules -DestinationPath datadroneuser.zip -Force
Write-Host "OK: $PSScriptRoot\datadroneuser.zip"
