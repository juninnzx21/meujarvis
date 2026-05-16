# Monitoramento basico do JARVIS

## URLs oficiais

- Frontend: `https://jarvis.juninnzxtec.com.br`
- API publica oficial: `https://apijarvis.juninnzxtec.com.br/api`
- Health: `https://apijarvis.juninnzxtec.com.br/api/health`
- Health publico minimo: `https://apijarvis.juninnzxtec.com.br/api/health/public`
- Health completo operacional: `https://apijarvis.juninnzxtec.com.br/api/health/full`

## Frequencia sugerida

- Frontend: a cada 5 minutos.
- `/api/health`: a cada 1 minuto.
- `/api/health/public`: a cada 1 minuto para monitor externo.
- `/api/health/full`: a cada 5 minutos ou sob demanda, pois retorna mais detalhes operacionais.

## Alertas

Configurar alertas por e-mail, Telegram, Discord ou WhatsApp via n8n quando:

- Frontend nao responder HTTP 200.
- `app` diferente de `ok`.
- `database` diferente de `ok`.
- Scheduler habilitado e parado.
- `scheduler.lastError` preenchido por mais de um ciclo.
- Certificado HTTPS perto de expirar.

## Comandos de verificacao na VPS

```bash
curl -fsS https://apijarvis.juninnzxtec.com.br/api/health
curl -fsS https://apijarvis.juninnzxtec.com.br/api/health/public
docker compose ps
docker compose logs --tail=100 backend
systemctl status caddy --no-pager
caddy validate --config /etc/caddy/Caddyfile
```

## Certificado HTTPS

```bash
echo | openssl s_client -servername apijarvis.juninnzxtec.com.br -connect apijarvis.juninnzxtec.com.br:443 2>/dev/null | openssl x509 -noout -dates
```

## Observacao

`https://jarvis.juninnzxtec.com.br/api/*` nao e a API oficial. O frontend estatico da Fabweb consome `https://apijarvis.juninnzxtec.com.br/api`.

## n8n monitor

Importe `n8n/workflows/jarvis-health-monitor.json` no n8n para checar `https://apijarvis.juninnzxtec.com.br/api/health/full` periodicamente. Configure alertas somente com credenciais reais dentro do n8n, nunca nos JSON versionados.
