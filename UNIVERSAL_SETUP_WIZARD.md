# Assistente Universal de Configuracao

Status: implementado no painel do JARVIS.

Rotas:

- `/integrations/setup-wizard`: assistente universal por etapas.
- `/integrations/setup-summary`: resumo final por provider.
- `/settings/integrations`: configuracoes detalhadas.
- `/whatsapp`: fluxo Evolution/WhatsApp com QR Code.
- `/n8n`: workflows e automacoes.

Endpoints:

- `GET /api/integrations/setup`
- `GET /api/integrations/setup/:provider`
- `PUT /api/integrations/setup/:provider`
- `POST /api/integrations/setup/:provider/test`
- `POST /api/integrations/setup/:provider/bootstrap`
- `POST /api/integrations/setup/:provider/configure-webhook`
- `POST /api/integrations/setup/:provider/reset-safe`
- `GET /api/integrations/setup/summary`

Providers:

- API publica
- OpenAI
- Gemini
- n8n
- WhatsApp
- Evolution API
- Home Assistant
- Financeiro
- Documentos/RAG
- Monitoramento
- Backup/offsite
- Mobile/PWA
- Seguranca/hardening

Regras de seguranca:

- O frontend nunca recebe API keys, tokens, senhas ou secrets reais.
- Campos sensiveis devem ser salvos em `Setting` criptografado.
- O painel mostra apenas `configured`, mascara, status e erro redigido.
- Quando uma API externa nao permite automacao, o JARVIS retorna `manual_action_required` com checklist.
- WhatsApp continua exigindo `ei jarvis`.
- OFX/CSV via WhatsApp gera previa de importacao, nunca importacao direta.

Pendencias externas comuns:

- OpenAI/Gemini: chaves em `.env` ou secret manager.
- n8n: importacao automatica depende de API key; sem isso, importar JSONs em `n8n/workflows/`.
- Evolution: configurar webhook automatico depende da versao da API.
- Home Assistant: token deve ser criado no Home Assistant e salvo no JARVIS.
- Backup offsite: exige destino externo e criptografia definidos pelo usuario.

## Pendencias orientadas no painel

O wizard mostra uma area de informativos com os passos que ainda precisam de configuracao real. Cada item explica o que faz, como configurar e como validar:

1. Preencher n8n no wizard: conecta o JARVIS aos workflows de automacao, alertas, tarefas, backups, rotinas e eventos.
2. Preencher Evolution API no wizard: permite controlar a conexao WhatsApp pela Evolution sem expor API key.
3. Gerar QR do WhatsApp pelo painel: pareia o numero pelo proprio JARVIS e acompanha o status conectado/open.
4. Configurar webhook automaticamente: tenta apontar a Evolution para o webhook oficial; se nao der, mostra checklist manual.
5. Testar WhatsApp com `ei jarvis status do sistema`: confirma a regra de wake phrase obrigatoria.
6. Configurar Home Assistant: habilita entidades e acoes seguras de casa inteligente com token mascarado.
7. Configurar backup offsite: prepara copia fora da VPS/local com criptografia e retencao.
8. Revisar erros antigos do scheduler: orienta filtro em Logs por modulo `scheduler` e acoes `*_error`.
9. Rotacionar credenciais compartilhadas: reforca troca de senhas/tokens ja expostos fora de vault/gerenciador.
10. Validar importacao real OFX/CSV: confirma que o arquivo gera previa em `/finance/import/:id/review`, nunca importacao direta.
