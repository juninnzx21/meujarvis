# Deploy de producao

## Dominio

- Aplicacao: `https://jarvis.juninnzxtec.com.br`
- API dedicada: `https://apijarvis.juninnzxtec.com.br/api`
- DNS: A record `jarvis` apontando para a VPS.
  A record `apijarvis` tambem deve apontar para a VPS.

## Arquitetura

- Caddy na VPS publica HTTPS.
- Caddy envia `/api/*` para `127.0.0.1:3001`.
- Caddy envia o restante para `127.0.0.1:5173`.
- Caddy tambem publica `apijarvis.juninnzxtec.com.br` apontando diretamente para o backend.
- Docker Compose roda PostgreSQL, backend e frontend.
- Portas Docker ficam presas em `127.0.0.1` para evitar exposicao direta.
- Na VPS, use portas alternativas se `3001`, `5173` ou `5432` ja estiverem ocupadas.
- Containers usam `restart: unless-stopped`.

## Variaveis obrigatorias no servidor

O arquivo `.env` fica somente na VPS e nunca deve ser commitado.

- `DATABASE_URL`
- `JWT_SECRET`
- `CORS_ORIGIN`
- `OPENAI_API_KEY`
- `GEMINI_API_KEY`
- `SCHEDULER_ENABLED`
- `SCHEDULER_INTERVAL_SECONDS`
- `BACKEND_HOST_PORT`
- `FRONTEND_HOST_PORT`
- `POSTGRES_HOST_PORT`

## Comandos na VPS

```bash
cd /opt/jarvis-home-assistant
git pull origin main
docker compose up -d --build
docker compose exec backend npx prisma migrate deploy
docker compose exec backend npx prisma db seed
```

## Validacao

```bash
curl -I https://jarvis.juninnzxtec.com.br
curl https://jarvis.juninnzxtec.com.br/api/health
curl https://jarvis.juninnzxtec.com.br/api/health/full
curl https://apijarvis.juninnzxtec.com.br/api/health
```

## Hardening

Consulte `PRODUCTION_SECURITY_HARDENING.md` antes de alterar SSH, firewall, senhas ou tokens.
