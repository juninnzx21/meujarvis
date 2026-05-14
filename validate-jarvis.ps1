$ErrorActionPreference = "Stop"
$Root = "E:\jarvis-home-assistant"
Set-Location $Root

docker compose ps
Test-NetConnection localhost -Port 5432

Set-Location "$Root\backend"
npm audit --omit=dev
npx prisma generate
npx prisma validate
npx prisma migrate dev
npx prisma db seed
npm run test
npm run validate

Set-Location "$Root\frontend"
npm audit --omit=dev
npm run test
npm run validate

Set-Location $Root
Write-Host "Scheduler validation: backend tests cover disabled mode, scheduled routines, reminders and duplicate prevention."
Write-Host "Validation completed."
