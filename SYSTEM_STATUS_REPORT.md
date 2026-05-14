# SYSTEM STATUS REPORT

## Data/hora

2026-05-14 15:20:00 -03:00

## Diretorio

`E:\jarvis-home-assistant`

## Git

- Branch: `main`
- Remoto: `https://github.com/juninnzx21/meujarvis.git`
- Repositorio publico informado pelo usuario.
- Status local revisado antes do commit de hardening.

## Producao

- Painel: `https://jarvis.juninnzxtec.com.br`
- API no painel: `https://jarvis.juninnzxtec.com.br/api`
- API dedicada: `https://apijarvis.juninnzxtec.com.br/api`
- VPS: Ubuntu 24.04, Docker Compose e Caddy.

## Validacao

| Item | Resultado |
| --- | --- |
| Frontend HTTPS | OK, `HTTP 200` |
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

## Portas

Publicas:

- `22/tcp`
- `80/tcp`
- `443/tcp`

JARVIS internas:

- Backend: `127.0.0.1:13001`
- Frontend: `127.0.0.1:15173`
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

## Resultado

APROVADO COM PENDENCIAS OPERACIONAIS DE HARDENING.
