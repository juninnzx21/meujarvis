# SYSTEM STATUS REPORT

## Data/hora

2026-05-14 15:50:00 -03:00

## Diretorio

`E:\jarvis-home-assistant`

## Git

- Branch: `main`
- Remoto: `https://github.com/juninnzx21/meujarvis.git`
- Repositorio publico informado pelo usuario.
- Status local revisado antes do commit de hardening.

## Producao

- Painel: `https://jarvis.juninnzxtec.com.br`
- API dedicada: `https://apijarvis.juninnzxtec.com.br/api`
- Frontend: Fabweb/DirectAdmin em `domains/jarvis.juninnzxtec.com.br/public_html`.
- API/backend/banco: VPS Ubuntu 24.04, Docker Compose e Caddy.

## Validacao

| Item | Resultado |
| --- | --- |
| Frontend Fabweb HTTPS | OK, `HTTP 200`, entregando `JARVIS Home AI` |
| React Router na Fabweb | OK, `.htaccess` validado em `/login` |
| API health | OK |
| API full health | OK |
| Banco | OK |
| Scheduler | OK, ativo e sem erro |
| n8n fallback | OK, `not_configured` |
| WhatsApp fallback | OK, `not_configured` |
| Home Assistant fallback | OK, `not_configured` |
| Docker Compose | OK |
| Postgres container | OK, healthy |
| Caddy | OK, active |
| Webmail | OK em verificacao anterior |
| Login frontend Fabweb | OK |
| Chat API dedicada | OK, conversa persistida |
| Proxy temporario apijarvis Fabweb | OK, preflight CORS e login encaminhados para VPS |
| Configuracao WhatsApp/Evolution pelo painel | OK, CRUD seguro sem expor API key |

## Portas

Publicas:

- `22/tcp`
- `80/tcp`
- `443/tcp`

JARVIS internas:

- Backend: `127.0.0.1:13001`
- PostgreSQL: `127.0.0.1:15432`

Observacao: UFW tambem mostra `5678` e `8081` abertos. Revisar antes de remover porque podem pertencer a outros servicos.

## Hardening aplicado

- `restart: unless-stopped` no Docker Compose.
- Documentacao de hardening criada.
- Checklist de rotacao criado.
- Backup/restore documentado.
- SSH seguro documentado, mas nao aplicado automaticamente para nao arriscar lockout.

## Pendencias

- Rotacionar segredos compartilhados.
- Criar usuario `deploy` com chave SSH.
- Desabilitar login root por senha apos validar chave.
- Revisar portas UFW extras.
- Aguardar cache DNS residual do `apijarvis` em resolvedores locais, se aparecer.
- DNS esperado: `jarvis -> 166.0.186.20` e `apijarvis -> 45.76.251.177`.
- Remover proxy temporario de `apijarvis` na Fabweb quando nao houver mais cache DNS antigo.
- Banco MySQL/MariaDB da Fabweb recebido nao foi aplicado ao JARVIS porque a aplicacao usa PostgreSQL. Ver `DATABASE_MIGRATION_PLAN.md`.

## Resultado

APROVADO COM PENDENCIAS OPERACIONAIS DE HARDENING.
