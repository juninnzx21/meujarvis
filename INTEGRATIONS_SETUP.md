# Setup de integracoes

Todas as credenciais ficam somente em `.env` e `backend\.env`. Nunca coloque chaves no frontend.

## OpenAI

Variaveis:

```env
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini
```

Sem chave, ou se a API retornar erro/quota, o JARVIS usa fallback local seguro.
Antes do fallback local, o backend tenta Gemini quando `GEMINI_API_KEY` esta configurada.

Status exibido no frontend:

- `configured`: chave presente e sem erro recente.
- `missing_key`: chave ausente.
- `quota_exceeded`: OpenAI retornou quota/billing/429.
- `network_error`: falha de rede/timeout.
- `api_error`: outro erro do provedor.

## Gemini fallback

Variaveis:

```env
GEMINI_API_KEY=
GEMINI_MODEL=gemini-1.5-flash
```

O Gemini e usado somente no backend como segundo provedor de IA. A chave nunca e enviada ao frontend. Se OpenAI estiver sem chave, sem quota ou com erro de rede/API, o JARVIS tenta Gemini. Se Gemini tambem falhar, retorna fallback local seguro.

## n8n

Variaveis:

```env
N8N_WEBHOOK_URL=
N8N_API_KEY=
```

Endpoints:

- `GET /api/n8n/status`
- `POST /api/n8n/trigger`
- `POST /api/n8n/test`

Sem webhook, retorna `not_configured`.
O teste envia payload seguro `{ source: "jarvis", type: "safe_test" }` e registra `SystemLog` com request/response redigidos.

Templates de evento recomendados:

- `task.created`
- `task.overdue`
- `routine.run`
- `backup.completed`
- `system.alert`

Payload base:

```json
{
  "source": "jarvis",
  "event": "task.created",
  "timestamp": "ISO_DATE",
  "data": {}
}
```

## WhatsApp / Evolution API

Variaveis:

```env
EVOLUTION_API_URL=
EVOLUTION_API_KEY=
EVOLUTION_INSTANCE=
WHATSAPP_AUTO_REPLY=false
```

Endpoints:

- `GET /api/whatsapp/status`
- `POST /api/whatsapp/test-connection`
- `POST /api/whatsapp/send`
- `POST /api/whatsapp/webhook`

Envios exigem confirmacao. Auto reply fica desligado por padrao para evitar loop e spam.
Numeros devem conter apenas digitos, com DDI, entre 10 e 15 caracteres. Grupos e mensagens geradas pelo proprio JARVIS nao disparam auto reply.

Comandos de IA devem apenas preparar mensagem. O envio final deve acontecer pela tela WhatsApp com confirmacao.

## Home Assistant

Variaveis:

```env
HOME_ASSISTANT_URL=
HOME_ASSISTANT_TOKEN=
```

Endpoints:

- `GET /api/home-assistant/status`
- `POST /api/home-assistant/test-connection`
- `GET /api/home-assistant/entities`
- `POST /api/home-assistant/call-service`
- `POST /api/home-assistant/conversation`

Acoes sensiveis, como fechaduras, portoes e alarmes, exigem confirmacao explicita.
Entidades sao agrupadas por dominio no retorno (`light`, `switch`, `sensor`, `climate`, `scene` e outros quando existirem).

Acao segura de luz:

```http
POST /api/home-assistant/light
{
  "entityId": "light.sala",
  "action": "turn_on"
}
```

Somente entidades `light.*` sao aceitas nesse endpoint.
