# JARVIS Super Intelligence Core

Status: implementado em modo seguro e incremental.

O Super Intelligence Core e a camada inteligente do JARVIS acima de OpenAI, Gemini, fallback local, memorias, documentos, financeiro, n8n, WhatsApp, Home Assistant e ferramentas internas. Ele nao treina modelo do zero: ele roteia intencoes, monta contexto, escolhe agente especialista, consulta ferramentas seguras, verifica a resposta e registra feedback redigido.

## Fluxo

1. Recebe mensagem em `/api/brain/ask`.
2. Classifica intencao com regras locais.
3. Escolhe agente especialista.
4. Monta contexto com memoria, documentos, tarefas, financeiro, integracoes e logs quando relevante.
5. Planeja ferramentas internas.
6. Consulta ferramentas seguras.
7. Usa IA externa se permitida e configurada; caso contrario usa fallback local.
8. Verifica riscos, segredos, confirmacao e cautelas profissionais.
9. Retorna resposta, agente, intencao, fontes, ferramentas e proximas acoes.

## Endpoints

- `POST /api/brain/ask`
- `POST /api/brain/plan`
- `POST /api/brain/execute-draft`
- `POST /api/brain/feedback`
- `GET /api/brain/feedback`
- `GET /api/brain/agents`
- `GET /api/brain/tools`
- `GET /api/brain/status`

## Modos

- Quick: resposta curta, usado por WhatsApp.
- Normal: padrao para chat e voz.
- Deep: busca mais contexto interno.

## Seguranca

- Nao retorna segredos.
- Nao executa acao sensivel sem confirmacao.
- WhatsApp continua exigindo `ei jarvis`.
- OFX/CSV continuam exigindo previa em `/finance/import/:id/review`.
- Documentos sensiveis nao vao para IA externa sem consentimento.
- Feedback sensivel nao vira memoria automaticamente.

