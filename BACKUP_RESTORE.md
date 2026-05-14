# Backup e restore

Backups ficam em `E:\jarvis-home-assistant\backups`.

## Criar backup

```powershell
cd E:\jarvis-home-assistant
powershell -ExecutionPolicy Bypass -File .\backup-jarvis.ps1
```

O script usa `docker exec jarvis-postgres pg_dump -U jarvis -d jarvis_db` e gera um arquivo como:

```text
backups\jarvis_db_20260514_140000.sql
```

## Restaurar

```powershell
cd E:\jarvis-home-assistant
powershell -ExecutionPolicy Bypass -File .\restore-jarvis.ps1 -BackupFile .\backups\jarvis_db_YYYYMMDD_HHMMSS.sql
```

O restore exige digitar `RESTORE` antes de apagar e recriar o schema `public`.

## Cuidados

- Nunca restaure sem backup recente.
- O restore substitui os dados atuais.
- Arquivos de backup podem conter dados pessoais; proteja a pasta `backups`.
