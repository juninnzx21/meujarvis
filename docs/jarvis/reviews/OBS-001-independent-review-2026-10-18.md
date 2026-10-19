# Revisão independente — OBS-001

Data: 2026-10-18
Branch de análise: `codex/agent-sync-v1-20261017`
HEAD analisado: `ba75e281f4ddcde772e2e281a4be4a2886c9f038`
Escopo: request IDs, logging HTTP/erros, readiness, estado das integrações, métricas e regressões do commit `41ca82b`.

## Parecer inicial

**REPROVADO PARA PROMOÇÃO na revisão inicial; ressalva de autorização P1 encontrada.** O pipeline de telemetria HTTP limita os campos de log e gera request ID no servidor, mas o endpoint detalhado de saúde permite a qualquer usuário autenticado consultar falhas globais. O problema é anterior ao commit `41ca82b`, porém permanece no caminho de observabilidade revisado.

Evidência: `backend/src/modules/health/routes.ts` protege `/full` somente com `authMiddleware`, que autentica e carrega `role`, sem exigir administrador. `backend/src/services/healthService.ts` consultava `SystemLog` sem filtro de `userId`, contava imports de todos os usuários e suas linhas pendentes, e retornava as últimas falhas. Logo, uma conta com papel comum podia consultar mensagens e agregados de outras contas. A redação por regex reduz alguns segredos conhecidos, mas não substitui autorização/isolamento.

## Controles revisados

- Request ID: criado com `randomUUID()` pelo backend e substitui qualquer `X-Request-Id` enviado pelo cliente; header exposto por CORS. Acesso foi validado por testes unitários e integração histórica.
- Logs HTTP: registram apenas request ID, método, template da rota, status e duração; não usam URL, query ou corpo. 5xx são persistidos com mensagem construída a partir de status/rota; falhas repetidas são deduplicadas por rota/status por 60 segundos e o mapa tem limite de 100 chaves.
- Erros: o logger não recebe mensagem ou stack brutos. Respostas 5xx são genéricas em produção e incluem request ID para correlação.
- Readiness: consulta `SELECT 1` e informa `degraded` quando o banco falha. Isso mede disponibilidade da aplicação e do banco; não comprova conectividade com serviços externos.
- Integrações: estados configurados não são apresentados como conexão verificada; o status detalhado retorna `not_checked` ou `unknown`.
- Métricas: contadores são locais ao processo e reiniciam com ele; não são histórico durável nem agregação entre réplicas. O painel precisa manter essa limitação explícita.
- Regressões observadas: os testes cobriam query string, request ID controlado pelo cliente, erros sanitizados, falha de banco e estados desconhecidos, mas não cobriam autorização por papel nem isolamento multiusuário dos dados detalhados.

## Correção local subsequente — OBS-002

O acesso detalhado foi alterado para filtrar logs, imports e linhas financeiras pelo usuário autenticado; somente papel `admin` recebe os agregados globais e a data global de backup. A rota deriva esse escopo de `req.user.role`, sem aceitar decisão do cliente. A resposta comum também usa estado dos provedores de IA por usuário, oculta contadores HTTP globais e remove horários/erros/contagens globais do scheduler. Os relatórios do usuário agora passam `userId` à leitura de health. Foram adicionados testes unitários para filtros do serviço e papel na rota, além de integração autenticada com usuário comum e admin.

Validação inicial após isolamento de logs/finanças: `run-cycle.ps1 -ValidateOnly` confirmou identidade do PostgreSQL descartável por Docker + SQL e migrations; backend **158/158** testes em 21 arquivos, zero skips, Prisma/typecheck/build aprovados; frontend **49/49** em 9 arquivos, typecheck/build aprovados; Agent Sync **15/15**, zero skips, typecheck aprovado; `git diff --check` passou. O teste integrado com dois usuários sintéticos comprovou isolamento dos marcadores e contagens e remove fixtures em `finally`. Após revisar o payload global restante, foi acrescentado escopo por usuário para provedores, métricas e scheduler, passagem de `userId` nos relatórios e redução da resposta básica pública. A validação final posterior à rota pública também passou: backend **159/159**, frontend **49/49**, Agent Sync **15/15**, zero skips; identidade SQL/migrations, Prisma, typechecks, builds e dry-run aprovados.

## Estado do gate

OBS-001 permanece `IN_REVIEW`; OBS-002 também está `IN_REVIEW`. A integração autenticada cobre health e relatório de sistema com dois usuários, métricas/scheduler/provedores em escopo correto; requer uma segunda revisão independente do diff e smoke operacional autorizado. A análise inicial e a remediação foram feitas neste fluxo Codex; não equivalem a aprovação independente após a correção. Não houve acesso à VPS/produção, chamadas pagas, push, merge ou deploy.
