# Memoria semantica futura com pgvector

A versao atual usa busca textual segura por termos normalizados e tags. Isso evita depender de extensoes extras no PostgreSQL e mantem o sistema funcional em qualquer ambiente validado.

## Proxima evolucao

1. Habilitar extensao `vector` no PostgreSQL.
2. Criar campo opcional `embedding` em `Memory`.
3. Gerar embeddings somente para memorias nao sensiveis.
4. Fazer busca hibrida: texto/tags + similaridade vetorial.
5. Nunca salvar segredos automaticamente em embedding.

## Regras de seguranca

- Dados sensiveis como senha, token, chave de API, CPF, cartao e segredo exigem confirmacao.
- Embeddings nao devem ser enviados para provedores externos sem consentimento.
- Logs nao devem conter conteudo sensivel completo.

## Exemplo de migracao futura

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

No Prisma, o campo vetorial deve ser adicionado com cuidado porque suporte nativo depende da versao e do provider. Enquanto isso, pode-se usar SQL cru para consultas vetoriais em uma tabela auxiliar.
