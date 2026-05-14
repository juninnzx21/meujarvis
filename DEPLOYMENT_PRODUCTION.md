# Deploy de producao

## Dominio

- Aplicacao: `https://jarvis.juninnzxtec.com.br`
- DNS: A record `jarvis` apontando para a VPS.

## Arquitetura

- Caddy na VPS publica HTTPS.
- Caddy envia `/api/*` para `127.0.0.1:3001`.
- Caddy envia o restante para `127.0.0.1:5173`.
- Docker Compose roda PostgreSQL, backend e frontend.
- Portas Docker ficam presas em `127.0.0.1` para evitar exposicao direta.

## Variaveis obrigatorias no servidor

O arquivo `.env` fica somente na VPS e nunca deve ser commitado.

- `DATABASE_URL`
- `JWT_SECRET`
- `CORS_ORIGIN`
- `OPENAI_API_KEY`
- `GEMINI_API_KEY`
- `SCHEDULER_ENABLED`
- `SCHEDULER_INTERVAL_SECONDS`

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
```
