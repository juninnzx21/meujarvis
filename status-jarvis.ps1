$ErrorActionPreference = "Continue"
$Root = "E:\jarvis-home-assistant"
Set-Location $Root

Write-Host "JARVIS Home AI status"
docker compose ps

Write-Host "`nPorts:"
Get-NetTCPConnection -LocalPort 5432,3001,5173 -ErrorAction SilentlyContinue |
  Select-Object LocalAddress,LocalPort,State,OwningProcess |
  Format-Table -AutoSize

Write-Host "`nBackend health:"
try {
  $health = Invoke-RestMethod "http://localhost:3001/api/health/full"
  $health | ConvertTo-Json -Depth 8
  if ($health.scheduler) {
    Write-Host "Scheduler: enabled=$($health.scheduler.enabled) running=$($health.scheduler.running) intervalSeconds=$($health.scheduler.intervalSeconds)"
  }
} catch {
  Write-Host "Backend health unavailable: $($_.Exception.Message)"
}

Write-Host "`nFrontend:"
try {
  $statusCode = (Invoke-WebRequest "http://localhost:5173" -UseBasicParsing).StatusCode
  Write-Host "Frontend HTTP $statusCode"
} catch {
  Write-Host "Frontend unavailable: $($_.Exception.Message)"
}
