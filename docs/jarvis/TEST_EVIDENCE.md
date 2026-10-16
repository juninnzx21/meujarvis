# Evidências de teste e diagnóstico

## Baseline local — checkout v2.0.0

- Branch: `codex/jarvis-2.0-platform-20261015`; SHA: `eec24a6f01cd2b60da358a198da3ba32641afe1e`; tag: `v2.0.0`.
- Diretório: `E:\jarvis-home-assistant\.private-release\audit-20261015\github-main`.
- `origin/main` em 16/10/2026: `ee4f98734257c5a56518662d5a0127f09358eb32`; não ancestral. A comparação local reportou 174 arquivos e 10.580 linhas removidas em main em relação ao SHA auditado. Ref de inspeção `refs/codex/audit/main-20261016`, sem checkout/merge.
- `origin/codex/jarvis-2.0-platform-20261015` coincide com SHA local.
- GitHub PR #1 `JARVIS 2.0: integrar atualizações e publicar downloads` está `open`, `mergeable=true`, base `main` (`ee4f987`) e head `codex/jarvis-2.0-platform-20261015` (`eec24a6`). Nenhuma operação de PR realizada.
- CI `JARVIS CI` para SHA `eec24a6` run #52 concluiu `success`. Para SHA atual de `main` (`ee4f987`), não foi retornado workflow run pela consulta usada.
- Working tree antes deste plano: 12 relatórios da auditoria existiam como `?? docs/`, ainda não commitados. Nenhum arquivo tracked alterado.

## Probes públicos — 2026-10-16 16:37 UTC

| Endpoint | Resultado | Limite |
|---|---|---|
| `https://jarvis.juninnzxtec.com.br/` | HTTP 200 | Apenas documento frontend |
| `https://jarvis.juninnzxtec.com.br/api/health/public` | HTTP 200; app/database/scheduler `ok` no payload | Autodeclaração de health, não login ou função e2e |
| `https://apijarvis.juninnzxtec.com.br/api/health/public` | HTTP 200; app/database/scheduler `ok` no payload | Mesmo limite |
| `https://apijarvis.juninnzxtec.com.br/api/brain/status` | HTTP 401 sem token | Auth protege a rota; estado privado não observado |
| `https://apijarvis.juninnzxtec.com.br/api/integrations/status` | HTTP 401 sem token | Sem credencial de teste não confirmar integrações |

## Testes da auditoria anterior (histórico; não repetidos neste run)

- Backend: 29 testes em 6 arquivos passam quando se exclui a suite que requer DB; typecheck/build passam. Suite completa: 29 passam, suite DB não inicia sem `DATABASE_URL` e `JWT_SECRET` isolados.
- Frontend: 47 testes em 8 arquivos, typecheck/build passam; bundle reportado ~634,78 kB.
- Desktop: validação, typecheck/build e 4 testes passam.
- Android: não compilado, Java/`ANDROID_HOME` ausentes.
- GitHub Actions `JARVIS CI` run 52 no commit auditado: sucesso. O main remoto mudou desde então e esse resultado não valida HEAD atual do main.
- `npm audit --omit=dev --audit-level=high`: zero vulnerabilidades de alta severidade em dependências prod examinadas naquela coleta.
- Matriz de 20 cenários: 11 parciais, 3 bloqueados, 3 não testados, 3 não implementados; zero E2E real completo comprovado.

Detalhes e limitações: `docs/audits/jarvis-v2-functional/`. A suite de DB nunca deve usar a URL de produção.

## VPS (snapshot histórico, 2026-10-16 03:17 UTC)

Fonte externa local: `C:\Users\junin\OneDrive\Documentos\ChatGPT\Migration this vps hpedagem\CHECKUP_VPS_JARVIS_2026-10-16.md`. O checkup registrou Ubuntu 24.04.5, 4 vCPU, 7.8 GiB RAM, 96 GiB disco, Docker 29.9 e atualização dos containers JARVIS backend/frontend para tag 2.0.0; backup PostgreSQL e checksum validados. Também registrou 53 containers, 52 em execução, e conteúdos de disco/hosts. É apenas fotografia de 03:17 UTC; dados operacionais detalhados ficam fora deste repo público.

