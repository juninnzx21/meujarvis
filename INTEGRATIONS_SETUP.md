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

Opcao 1, configurar pelo painel:

1. Acesse `WhatsApp` no menu lateral.
2. Informe URL da Evolution API, instancia e API key.
3. Copie o webhook exibido na tela:

```text
https://apijarvis.juninnzxtec.com.br/api/whatsapp/webhook
```

4. Cole esse webhook na Evolution API para eventos de mensagem.
5. Clique em `Salvar configuracao` e depois `Testar conexao`.

A API key fica salva somente no backend/banco e nunca e retornada em claro para o frontend. Para editar a chave, cole uma nova. Para manter a atual, deixe o campo em branco. Para remover tudo, use `Limpar`.

Opcao 2, configurar por `.env`:

```env
EVOLUTION_API_URL=
EVOLUTION_API_KEY=
EVOLUTION_INSTANCE=
WHATSAPP_AUTO_REPLY=false
```

Endpoints:

- `GET /api/whatsapp/status`
- `GET /api/whatsapp/config`
- `PUT /api/whatsapp/config`
- `DELETE /api/whatsapp/config`
- `POST /api/whatsapp/test-connection`
- `POST /api/whatsapp/send`
- `POST /api/whatsapp/webhook`

Envios exigem confirmacao. Auto reply fica desligado por padrao para evitar loop e spam.
Numeros devem conter apenas digitos, com DDI, entre 10 e 15 caracteres. Grupos e mensagens geradas pelo proprio JARVIS nao disparam auto reply.

Comandos de IA devem apenas preparar mensagem. O envio final deve acontecer pela tela WhatsApp com confirmacao.

Audio recebido por WhatsApp:

- O webhook detecta audio quando a Evolution API envia `audioMessage`, URL de midia ou base64.
- Se a midia vier como base64 ou URL acessivel, o JARVIS transcreve com OpenAI/Whisper.
- O texto transcrito entra no mesmo orquestrador usado pelo chat.
- Exemplo de audio: "Jarvis, crie uma tarefa para amanha as nove ligar para o cliente".
- Se a Evolution enviar apenas metadados sem midia baixavel, o JARVIS registra o recebimento e pede para reenviar em texto.

Para execucao automatica via WhatsApp, habilite `Resposta automatica pelo WhatsApp` somente depois de testar webhook e conexao. Acoes sensiveis continuam exigindo confirmacao.

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
