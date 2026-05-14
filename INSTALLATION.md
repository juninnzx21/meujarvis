# Instalacao

## Windows PowerShell

Pre-requisitos:

- Docker Desktop rodando, ou PostgreSQL 16+ local em `localhost:5432`.
- Node.js e npm no PATH.

```powershell
cd E:\jarvis-home-assistant
copy .env.example .env
copy backend\.env.example backend\.env
docker compose up -d postgres
docker compose ps
Test-NetConnection localhost -Port 5432
```

Backend:

```powershell
cd E:\jarvis-home-assistant\backend
npm install
npm audit --omit=dev
npx prisma generate
npx prisma validate
npx prisma migrate dev
npx prisma db seed
npm run validate
npm run dev
```

Frontend:

```powershell
cd E:\jarvis-home-assistant\frontend
npm install
npm audit --omit=dev
npm run validate
npm run dev
```

Acesse:

- http://localhost:5173
- http://localhost:3001/api/health

## Docker completo

```powershell
cd E:\jarvis-home-assistant
copy .env.example .env
docker compose up -d
docker compose exec backend npx prisma migrate deploy
docker compose exec backend npx prisma db seed
```

## Linux

```bash
cd /path/to/jarvis-home-assistant
cp .env.example .env
cp backend/.env.example backend/.env
docker compose up -d postgres

cd backend
npm install
npx prisma generate
npx prisma validate
npx prisma migrate dev
npx prisma db seed
npm run validate
npm run dev
```

Em outro terminal:

```bash
cd /path/to/jarvis-home-assistant/frontend
npm install
npm run validate
npm run dev
```

## Sem Docker

Instale PostgreSQL 16+, crie:

- Database: `jarvis_db`
- Usuario: `jarvis`
- Senha: `jarvis_password`

Use:

```text
postgresql://jarvis:jarvis_password@localhost:5432/jarvis_db?schema=public
```

Depois rode migrations, seed e validacao no backend.

## Problema comum no Windows

Se `npx prisma generate` falhar com `EPERM` ao renomear `query_engine-windows.dll.node`, encerre processos Node antigos do projeto e rode novamente:

```powershell
Get-CimInstance Win32_Process |
  Where-Object { $_.Name -match 'node|tsx|vite' -and $_.CommandLine -like '*E:\jarvis-home-assistant*' } |
  ForEach-Object { Stop-Process -Id $_.ProcessId -Force }

cd E:\jarvis-home-assistant\backend
npx prisma generate
```

## Producao local

Depois da instalacao, use:

```powershell
cd E:\jarvis-home-assistant
powershell -ExecutionPolicy Bypass -File .\start-jarvis.ps1
```

Para status, parada, backup e validacao:

```powershell
powershell -ExecutionPolicy Bypass -File .\status-jarvis.ps1
powershell -ExecutionPolicy Bypass -File .\stop-jarvis.ps1
powershell -ExecutionPolicy Bypass -File .\backup-jarvis.ps1
powershell -ExecutionPolicy Bypass -File .\validate-jarvis.ps1
```
