$ErrorActionPreference = "Stop"
$Root = "E:\jarvis-home-assistant"
$BackupDir = "$Root\backups"
Set-Location $Root
New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupFile = "$BackupDir\jarvis_db_$timestamp.sql"

Write-Host "Creating PostgreSQL backup at $backupFile"
docker exec jarvis-postgres pg_dump -U jarvis -d jarvis_db --no-owner --no-privileges | Set-Content -LiteralPath $backupFile -Encoding UTF8

if ((Test-Path $backupFile) -and ((Get-Item $backupFile).Length -gt 0)) {
  Write-Host "Backup created: $backupFile"
} else {
  throw "Backup file was not created or is empty."
}
