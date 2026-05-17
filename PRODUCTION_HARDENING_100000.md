# Hardening 100000/10 do JARVIS

## VPS

- Criar usuario `deploy`.
- Usar SSH por chave.
- Desabilitar root por senha somente depois de validar acesso por chave.
- Manter sistema atualizado.
- UFW: liberar apenas 22, 80 e 443 publicamente.

## Docker

- Postgres, backend, frontend e n8n devem escutar em `127.0.0.1` ou rede Docker interna.
- Caddy deve ser o unico ponto publico HTTP/HTTPS.
- Nunca publicar 3001, 5173, 5432, 15433 ou 15678 diretamente.

## Caddy

- `jarvis.juninnzxtec.com.br` para frontend.
- `apijarvis.juninnzxtec.com.br` para backend `/api`.
- `n8njarvis.juninnzxtec.com.br` para n8n protegido.

## Segredos

- `.env` nunca entra no Git.
- Tokens em `Setting` usam criptografia.
- Rotacionar segredos ja compartilhados fora do repositorio.
- Logs sempre redigidos.

## n8n

- Basic Auth obrigatorio.
- `N8N_ENCRYPTION_KEY` obrigatoria.
- Credenciais reais so dentro do n8n ou `.env`.
- Workflows JSON versionados nao podem conter credenciais.

## Evolution/WhatsApp

- Exigir `ei jarvis`.
- Ignorar `fromMe`.
- Ignorar grupos por padrao.
- Bloquear envio em massa.
- Confirmar acoes sensiveis.

## Financeiro e documentos

- Extrato sempre exige revisao.
- OFX/CSV nunca importam direto pelo WhatsApp.
- Documentos sensiveis nao vao para IA externa sem consentimento.
- Uploads ficam fora do Git.

## Backup

- Backup local em `backups/`.
- Backup offsite criptografado.
- Restore somente com confirmacao explicita e ambiente separado.

## Fase 3.0 - checklist operacional final

- Rotacionar segredos compartilhados fora de vault/gerenciador.
- Usar SSH com chave.
- Desabilitar login root por senha.
- Ativar firewall UFW.
- Manter Caddy como unico ponto publico HTTP/HTTPS.
- Fechar portas internas de PostgreSQL, n8n e servicos auxiliares.
- Garantir `ALLOW_DEMO_LOGIN=false` em producao.
- Manter logs redigidos.
- Manter tokens de integracao criptografados em `Setting`.
- Ativar backup offsite criptografado.
- Ativar monitoramento externo.
- Documentar politica de privacidade e uso de dados.
