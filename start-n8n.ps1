Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root

Write-Host "Starting JARVIS n8n stack..."
docker compose up -d n8n-postgres n8n
docker compose ps n8n-postgres n8n
$port = if ($env:N8N_HOST_PORT) { $env:N8N_HOST_PORT } else { "15678" }
Write-Host "Local n8n URL: http://127.0.0.1:$port"
Write-Host "No secrets were printed. Configure credentials in .env only."
