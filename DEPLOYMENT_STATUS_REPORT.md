# DEPLOYMENT STATUS REPORT

## Data/hora

2026-05-14 15:50:00 -03:00

## Dominio

`https://jarvis.juninnzxtec.com.br`

API dedicada:

`https://apijarvis.juninnzxtec.com.br/api`

## Infra usada

- Hospedagem Fabweb/DirectAdmin para frontend estatico
- VPS Ubuntu 24.04 para API, backend e banco
- Docker Compose na VPS
- Caddy como reverse proxy HTTPS da API
- PostgreSQL em container
- Backend em container
- Frontend estatico em `domains/jarvis.juninnzxtec.com.br/public_html`

## DNS

- Nameservers do dominio conferidos: `ns1-da5.srvhr.com.br` e `ns2-da5.srvhr.com.br`.
- A record `jarvis.juninnzxtec.com.br` atualizado no DirectAdmin para a Fabweb (`166.0.186.20`).
- A record `apijarvis.juninnzxtec.com.br` atualizado no DirectAdmin para a VPS.
- Webmail mantido na hospedagem compartilhada.
- MX do dominio aponta para `mail.juninnzxtec.com.br`.

## Portas na VPS

- Backend: `127.0.0.1:13001 -> 3001`
- PostgreSQL: `127.0.0.1:15432 -> 5432`
- Publico: Caddy em `80/443`
- Containers com `restart: unless-stopped`.

## Caddy

Roteamento:

- `apijarvis.juninnzxtec.com.br` -> backend

O dominio `jarvis.juninnzxtec.com.br` nao usa mais Caddy como rota publica oficial. Ele serve o build estatico pela Fabweb e consome a API em `https://apijarvis.juninnzxtec.com.br/api`.

## Validacao

- Frontend Fabweb respondeu `HTTP 200` e entregou `JARVIS Home AI`.
- Rota SPA `/login` respondeu `HTTP 200` via `.htaccess`.
- Asset JavaScript publicado contem `https://apijarvis.juninnzxtec.com.br/api`.
- Proxy temporario na Fabweb para `apijarvis` respondeu preflight CORS e encaminhou login para a VPS quando o dominio resolve para `166.0.186.20`.
- API health respondeu `app=ok` e `database=ok`.
- API full health respondeu sem falhas recentes.
- Scheduler respondeu `enabled=true`, `running=true`, `lastError=null`.
- Login demo validado pelo frontend publicado na Fabweb.
- Chat validado via API dedicada com conversa persistida.
- Fallbacks n8n, WhatsApp e Home Assistant retornam `not_configured`.
- Webmail respondeu `HTTP 200`.
- `jarvis` respondeu no DNS da Fabweb com IP da hospedagem.
- `apijarvis` respondeu no nameserver autoritativo com o IP da VPS.

## Observacoes

- Credenciais reais ficam somente em `.env` remoto/local e nao foram versionadas.
- O GitHub nao recebeu `.env`, backups, `node_modules`, `dist` ou dumps.
- O resolvedor local pode manter cache antigo de DNS por ate o TTL da zona.
- Resultado esperado de DNS: `jarvis -> 166.0.186.20` e `apijarvis -> 45.76.251.177`.
- Se o navegador ainda mostrar pagina reservada ou API 404, limpar cache DNS/navegador e aguardar TTL.
- Enquanto houver cache DNS antigo, o proxy PHP em `domains/apijarvis.juninnzxtec.com.br/public_html` evita bloqueio de CORS para `/api/*`.
- UFW esta ativo. Portas `22`, `80` e `443` estao abertas. Portas extras `5678` e `8081` aparecem abertas e devem ser revisadas antes de qualquer remocao por poderem pertencer a outros servicos.

## Status

APROVADO.
