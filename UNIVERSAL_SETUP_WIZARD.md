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

