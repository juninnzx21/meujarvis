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
GEMINI_MODEL=gemini-2.5-flash
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

## Controle Financeiro

Objetivo: permitir que o JARVIS registre entradas/saidas e consulte resumo mensal no sistema `controlefinanceiro.juninnzxtec.com.br`, inclusive por comandos de WhatsApp.

Configuracao pelo painel:

1. Acesse `Financeiro` no menu lateral do JARVIS.
2. Informe a URL:

```text
https://controlefinanceiro.juninnzxtec.com.br
```

3. Cole um token de API/Bearer do Controle Financeiro.
4. Clique em `Salvar` e depois `Testar conexao`.

Seguranca:

- Nao salve usuario/senha do Controle Financeiro no JARVIS.
- O token fica somente no backend/banco.
- O frontend recebe apenas `tokenConfigured=true/false` e uma mascara do token.
- Logs nunca devem gravar o token.

Endpoints JARVIS:

- `GET /api/finance/status`
- `GET /api/finance/config`
- `PUT /api/finance/config`
- `DELETE /api/finance/config`
- `POST /api/finance/test-connection`
- `GET /api/finance/summary/month`
- `POST /api/finance/transactions`
- `POST /api/finance/parse`

Comandos WhatsApp:

```text
entrada pix recebido R$ 120,00 cliente Maria
saida pix enviado R$ 89,90 internet
paguei R$ 35,00 estacionamento
recebi R$ 250,00 servico de manutencao
resumo financeiro do mes
extrato financeiro do mes
```

Regras:

- Informe sempre se e entrada ou saida.
- Informe o valor com `R$` quando possivel.
- Se a mensagem parecer financeira, mas faltar tipo ou valor, o JARVIS pede complemento.
- Audio funciona quando a Evolution API envia midia acessivel para transcricao.
- Imagem/PDF de comprovante ainda nao tem OCR nesta fase; envie tambem o texto ou valor.
