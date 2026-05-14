# DEPLOYMENT STATUS REPORT

## Data/hora

2026-05-14 15:10:00 -03:00

## Dominio

`https://jarvis.juninnzxtec.com.br`

## Infra usada

- VPS Ubuntu 24.04
- Docker Compose
- Caddy como reverse proxy HTTPS
- PostgreSQL em container
- Backend em container
- Frontend em container

## DNS

- Nameservers do dominio conferidos: `ns1-da5.srvhr.com.br` e `ns2-da5.srvhr.com.br`.
- A record `jarvis.juninnzxtec.com.br` atualizado no DirectAdmin para a VPS.
- Webmail mantido na hospedagem compartilhada.
- MX do dominio aponta para `mail.juninnzxtec.com.br`.

## Portas na VPS

- Backend: `127.0.0.1:13001 -> 3001`
- Frontend: `127.0.0.1:15173 -> 5173`
- PostgreSQL: `127.0.0.1:15432 -> 5432`
- Publico: Caddy em `80/443`

## Caddy

Roteamento:

- `/api/*` -> backend
- restante -> frontend

## Validacao

- Frontend HTTPS respondeu `HTTP 200`.
- API health respondeu `app=ok` e `database=ok`.
- Scheduler respondeu `enabled=true`, `running=true`, `lastError=null`.
- Login demo validado via API.
- Fallbacks n8n, WhatsApp e Home Assistant retornam `not_configured`.
- Webmail respondeu `HTTP 200`.

## Observacoes

- Credenciais reais ficam somente em `.env` remoto/local e nao foram versionadas.
- O GitHub nao recebeu `.env`, backups, `node_modules`, `dist` ou dumps.
- O resolvedor local pode manter cache antigo de DNS por ate o TTL da zona. O nameserver autoritativo ja responde o IP novo.

## Status

APROVADO.
