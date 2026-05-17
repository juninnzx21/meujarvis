# Proximo Deploy do JARVIS Home AI

Data: 2026-05-16 16:29:54 -03:00

Diretorio local validado: `E:\jarvis-home-assistant`

Repositorio: `https://github.com/juninnzx21/meujarvis.git`

Branch: `main`

Commit base local validado antes deste guia: `b09a7d6 test: run full jarvis system validation`

Frontend producao: `https://jarvis.juninnzxtec.com.br`

API publica oficial: `https://apijarvis.juninnzxtec.com.br/api`

Webhook WhatsApp/Evolution: `https://apijarvis.juninnzxtec.com.br/api/whatsapp/webhook`

## Status da validacao local

- Backend: `npm install`, `npm audit --omit=dev`, Prisma generate/validate/migrate status, `npm run test`, `npm run validate` e `npm run build` passaram.
- Frontend: `npm install`, `npm audit --omit=dev`, `npm run test`, `npm run validate` e `npm run build` passaram.
- PostgreSQL local: healthy em `127.0.0.1:5432`.
- Scripts: `status-jarvis.ps1`, `validate-jarvis.ps1` e `backup-jarvis.ps1` executados. Backend/frontend locais podem aparecer offline no status quando os dev servers nao estiverem iniciados.
- Producao atual: `apijarvis` respondeu `/api/health` e `/api/health/full`; `jarvis` respondeu HTML do frontend.

## Deploy backend/API na VPS

Execute na VPS, sem imprimir `.env`:

```bash
cd /opt/jarvis-home-assistant
git pull origin main
git log --oneline -n 5
docker compose ps
docker compose up -d --build backend n8n n8n-postgres
docker compose exec backend npx prisma migrate deploy
docker compose exec backend npx prisma generate
docker compose ps
docker compose logs --tail=100 backend
docker compose logs --tail=100 n8n
curl -fsS https://apijarvis.juninnzxtec.com.br/api/health
curl -fsS https://apijarvis.juninnzxtec.com.br/api/health/public
curl -fsS https://apijarvis.juninnzxtec.com.br/api/health/full
curl -I https://n8njarvis.juninnzxtec.com.br
```

Se houver migrations novas em uma fase futura, validar antes de aplicar:

```bash
docker compose exec backend npx prisma migrate status
docker compose exec backend npx prisma migrate deploy
docker compose exec backend npx prisma generate
```

Nao execute restore em producao sem backup validado e confirmacao explicita.

## Publicacao do frontend na Fabweb

No Windows local:

```powershell
Set-Location E:\jarvis-home-assistant\frontend
$env:VITE_API_URL="https://apijarvis.juninnzxtec.com.br/api"
npm install
npm run build
```

Depois envie o conteudo de `E:\jarvis-home-assistant\frontend\dist` para o destino de producao do frontend na Fabweb/DirectAdmin, conforme o processo atual do dominio `jarvis.juninnzxtec.com.br`.

Nao envie `.env`, `node_modules`, backups, dumps, `storage/imports` ou arquivos de extrato.

## Validacao pos-deploy

```bash
curl -I https://jarvis.juninnzxtec.com.br
curl -fsS https://apijarvis.juninnzxtec.com.br/api/health
curl -fsS https://apijarvis.juninnzxtec.com.br/api/health/full
```

No navegador:

- Abrir `https://jarvis.juninnzxtec.com.br`.
- Confirmar login.
- Abrir `/status`.
- Abrir `/whatsapp`.
- Confirmar que o webhook exibido e `https://apijarvis.juninnzxtec.com.br/api/whatsapp/webhook`.

## Evolution API / WhatsApp

Configure no painel JARVIS:

- Evolution API URL.
- Instance.
- API Key.
- Auto reply desligado inicialmente.

Configure no manager da Evolution:

```text
https://apijarvis.juninnzxtec.com.br/api/whatsapp/webhook
```

Eventos sugeridos:

- mensagens recebidas;
- documentos/anexos recebidos;
- audio recebido, se for testar audio.

Testes seguros:

```text
ei jarvis status do sistema
ei jarvis quais tarefas tenho hoje?
ei jarvis entrada pix recebido R$ 120,00 cliente Joao
ei jarvis importar esse extrato do Inter
```

OFX e o formato recomendado para extratos. CSV e fallback confiavel. PDF deve ser usado apenas para conferencia. OFX/CSV pelo WhatsApp devem criar previa em `/finance/import/:id/review`, nunca importacao direta.

## Pendencias reais

- Confirmar deploy remoto do commit atual na VPS/Fabweb.
- Inserir credenciais reais da Evolution API no painel, sem expor valores.
- Validar mensagem real no WhatsApp com `ei jarvis`.
- Enviar OFX/CSV real e confirmar criacao de previa de importacao.
- Manter n8n e Home Assistant como `not_configured` ate credenciais reais serem configuradas.

## Deploy Fase 10 - n8n e plataforma

Na VPS, apos puxar o commit da Fase 10:

```bash
cd /opt/jarvis-home-assistant
git pull origin main
docker compose config --quiet
docker compose up -d --build backend n8n-postgres n8n
docker compose ps
docker compose logs --tail=100 backend
docker compose logs --tail=100 n8n
curl -fsS https://apijarvis.juninnzxtec.com.br/api/health
curl -fsS https://apijarvis.juninnzxtec.com.br/api/health/full
```

Antes de expor n8n publicamente, preencher no `.env` da VPS sem imprimir valores:

- `N8N_ENCRYPTION_KEY`
- `N8N_BASIC_AUTH_USER`
- `N8N_BASIC_AUTH_PASSWORD`
- `N8N_EDITOR_BASE_URL`
- `WEBHOOK_URL`
- `N8N_DB_PASSWORD`

Se o subdominio `n8njarvis.juninnzxtec.com.br` ainda nao estiver no Caddy/DNS, manter o n8n apenas em `127.0.0.1:15678` e acessar por tunel SSH ou configurar o proxy depois. Nao publicar n8n sem HTTPS e autenticacao.

Validacao adicional:

```bash
curl -I http://127.0.0.1:15678
docker compose exec backend npm run test
```

Depois importar manualmente os JSON de `n8n/workflows/` e configurar credenciais no proprio n8n, nunca no Git.

## Deploy da Central de Integracoes

Apos deploy, validar:

```bash
curl -fsS https://apijarvis.juninnzxtec.com.br/api/health/full
```

No painel:

- Abrir `/integrations`.
- Abrir `/settings/integrations`.
- Confirmar API publica `https://apijarvis.juninnzxtec.com.br/api`.
- Confirmar webhook `https://apijarvis.juninnzxtec.com.br/api/whatsapp/webhook`.
- Confirmar n8n publico `https://n8njarvis.juninnzxtec.com.br`.
- Testar providers sem expor credenciais.

## Caddy esperado para n8n

```caddy
n8njarvis.juninnzxtec.com.br {
    reverse_proxy 127.0.0.1:15678
}
```

Validar e recarregar:

```bash
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

## Deploy Fase Suprema

Depois de publicar o commit da Fase Suprema, validar no painel:

- `/brain`
- `/brain/agents`
- `/brain/tools`
- `/brain/feedback`
- `/voice`
- `/jarvis-mode`
- `/settings/voice`
- `/integrations/setup-wizard`
- `/whatsapp`
- `/n8n`
- `/finance/import`

Ressalva: nao publicar n8n sem `N8N_ENCRYPTION_KEY`, Basic Auth e HTTPS funcionando.
