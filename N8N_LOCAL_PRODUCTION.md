# n8n proprio para o JARVIS

Data: 2026-05-16

Status: implementado localmente em Docker Compose e preparado para producao com ressalvas de DNS/credenciais.

## Servicos

O `docker-compose.yml` agora possui:

- `n8n-postgres`: banco separado do n8n.
- `n8n`: editor/runtime do n8n.

Portas locais:

- n8n: `127.0.0.1:15678`.
- PostgreSQL do n8n: `127.0.0.1:15433`.

As portas ficam presas em `127.0.0.1` para nao expor o servico diretamente na rede.

## Variaveis

Configure apenas em `.env`, nunca em arquivos versionados:

```env
N8N_HOST_PORT=15678
N8N_POSTGRES_HOST_PORT=15433
N8N_DB_NAME=n8n
N8N_DB_USER=n8n
N8N_DB_PASSWORD=
N8N_ENCRYPTION_KEY=
N8N_BASIC_AUTH_ACTIVE=true
N8N_BASIC_AUTH_USER=
N8N_BASIC_AUTH_PASSWORD=
N8N_EDITOR_BASE_URL=http://127.0.0.1:15678
WEBHOOK_URL=http://127.0.0.1:15678
```

`N8N_ENCRYPTION_KEY`, usuario e senha do Basic Auth devem ser valores fortes e nunca devem aparecer em logs, documentacao ou Git.

## Comandos locais

```powershell
Set-Location E:\jarvis-home-assistant
.\start-n8n.ps1
.\status-n8n.ps1
.\backup-n8n.ps1
.\stop-n8n.ps1
```

## Producao

Opcao recomendada:

- Subdominio: `https://n8njarvis.juninnzxtec.com.br`.
- Caddy faz proxy para `127.0.0.1:15678`.
- Basic Auth ativo.
- `WEBHOOK_URL=https://n8njarvis.juninnzxtec.com.br`.
- `N8N_EDITOR_BASE_URL=https://n8njarvis.juninnzxtec.com.br`.

Nunca publique a porta `5678` diretamente.

## Conectar JARVIS ao n8n

No painel JARVIS em `/integrations`, `/settings/integrations` ou `/n8n`:

1. Cole a Production URL do webhook n8n.
2. Cole API key/token se o workflow exigir.
3. Configure webhook secret opcional.
4. Clique em testar conexao.
5. Teste templates seguros.
6. Liste workflows locais e importe manualmente se a API do n8n nao estiver habilitada.

Segredos ficam criptografados em `Setting` e o frontend exibe apenas flags/mascaras.

## Backup

`backup-n8n.ps1` cria dump do banco do n8n em `backups/`, pasta ignorada pelo Git. Para producao, combine com backup offsite criptografado.

## Ressalvas

- O n8n local depende de `.env` com credenciais fortes.
- Producao depende de DNS/Caddy/SSL.
- Workflows JSON nao possuem credenciais reais; configure credenciais dentro do n8n.
