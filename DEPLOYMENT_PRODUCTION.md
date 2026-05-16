# Deploy de producao

## API publica oficial

Frontend: `https://jarvis.juninnzxtec.com.br`

API: `https://apijarvis.juninnzxtec.com.br/api`

Decisao operacional: enquanto o frontend estiver servido fora do mesmo roteamento Caddy da API, o dominio principal `jarvis.juninnzxtec.com.br/api/*` pode retornar HTML do frontend. Use `apijarvis` no `VITE_API_URL` de producao.

Webhook WhatsApp/Evolution:

`https://apijarvis.juninnzxtec.com.br/api/whatsapp/webhook`

## Dominio

- Aplicacao: `https://jarvis.juninnzxtec.com.br`
- API publica oficial: `https://apijarvis.juninnzxtec.com.br/api`
- DNS: A record `jarvis` apontando para a Fabweb (`166.0.186.20`).
  A record `apijarvis` apontando para a VPS (`45.76.251.177`).

## Arquitetura

- Frontend estatico publicado na Fabweb em `domains/jarvis.juninnzxtec.com.br/public_html`.
- O build do frontend usa `VITE_API_URL=https://apijarvis.juninnzxtec.com.br/api`.
- Caddy na VPS publica HTTPS para `apijarvis.juninnzxtec.com.br` apontando diretamente para o backend.
- Docker Compose na VPS roda PostgreSQL e backend. O frontend em container pode existir para validacao/rollback, mas a URL publica oficial do app usa a Fabweb.
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
- `SETTINGS_ENCRYPTION_KEY`
- `ALLOW_DEMO_LOGIN=false`
- `BACKEND_HOST_PORT`
- `POSTGRES_HOST_PORT`

No build local do frontend para Fabweb:

- `VITE_API_URL=https://apijarvis.juninnzxtec.com.br/api`

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
curl https://apijarvis.juninnzxtec.com.br/api/health
curl https://apijarvis.juninnzxtec.com.br/api/health/public
curl https://apijarvis.juninnzxtec.com.br/api/health/full
```

Observacao operacional: `https://jarvis.juninnzxtec.com.br/api/*` nao e a rota oficial da API. O frontend publico deve ser buildado com `VITE_API_URL=https://apijarvis.juninnzxtec.com.br/api`.

## Admin real de producao

Em producao, mantenha `ALLOW_DEMO_LOGIN=false`. Para criar ou atualizar um administrador real:

```bash
cd /opt/jarvis-home-assistant/backend
npm run create:admin
```

## n8n em producao

Planejado para `https://n8njarvis.juninnzxtec.com.br` com Caddy apontando para `127.0.0.1:15678`.

Obrigatorio:

- Basic Auth ativo.
- `N8N_ENCRYPTION_KEY` forte.
- `WEBHOOK_URL` e `N8N_EDITOR_BASE_URL` com HTTPS.
- Porta 15678 nao publica diretamente.

Nao salve a senha em arquivo. Use esse comando apenas em sessao segura e depois limpe o historico se necessario.

## Publicacao do frontend na Fabweb

```powershell
Set-Location E:\jarvis-home-assistant\frontend
$env:VITE_API_URL="https://apijarvis.juninnzxtec.com.br/api"
npm run build
```

Enviar o conteudo de `frontend\dist` para:

`domains/jarvis.juninnzxtec.com.br/public_html`

## Proxy temporario de API na Fabweb

Enquanto alguns resolvedores ainda entregarem `apijarvis -> 166.0.186.20`, a pasta abaixo na Fabweb possui um proxy PHP minimo que encaminha `/api/*` para a VPS:

`domains/apijarvis.juninnzxtec.com.br/public_html`

Arquivos-fonte:

`deploy/fabweb-apijarvis-proxy`

Esse proxy existe apenas para absorver cache DNS antigo e evitar erro de CORS no navegador. Quando todos os resolvedores estiverem apontando `apijarvis -> 45.76.251.177`, ele pode ser removido da hospedagem se desejado.

## Hardening

Consulte `PRODUCTION_SECURITY_HARDENING.md` antes de alterar SSH, firewall, senhas ou tokens.