Sem SSH autenticado nesta execução: nenhum número do snapshot é apresentado como estado atual. Não foram lidos `.env`, logs privados, uso de recursos, estado de Evolution, n8n ou Home Assistant ao vivo.

## Reprodutibilidade do primeiro run

Comandos de diagnóstico incluíram `git status --short`, `git branch --show-current`, `git rev-parse HEAD`, `git ls-remote`, fetch para ref de inspeção, probes HTTP GET e consulta de tarefas locais. Nenhuma migration, envio, teste destrutivo ou restart ocorreu. Branch final ainda no SHA base.

## Runner e agendamento

- `docs/jarvis/STATE.json`: parse JSON válido, 31 tarefas.
- `scheduler/JARVIS-Hourly-Disabled.xml`: XML válido; settings e trigger retornam `Enabled=false`.
- `scripts/jarvis-hourly.ps1`: parse válido com PowerShell 7.6.5; dry-run executado com diretório de lock temporário, resultado `DRY_RUN_OK`, exit 0, sem alterar app/produção.
- Segunda validação: `-DryRun` novamente retornou `DRY_RUN_OK`/exit 0; `-Execute` foi bloqueado antes de invocar Codex porque `scheduler.enabled=false` e `executionEnabled=false`.
- Codex automation `jarvis-revis-o-hor-ria-pausada`: criada com status PAUSED. Execução projectless e caminho absoluto não foram validados como acesso ao repo; manter pausada.
- Nenhuma Scheduled Task Windows foi registrada; nenhum agendamento ativo.

## SEC-001/SEC-004 — worktree isolado, 2026-10-16 17:14 UTC

- Worktree `E:\jarvis-home-assistant\.codex-worktrees\jarvis-sec-20261016`; branch `codex/sec-001-004-webhook-media-20261016`; base `eec24a6f01cd2b60da358a198da3ba32641afe1e`.
- Backend `npm run typecheck`: passou; `npm run build`: passou. `npx vitest run --exclude src/app.integration.test.ts`: 8 arquivos, 34 testes passaram. Testes direcionados: 2 arquivos, 5 testes passaram.
- Frontend `npm run validate`: passou; typecheck, 8 arquivos/47 testes e build. Aviso Vite: bundle JS 635.84 kB minificado, gzip 190.13 kB.
- `npx prisma validate` com URL local fictícia: schema válido. `npx prisma generate`: segunda tentativa isolada passou.
- `npm audit --omit=dev --audit-level=moderate`: 0 vulnerabilidades de produção reportadas no backend e frontend.
- `npm run validate` backend foi repetido em sequência: `prisma generate`, backend typecheck e `typecheck:seed` passaram; a suíte chegou à integração e falhou no setup de `src/app.integration.test.ts` por recusa de conexão a `127.0.0.1:5432`. 8 arquivos/34 testes sem DB passaram; os 44 casos integrados foram pulados após `beforeAll` falhar. Build passou em execução separada.
- Uma primeira tentativa anterior foi iniciada em paralelo com Vitest e deu EPERM ao renomear `query_engine-windows.dll.node`; o `prisma generate` repetido sem concorrência passou. O erro serial reprodutível é falta do banco descartável, não a migration nem o código.
- Não executado: `src/app.integration.test.ts`, migration real, teste E2E Evolution. Docker daemon inacessível e `127.0.0.1:5432` recusou conexão; nenhum PostgreSQL descartável local. Banco de produção não foi acessado.
- CI remoto, Evolution real e produção não verificados; nenhuma credencial de produção lida.
- Commit local da implementação: `2932b70` (`fix(security): secure evolution webhook and media`); sem push/PR/merge/deploy.

## Validação integrada isolada — 2026-10-16 19:14 UTC

