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
