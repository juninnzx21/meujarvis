# MEM-001 — evidências de regressão

Data: 2026-10-17. Escopo exclusivo: testes de memória/conversas. Sem alteração de comportamento, schema, migrations ou retenção.

## Cobertura implementada

Arquivo: `backend/src/memoryIsolation.integration.test.ts`, cinco casos com Prisma/PostgreSQL reais e rotas HTTP reais via Supertest no coordenador.

| Critério | Evidência automatizada |
| --- | --- |
| 1 | Duas contas sintéticas: listagem, filtro textual e busca semântica retornam apenas IDs próprios. GET por ID retorna 404 (rota não existente hoje); PUT alheio e inexistente têm a mesma resposta pública 500 atual. Nenhum conteúdo alheio é alterado/exposto. |
| 2 | DELETE alheio e inexistente retornam 204 vazio; memória e embedding alheios continuam presentes. DELETE próprio remove memória e embedding; exclusão da conta sintética também verifica cascata. |
| 3 | Promise.all intercala chat, atualizações e buscas entre contas. Histórico próprio é preservado; ID de conversa alheia resulta em nova conversa, sem ler/alterar o transcript original. Associações WhatsApp do mesmo hash em contas distintas permanecem separadas. |
| 4 | Brain e ContextBuilder reais em fallback local retornam memória própria via chat e webhook WhatsApp. Dois remetentes sintéticos têm históricos separados, inclusive em chamadas paralelas. Associação adulterada apontando para conversa alheia é reparada sem tocar a outra conta. Entrada sem `ei jarvis` não aciona Brain. |
| 5 | Memórias datadas de 2000 continuam disponíveis em busca/contexto e fallback sem correspondência, até exclusão explícita. Schema Memory não possui expiresAt; schedulerService.ts não contém rotina de memória/expiração/exclusão. Não é uma simulação de passagem do tempo nem garantia sobre jobs externos ao repositório. |
| 6 | Opt-in exclusivo por JARVIS_AGENT_SYNC_TEST_DATABASE_URL; protocolo PostgreSQL, loopback, nome com segmento test/tests/testing/disposable/mem001 e parâmetros limitados são verificados antes de importar app/Prisma. Não há fallback para DATABASE_URL do ambiente. Execução PostgreSQL pendente do coordenador. |

## Isolamento do teste

- Não lê `.env`: dotenv é substituído antes dos imports dinâmicos. Chave JWT e identidades são sintéticas; não há autenticação com conta/número real.
- A seleção administrativa do webhook é fixada na primeira fixture por spy; autenticação das rotas continua usando JWT e consulta real ao usuário. Portanto o teste não valida a escolha global do administrador nem MFA.
- O spy de Brain chama a implementação real com ferramentas e IA externa desativadas. RuntimeConfig, envio WhatsApp e desvio financeiro são dublês locais. Não testa Evolution, provedores ou entrega de mensagens.
- Axios e fetch falham se chamados; sockets Node não-loopback são bloqueados. O contador de tentativas deve terminar em zero. Supertest utiliza somente HTTP loopback no host. Prisma usa seu engine; o coordenador deve manter o isolamento de rede do processo/engine, permitindo apenas o PostgreSQL descartável e loopback. Estes testes não substituem firewall do host.
- Fixtures têm UUID por execução. A limpeza no coordenador limita-se aos IDs criados e mensagens sintéticas identificadas pelo UUID; não realiza reset, migration, seed ou exclusão ampla.
- Ausência da variável explícita resulta em **skip**, nunca evidência de sucesso PostgreSQL nem de indisponibilidade global do banco. Nome de banco fora do padrão seguro exige ajuste no coordenador, não relaxamento da proteção.

## Resultados observados no sandbox

- `npm.cmd run validate` frontend: exit 0; 9 arquivos, 49 testes aprovados; typecheck/build aprovados. Aviso não bloqueante do Vite sobre tamanho do chunk.
- `npm.cmd run validate` backend: exit 1; Prisma generate, typecheck e typecheck:seed aprovados. 7 arquivos/35 testes aprovados, MEM-001 com 5 skips. Duas suítes preexistentes (`app.integration.test.ts`, `totpSecretService.test.ts`) não coletaram testes porque DATABASE_URL/JWT_SECRET não estão disponíveis neste sandbox.
- `npm.cmd run build` backend: exit 0.
- `npm.cmd test -- src/memoryIsolation.integration.test.ts`: exit 0, **5 skips**, sem conexão ao banco. Isso verifica coleta, não os critérios funcionais PostgreSQL.
- `git diff --check`: aprovado. Mudanças restritas ao teste e documentação; nenhum segredo, dump ou arquivo de configuração adicionado.
- O primeiro uso de `npm` foi bloqueado pela política do PowerShell para npm.ps1. Usou-se npm.cmd sem alterar política ou elevar permissões.

## Revisão e aceite do coordenador no host — 2026-10-17

Execução realizada no host pelo coordenador com PostgreSQL descartável (`jarvis-agent-sync-postgres-test` em `127.0.0.1:55433`), migrations aplicadas e seed sintético:

1. `npm.cmd test -- src/memoryIsolation.integration.test.ts --reporter=verbose`: exit 0; 5 testes executados, **5 aprovados, 0 falhas, 0 skips**.
   - Critério 1: Isolamento de listas, busca textual/semântica e operações por ID alheio aprovados.
   - Critério 2: Exclusão com cascata (Memory -> MemoryEmbedding) comprovada; deleção alheia inofensiva.
   - Critério 3: Operações concorrentes entre contas e IDs de conversa isolados.
   - Critério 4: Contexto compartilhado para o mesmo usuário em chat e WhatsApp, mantendo transcrições e remetentes segregados.
   - Critério 5: Ausência de TTL/expiração para memórias legadas comprovada.
   - Critério 6: Execução exclusiva com banco descartável loopback.
2. `npm.cmd run validate` backend: exit 0; Prisma generate, typecheck, typecheck:seed, 10 suítes / 87 testes aprovados e build compilado com sucesso.
3. `npm.cmd run validate` frontend: exit 0; typecheck, 9 suítes / 49 testes aprovados e build Vite compilado com sucesso.
4. `npm.cmd run validate --prefix tools/agent-sync`: exit 0; 13 testes unitários aprovados.
5. `git diff --check`: aprovado sem erros de formatação ou whitespace.

Status de MEM-001: **Aceite concluído e validado (IN_REVIEW)**. Pronto para commit atômico e transição de backlog.
