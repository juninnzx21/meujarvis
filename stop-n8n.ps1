Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root

Write-Host "Stopping JARVIS n8n containers..."
docker compose stop n8n n8n-postgres
docker compose ps n8n-postgres n8n
