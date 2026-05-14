# Setup PostgreSQL no Windows

Este projeto precisa de PostgreSQL ativo para validar login, seed, chat, memorias, tarefas, automacoes e logs.

Na auditoria de 14/05/2026:

- `docker` nao estava no PATH.
- `psql` nao estava no PATH.
- Nenhum servico Windows de PostgreSQL foi encontrado.
- `localhost:5432` nao respondeu.

## Opcao A: Docker Desktop

1. Instale o Docker Desktop:
   - https://www.docker.com/products/docker-desktop/

2. Reinicie o Windows se o instalador solicitar.

3. Abra o Docker Desktop e aguarde o status ficar running.

4. No PowerShell, valide:

```powershell
docker --version
docker compose version
```

5. Suba o PostgreSQL do projeto:

```powershell
cd E:\jarvis-home-assistant
copy .env.example .env
docker compose up -d postgres
```

6. Aguarde e confirme a porta:

```powershell
Test-NetConnection localhost -Port 5432
docker compose ps
```

7. Rode migrations e seed:

```powershell
cd E:\jarvis-home-assistant\backend
npx prisma generate
npx prisma migrate dev --name final_validation
npx prisma db seed
```

8. Suba o backend:

```powershell
npm run dev
```

9. Em outro terminal, suba o frontend:

```powershell
cd E:\jarvis-home-assistant\frontend
npm run dev
```

## Opcao B: PostgreSQL local sem Docker

1. Instale PostgreSQL 16 ou superior:
   - https://www.postgresql.org/download/windows/

2. Durante a instalacao, defina uma senha para o usuario `postgres`.

3. Abra o PowerShell e valide:

```powershell
psql --version
Get-Service | Where-Object { $_.Name -match 'postgres|pgsql|postgresql' -or $_.DisplayName -match 'postgres|pgsql|postgresql' }
Test-NetConnection localhost -Port 5432
```

4. Crie o usuario e banco do JARVIS:

```powershell
psql -U postgres
```

Dentro do prompt do `psql`:

```sql
CREATE USER jarvis WITH PASSWORD 'jarvis_password';
CREATE DATABASE jarvis_db OWNER jarvis;
GRANT ALL PRIVILEGES ON DATABASE jarvis_db TO jarvis;
\q
```

5. Garanta que `backend\.env` tenha:

```env
DATABASE_URL=postgresql://jarvis:jarvis_password@localhost:5432/jarvis_db?schema=public
```

6. Rode:

```powershell
cd E:\jarvis-home-assistant\backend
npx prisma generate
npx prisma migrate dev --name final_validation
npx prisma db seed
npm run dev
```

7. Em outro terminal:

```powershell
cd E:\jarvis-home-assistant\frontend
npm run dev
```

## Login esperado apos seed

- Email: `admin@jarvis.local`
- Senha: `12345678`

## Checklist para aprovar

```powershell
Test-NetConnection localhost -Port 5432
cd E:\jarvis-home-assistant\backend
npx prisma migrate dev --name final_validation
npx prisma db seed
npm run validate
npm run dev
```

Depois acesse `http://localhost:5173` e faca login demo.


