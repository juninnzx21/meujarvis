# Documentos e RAG do JARVIS

Status: modulo preparado com armazenamento seguro local e busca redigida.

## Modelos

- `Document`
- `DocumentChunk`

## Endpoints

- `POST /api/documents/upload`
- `GET /api/documents`
- `GET /api/documents/:id`
- `DELETE /api/documents/:id`
- `GET /api/documents/:id/chunks`
- `POST /api/documents/:id/reindex`
- `GET /api/documents/search?q=`

## Formatos

Aceitos nesta fase:

- TXT
- MD
- CSV
- OFX
- PDF como registro/conferencia

Extratos OFX/CSV recebidos pelo WhatsApp devem ir para o financeiro, nao para RAG generico.

## Seguranca

- Arquivos ficam em `backend/storage/documents`, ignorado no Git.
- Logs guardam metadados, nao conteudo bruto.
- Busca retorna conteudo redigido.
- Documentos nao sao enviados para OpenAI/Gemini por padrao.
- Para usar IA externa em documento sensivel, pedir consentimento explicito.

## Proxima evolucao

- Parser PDF robusto.
- OCR opcional com consentimento.
- Embeddings reais com pgvector.
- Tela frontend `/documents`.
- Perguntas sobre documentos com citacao de trechos redigidos.

## Fase 14 - JARVIS Super Intelligence Core

O JARVIS agora possui um Brain interno em `/api/brain/*` e painel em `/brain`, com agentes especialistas, roteador de intencoes, ferramentas internas seguras, contexto por memorias/documentos/financeiro/status, feedback/aprendizado e verificador de resposta. O Brain nao treina modelo do zero; ele orquestra OpenAI/Gemini/fallback local com limites de seguranca.

Rotas principais: `/brain`, `/brain/agents`, `/brain/tools`, `/brain/memory`, `/brain/feedback`. Chat e voz usam o Brain mantendo compatibilidade. WhatsApp continua exigindo `ei jarvis` e OFX/CSV continuam exigindo revisao.
