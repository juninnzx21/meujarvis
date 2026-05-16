# Memoria semantica do JARVIS

Status: preparada com fallback local seguro.

## O que foi implementado

- Modelo `MemoryEmbedding`.
- `embeddingService` com provider local mockado `local_mock`.
- Endpoint `GET /api/memories/search?q=`.
- Criacao de embedding local ao criar memoria.
- Fallback textual/semantico simples sem enviar dados para OpenAI/Gemini.

## Por que ainda nao e pgvector completo

Pgvector exige extensao no PostgreSQL e decisao de provider/modelo de embedding. Para nao quebrar a base aprovada, esta fase deixa a estrutura pronta e segura. A busca atual usa vetor local mockado e busca textual.

## Proxima evolucao

1. Ativar extensao `vector` no Postgres.
2. Trocar campo `Json` por vector real ou tabela auxiliar compativel.
3. Escolher provider de embedding.
4. Exigir consentimento antes de enviar memorias sensiveis para IA externa.
5. Criar reindexacao de memorias existentes.

## Seguranca

Nao salvar senhas, tokens, chaves, dados bancarios ou documentos sensiveis em memoria comum. Dados sensiveis devem ficar em vault/gerenciador de senhas.
