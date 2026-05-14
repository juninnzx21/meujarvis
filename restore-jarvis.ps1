param(
  [Parameter(Mandatory=$true)]
  [string]$BackupFile
)

$ErrorActionPreference = "Stop"
$Root = "E:\jarvis-home-assistant"
Set-Location $Root

if (!(Test-Path -LiteralPath $BackupFile)) {
  throw "Backup file not found: $BackupFile"
}

Write-Host "You are about to restore JARVIS database from:"
Write-Host $BackupFile
$confirmation = Read-Host "Type RESTORE to continue"
if ($confirmation -ne "RESTORE") {
  Write-Host "Restore cancelled."
  exit 1
}

Write-Host "Dropping and recreating public schema..."
docker exec -i jarvis-postgres psql -U jarvis -d jarvis_db -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

Write-Host "Restoring backup..."
Get-Content -Raw -LiteralPath $BackupFile | docker exec -i jarvis-postgres psql -U jarvis -d jarvis_db
Write-Host "Restore completed."
