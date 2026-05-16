Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root

$backupDir = Join-Path $Root "backups"
New-Item -ItemType Directory -Force -Path $backupDir | Out-Null
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupFile = Join-Path $backupDir "jarvis_n8n_$timestamp.sql"

Write-Host "Creating n8n PostgreSQL backup at $backupFile"
$dbUser = if ($env:N8N_DB_USER) { $env:N8N_DB_USER } else { "n8n" }
$dbName = if ($env:N8N_DB_NAME) { $env:N8N_DB_NAME } else { "n8n" }
docker compose exec -T n8n-postgres pg_dump -U $dbUser $dbName > $backupFile
Write-Host "n8n backup created in ignored backups/ directory."
Write-Host "No credentials were printed."
