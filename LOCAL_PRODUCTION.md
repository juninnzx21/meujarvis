# Producao local

Use estes scripts no PowerShell a partir de `E:\jarvis-home-assistant`.

## Iniciar

```powershell
powershell -ExecutionPolicy Bypass -File .\start-jarvis.ps1
```

O script sobe PostgreSQL, aplica migrations com `prisma migrate deploy` e inicia backend/frontend em janelas ocultas.

## Parar

```powershell
powershell -ExecutionPolicy Bypass -File .\stop-jarvis.ps1
```

O script para processos Node do projeto. O PostgreSQL fica ativo por seguranca.

## Status

```powershell
powershell -ExecutionPolicy Bypass -File .\status-jarvis.ps1
```

Mostra containers, portas, health full do backend e HTTP do frontend.

## Validacao

```powershell
powershell -ExecutionPolicy Bypass -File .\validate-jarvis.ps1
```

Roda audit, Prisma, testes, typecheck e build em backend/frontend.
