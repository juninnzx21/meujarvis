# Central de Configuracoes e Integracoes

## Objetivo

A Central de Integracoes permite configurar, testar e validar integrações do JARVIS pelo painel, sem editar arquivos manualmente sempre que a integracao puder ser salva com seguranca em `Setting`.

Rotas do painel:

- `/integrations`
- `/settings/integrations`
- `/integrations/setup-wizard`
- `/integrations/events`
- `/n8n`
- `/whatsapp`

API oficial: `https://apijarvis.juninnzxtec.com.br/api`

Frontend: `https://jarvis.juninnzxtec.com.br`

Webhook WhatsApp/Evolution: `https://apijarvis.juninnzxtec.com.br/api/whatsapp/webhook`

n8n planejado: `https://n8njarvis.juninnzxtec.com.br`

## O que da para configurar pelo painel

- URLs publicas do JARVIS.
- n8n webhook URL, API key/token opcional, webhook secret e enabled.
- Evolution API URL, instance, API key e auto reply.
- Home Assistant URL e token.
- Controle financeiro externo URL, token e conta padrao.
- Flags de monitoramento e backup.

OpenAI e Gemini continuam preferencialmente em variaveis de ambiente ou secret manager do backend. O painel mostra status/modelo, mas nunca recebe a chave real.

## Segurança

- Segredos sao salvos em `Setting` usando `encryptSettingValue`.
- Rotas retornam apenas `configured`, `masked`, `status`, `lastError` redigido e metadados seguros.
- O frontend nunca recebe token real.
- Logs passam por redaction.
- Apenas admin pode alterar configuracoes globais.
- WhatsApp exige `ei jarvis`.
- OFX/CSV por WhatsApp cria previa de importacao, nunca importacao direta.

## Endpoints

- `GET /api/integrations`
- `GET /api/integrations/status`
- `GET /api/integrations/config`
- `PUT /api/integrations/config/:provider`
- `POST /api/integrations/test/:provider`
- `POST /api/integrations/bootstrap/:provider`
- `GET /api/integrations/logs`
- `GET /api/integrations/setup-wizard`
- `GET /api/integrations/events`
- `POST /api/integrations/events/:id/retry`

Providers:

- `openai`
- `gemini`
- `n8n`
- `whatsapp`
- `evolution`
- `home_assistant`
- `finance`
- `monitoring`
- `backup`
- `api_public`

## n8n

A tela `/n8n` lista workflows locais em `n8n/workflows`, permite testar templates seguros, acionar bootstrap e tentar importacao quando API key estiver configurada. Se a importacao via API nao estiver disponivel, o status correto e `manual_action_required`.

## Evolution API / WhatsApp

A tela `/whatsapp` permite salvar credenciais criptografadas, testar conexao, copiar webhook oficial e tentar configurar o webhook automaticamente. Se a Evolution nao permitir a configuracao via API, o painel retorna instrucao manual.

## Wizard

O wizard valida:

1. API publica.
2. n8n.
3. Evolution API.
4. WhatsApp com `ei jarvis`.
5. Financeiro com revisao obrigatoria.
6. Monitoramento.

## Pendencias manuais

- DNS/Caddy do `n8njarvis.juninnzxtec.com.br`.
- Credenciais reais do n8n.
- Credenciais reais da Evolution API.
- Credenciais reais do Home Assistant.
- Chaves OpenAI/Gemini no secret manager.
- Rotacao de segredos compartilhados anteriormente.
