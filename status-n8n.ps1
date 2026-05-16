Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root

Write-Host "JARVIS n8n status"
docker compose ps n8n-postgres n8n

$port = if ($env:N8N_HOST_PORT) { $env:N8N_HOST_PORT } else { "15678" }
try {
  $response = Invoke-WebRequest -Uri "http://127.0.0.1:$port" -UseBasicParsing -TimeoutSec 5
  Write-Host "n8n HTTP status: $($response.StatusCode)"
} catch {
  Write-Host "n8n HTTP unavailable: $($_.Exception.Message)"
}
