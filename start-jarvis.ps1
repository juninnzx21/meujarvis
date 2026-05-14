$ErrorActionPreference = "Stop"
$Root = "E:\jarvis-home-assistant"
Set-Location $Root

Write-Host "Starting JARVIS Home AI in local production mode..."
docker compose up -d postgres

Set-Location "$Root\backend"
npx prisma generate
npx prisma migrate deploy

Start-Process -FilePath "cmd.exe" -ArgumentList "/c", "npm run dev" -WorkingDirectory "$Root\backend" -WindowStyle Hidden
Start-Process -FilePath "cmd.exe" -ArgumentList "/c", "npm run dev -- --host 0.0.0.0" -WorkingDirectory "$Root\frontend" -WindowStyle Hidden

Start-Sleep -Seconds 8
Set-Location $Root
powershell -ExecutionPolicy Bypass -File "$Root\status-jarvis.ps1"
