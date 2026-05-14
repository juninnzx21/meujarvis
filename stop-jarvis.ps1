$ErrorActionPreference = "Continue"
$Root = "E:\jarvis-home-assistant"
Set-Location $Root

Get-CimInstance Win32_Process |
  Where-Object {
    $_.Name -match "node|tsx|vite|cmd" -and
    $_.CommandLine -like "*E:\jarvis-home-assistant*" -and
    $_.CommandLine -notlike "*Codex*kernel.js*"
  } |
  ForEach-Object {
    Write-Host "Stopping process $($_.ProcessId) $($_.Name)"
    Stop-Process -Id $_.ProcessId -Force
  }

docker compose stop backend frontend 2>$null
Write-Host "JARVIS app processes stopped. PostgreSQL container was left running for safety."