- Ambiente: cluster PostgreSQL 15.19 extraído do arquivo de binários EDB para uma pasta temporária local; dados sob `%TEMP%`, processo em `127.0.0.1:55432`, autenticação trust limitada ao acesso local. Credenciais eram fictícias e existiram apenas nos processos de teste. Docker Desktop não foi iniciado; VPS e produção não foram acessadas.
- Diagnóstico: `initdb` da instalação existente falhou porque faltava `dict_snowball.dll`. Foi usada distribuição portátil correspondente PostgreSQL 15.19 sem instalar ou alterar arquivos em `Program Files`.
- Compatibilidade/migration: migrations anteriores aplicadas numa base limpa; duas linhas `WhatsAppMessage` antigas inseridas sem ID externo; migration `20261016170000_whatsapp_webhook_replay_guard` aplicada e ambos registros permaneceram com campo nulo. Rollback foi simulado apenas no banco descartável (índice/coluna/histórico da migration) e a reaplicação passou; as linhas continuaram preservadas. Schema Prisma válido.
- Seed de demonstração executado apenas nessa base descartável.
- Backend `npm run validate`: Prisma generate, typecheck, typecheck do seed, 9 arquivos/82 testes e build passaram. A integração `src/app.integration.test.ts` passou com 46 testes, incluindo segredo, instância/remetente, evento inválido, replay, rate limit, cifragem e isolamento de usuário.
- Testes de mídia: URL externa de anexo/áudio sem chamada Axios, base64 pequena aceita e base64 acima de 8 MiB rejeitada antes de fetch/transcrição.
- Frontend `npm run validate`: typecheck, 8 arquivos/47 testes e build passaram. Aviso existente: bundle JavaScript minificado 635.84 kB.
- Desktop `npm ci` seguido de `npm run validate`: typecheck/build e 4 testes passaram. npm reportou 8 advisories moderados na árvore de desenvolvimento; `npm audit --omit=dev --audit-level=moderate` retornou zero vulnerabilidades de produção em backend, frontend e desktop.
- Android não testado localmente por falta de Java/Android SDK. A CI GitHub precisa validar todos os jobs para o commit novo.
- Limite HTTP: `express.json` restringe o JSON total a 1 MiB. O decodificador limita 8 MiB e pré-checa o tamanho bruto antes de normalizar; o envelope HTTP é mais restritivo. O limite global não foi aumentado.
- Evolution real, número de teste, chamada real de IA, status da VPS e produção continuam sem validação; nenhum segredo ou payload real foi usado.

## Validação do runner horário — 2026-10-16 19:21 UTC

- Corrigido parse de `expiresUtc`: aceita o `DateTime` que `ConvertFrom-Json` produz no Windows e strings ISO com cultura invariável.
- Dry-run isolado: `DRY_RUN_OK`, exit 0; lock liberado ao final.
- Concorrência: lock válido retornou `SKIPPED_LOCKED`, exit 0, sem iniciar Codex.
- Gate de execução: `-Execute` foi bloqueado por `scheduler.enabled=false` e `executionEnabled=false`; nenhum subprocesso Codex foi iniciado.
- A automação Codex permaneceu PAUSED e o template do Task Scheduler disabled. Testes executados sob `%TEMP%`; diretórios de teste removidos após verificação.
- PostgreSQL temporário foi parado e `127.0.0.1:55432` confirmou `no response`; cluster descartável removido. VPS e produção não foram acessadas.

## CI remota da branch — 2026-10-16

- GitHub Actions `JARVIS CI` run #53 do head `1508ff6eab281cdee611ad195ac365bffc8a54b0` concluiu com 3/3 checks verdes (`validate`, `desktop`, `android`), conferido na comparação da branch no GitHub.
- Branch publicada: `codex/sec-001-004-webhook-media-20261016`; implementação `10f76ff23091f3baca633f00ad4274895ff92a49`.
- PR separado ainda não existe: criação via conector retornou HTTP 403 (`Resource not accessible by integration`) e a sessão do navegador não está autenticada. Link de comparação está no progresso; não houve merge ou deploy.
