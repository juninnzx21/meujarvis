Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$Root = "E:\jarvis-home-assistant"
$BackupDir = Join-Path $Root "backups"

Write-Host "JARVIS offsite backup planner"
if (-not (Test-Path $BackupDir)) {
  Write-Host "Nenhum diretorio de backup local encontrado. Rode .\backup-jarvis.ps1 primeiro."
  exit 1
}

$latest = Get-ChildItem $BackupDir -Filter "*.sql" -File | Sort-Object LastWriteTime -Descending | Select-Object -First 1
if (-not $latest) {
  Write-Host "Nenhum backup SQL local encontrado. Rode .\backup-jarvis.ps1 primeiro."
  exit 1
}

Write-Host "Backup local mais recente encontrado:"
Write-Host $latest.FullName
Write-Host ""
Write-Host "Proximo passo manual seguro:"
Write-Host "1. Criptografar o arquivo antes de enviar para offsite."
Write-Host "2. Enviar para S3/Google Drive/outro VPS via canal seguro."
Write-Host "3. Registrar data, tamanho e hash."
Write-Host "Este script nao envia arquivos automaticamente nesta fase."
