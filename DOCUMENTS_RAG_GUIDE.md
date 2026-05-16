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
