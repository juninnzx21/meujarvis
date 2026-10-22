# Evidências de teste e diagnóstico

## VPS-ACCESS-001 — preparação local somente documental — 2026-10-18

- Windows OpenSSH disponível em `C:\Windows\System32\OpenSSH\ssh.exe`; a configuração `%USERPROFILE%\.ssh\config` não existe.
- A chave dedicada `~/.ssh/jarvis_vps` e a chave pública correspondente existem. Verificados metadados e ACL; o conteúdo privado não foi lido, exibido ou copiado. ACL observada: usuário atual, SYSTEM e Administradores.
- A proposta de alias está em `docs/jarvis/VPS_ACCESS.md`. Endpoint/porta, conta não-root e fingerprint atual da host key não foram confirmados, portanto o alias operacional não foi gravado e nenhum login foi tentado.
- Nenhuma chamada SSH, mudança VPS, alteração de serviço, abertura de porta, uso da chave OpenAI ou leitura de `G:\ope\chave.txt`. Agent Sync/scheduler continuam pausados.
- Validação desta alteração documental: `git diff --check` e parse de `docs/jarvis/STATE.json`; sem testes de aplicação, pois nenhum código foi modificado.

## Agent Sync V1 — 2026-10-17

- `npm run validate` em `tools/agent-sync`: TypeScript strict passou; 7 testes passaram, 0 falharam, incluindo o gate do banco de teste e avanço sem repetir tarefa.
- `npm run dry-run`: `DRY_RUN_OK`, branch `codex/agent-sync-v1-20261017`, commit base `54de644`, tarefa elegível `MEM-001`; sem chamadas de modelo nem escrita de estado. Banco PostgreSQL local de teste não configurado.
- `OPENAI_API_KEY` ausente; `npm run cycle` não foi executado. O ciclo real e a compatibilidade efetiva Codex SDK/CLI permanecem pendentes.
- Nenhum timer, container, VPS, banco de produção, GitHub remoto ou configuração de rede foi alterado.

## Agent Sync V1 — preparação local — 2026-10-17

- Docker Desktop estava instalado, foi iniciado normalmente e o daemon Linux ficou saudável (6 CPUs e cerca de 11.7 GiB alocados ao daemon). Os containers preexistentes foram apenas listados; nenhum foi alterado.
- Criado exclusivamente `jarvis-agent-sync-postgres-test` com imagem `postgres:16-alpine`, healthcheck saudável, publicação apenas em `127.0.0.1:55433`, limite de 1 CPU/1 GiB e `/var/lib/postgresql/data` em tmpfs. PostgreSQL 16 e banco de teste confirmados por `pg_isready`/`psql`; sem volume persistente.
- Credenciais geradas aleatoriamente. Não foram impressas nem gravadas em arquivos do repositório; `run-cycle.ps1` as obtém do container apenas em memória para configurar `JARVIS_AGENT_SYNC_TEST_DATABASE_URL` no processo do runner.
- `run-cycle.ps1 -ValidateOnly`: `npm ci`, TypeScript strict, 7 testes, dry-run com `isolatedTestDatabaseConfigured=true` e `codex login status` autenticado passaram.
- `OPENAI_API_KEY` ausente no processo/usuário/máquina. O script foi preparado para solicitar uma chave recém-rotacionada por prompt oculto e removê-la do ambiente ao terminar. Nenhuma chamada ao modelo ou ciclo real foi iniciada.
- Checkpoint local `fe0949a` criado após scanner sem achados de segredo e `git diff --check`; branch `codex/agent-sync-v1-20261017`. Nenhum push, merge, deploy, VPS ou agendamento foi executado.

## Baseline local — checkout v2.0.0

- Branch: `codex/jarvis-2.0-platform-20261015`; SHA: `eec24a6f01cd2b60da358a198da3ba32641afe1e`; tag: `v2.0.0`.
- Checkout local de auditoria; o caminho absoluto fica somente nos registros privados do operador.
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

Existe um checkup de infraestrutura local, mantido fora deste repositório. Os detalhes operacionais e o caminho absoluto permanecem nos registros privados; qualquer dado daquele checkup é histórico e não representa estado atual.

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
- Backend `nnpm run typecheck`: passou; `npm run build`: passou. `npx vitest run --exclude src/app.integration.test.ts`: 8 arquivos, 34 testes passaram. Testes direcionados: 2 arquivos, 5 testes passaram.
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

## AUTH-001 — núcleo TOTP local — 2026-10-17T16:42:18Z

- Branch isolada codex/auth-001-admin-mfa-20261017, commit ef49adc.
- `backend/src/services/totpService.test.ts`: 6 testes passaram, incluindo vetores RFC 6238 SHA-1, janela temporal, segredo aleatório, URI otpauth e rejeição de entrada inválida.
- `npm run typecheck` passou após geração do Prisma Client no `node_modules` local; não houve conexão ao banco.
- Limite: helper ainda não está integrado à autenticação; enrollment, persistência/cifragem, recovery, revogação, testes com DB e MFA em staging não foram validados.

## Ambiente Evolution e armazenamento temporário — 2026-10-17

- Consulta somente leitura à VPS via SSH falhou na autenticação (`Permission denied (publickey,password)`); Docker Desktop não estava disponível localmente. Nenhum staging/container/rede/volume/porta foi criado ou modificado.
- Os artefatos temporários de restauração permanecem preservados em armazenamento local privado. Nenhum dado foi removido nesta auditoria.
# AUTH-001 — validação integrada local — 2026-10-17

- Ambiente: PostgreSQL descartável local em `127.0.0.1:55433`, banco de teste dedicado, migrations completas e seed; credenciais usadas foram sintéticas e não foram registradas.
- Cobertura integrada: primeiro login de administrador pede enrollment; QR PNG e URI de provisionamento são retornados; segredo guardado no banco usa formato cifrado; recovery code não aparece no banco em texto aberto; confirmação emite sessão e 10 códigos de recuperação.
- Login MFA: token de desafio não acessa `/me`; TOTP válido conclui login; repetição do mesmo TOTP é rejeitada; recovery code válido autentica uma vez e seu replay é rejeitado; uso de recovery revoga JWT anterior.
- Desativação: exige sessão autenticada, senha e recovery code válido; revoga a sessão de origem, cria sessão atualizada, limpa segredo/códigos e força novo enrollment no login seguinte.
- Backend `npm run validate`: Prisma generate, TypeScript, typecheck de seed, 9 arquivos/82 testes e build passaram.
- Frontend `npm run validate`: TypeScript, 9 arquivos/49 testes (inclui fluxo de enrollment QR e login com recovery code) e build passaram.
- Limite: testes são de integração local e não substituem revisão, CI, teste de navegador autenticado ou deploy controlado. VPS/produção e Evolution não foram acessados. O PostgreSQL temporário deve ser encerrado após confirmar que não há processo de teste usando-o.

## AUTH-001 — revisão de cache e validação repetida — 2026-10-17T18:50Z

- Revisão estática: desafios de login/setup não autenticam rotas normais; TOTP usa contador anti-replay com atualização condicional; recovery codes aleatórios de 96 bits são persistidos somente como SHA-256 e consumidos por atualização condicional; alterações MFA incrementam `authVersion`, invalidando sessões antigas.
- Melhoria aplicada: todas as respostas da rota `/api/auth` definem `Cache-Control: no-store` e `Pragma: no-cache`; testes de integração verificam os cabeçalhos em login, enrollment e confirmação.
- Backend: `npm run validate` passou (Prisma generate, typecheck, typecheck de seed, 9 arquivos/82 testes e build), usando PostgreSQL 16 temporário em loopback, migrations completas, seed e configurações/credenciais exclusivamente sintéticas. Um primeiro teste sem as variáveis obrigatórias falhou antes da suíte; uma tentativa com chaves sintéticas incompletas teve 3 falhas em testes de outros módulos; após fornecer valores sintéticos para os provedores e cifra de Settings, todos passaram. Sem chamadas a provedores externos.
- Frontend: `npm run validate` passou (9 arquivos/49 testes, typecheck e build). O Vite manteve o aviso conhecido do bundle de 641,94 kB acima do limite de 500 kB.
- O PostgreSQL de teste foi criado para esta execução em diretório local privado, limitado a `127.0.0.1:55433`; foi encerrado e a porta foi confirmada fechada. Os dados usados como origem dos binários portáteis não foram alterados.
- `TOTP_ENCRYPTION_KEY`: usar chave backend exclusiva gerada com CSPRNG (por exemplo, `openssl rand -base64 48`), armazená-la em gestor de segredos e testar recuperação antes da implantação. Perda da chave impede decifrar os segredos TOTP; rotação precisa de re-enrollment ou re-cifragem validada. Nenhuma chave real foi criada/configurada.
- Não confirmado: CI GitHub da branch, PR, teste autenticado no navegador, staging Evolution e produção. SSH à VPS continua indisponível; nenhum push, merge, deploy, migration ou mudança de produção ocorreu.
- Resultado AUTH-001 segue `IN_REVIEW`; próximo gate é revisão independente e CI da branch. MFA não está declarado ativo em produção.

## SEC-002 — rotação e recuperação em PostgreSQL descartável — 2026-10-18

- Banco: container `jarvis-agent-sync-postgres-test`, PostgreSQL 16, DB `jarvis_agent_sync_test`, publicado somente em loopback `127.0.0.1:55433`, sem mounts. A identidade foi confirmada antes do uso; URL/credencial permaneceram somente em memória e não foram impressas.
- `encryptionService.test.ts`: 11/11; `settingsRotation.integration.test.ts`: 8/8 sem skips. Cobrem independência JWT, v1/v2, formatos e cifras inválidas, chave anterior, dry-run read-only, texto simples, backup somente cifrado, idempotência, restauração de arquivo real e rollback integral com falha de update simulada.
- Backend `npm run validate`: Prisma generate, typecheck, typecheck:seed, 12 arquivos / 106 testes e build PASS. Frontend validate: typecheck, 9 arquivos / 49 testes e build PASS. Agent Sync validate: typecheck e 13/13 testes PASS.
- CLI dry-run confirmou nenhum arquivo novo no inventário de backups. URL sintética não descartável foi bloqueada antes de tentativa de conexão. O diretório temporário dos testes foi criado e removido pelos próprios testes; backups preexistentes sob `backend/storage/backups/` foram preservados.
- A validação não executou migrations/seed, não utilizou segredo real e não acessou produção/VPS. `git diff --check` passou após revisão/staging local; commits locais são registrados no checkpoint do progresso.
- Limites: backup é sensível e segue dependente das ACLs locais/operacionais; rotação real requer chave dedicada provisionada pelo operador, cópia segura e revisão independente. SEC-002 permanece `IN_PROGRESS`; o gate `reviewed_continue` não foi executado e não há alegação de proteção ativa em produção.

## SEC-002 — revisão inicial e correção da integridade de backup — 2026-10-18

- Revisão independente inicial, somente leitura: **APROVADO COM RESSALVAS**. Foi comprovado que o restore validava apenas o prefixo de ciphertext; dados adulterados ou cifras transplantadas poderiam ser gravados sem autenticação do envelope.
- Correção local: backup v2 assinado por HMAC derivado da chave dedicada, vinculando metadados/identidade/ciphertext; restore autentica e decifra cada registro antes da transação. Novos backups sempre usam `enc:v2:`; backup v1 sem assinatura é rejeitado.
- Validação inicial sem DB: 15 testes focados passaram e 9 integrações foram ignoradas; backend 54 passaram/57 ignorados; frontend 49/49. Nenhum banco foi acessado nesse preflight.
- Validação final no PostgreSQL descartável previamente confirmado (PostgreSQL 16, `jarvis_agent_sync_test`, porta host exclusivamente `127.0.0.1:55433`, sem mounts): migrations já atualizadas (6/6); SEC-002 focado **24/24, zero skips** (12 unitários, 9 integração, 3 integridade offline). Backend validate **111/111, zero skips**, typechecks/Prisma generate/build PASS; frontend **49/49** e build PASS; Agent Sync **13/13**, scheduler pausado.
- O seed global não foi rodado pois inclui dados de perfil/demo; os testes usam fixtures sintéticas próprias/removíveis. Nenhum dado externo foi adicionado.
- Uma falha inicial no cenário de rollback mostrou ausência de registros pendentes após a restauração; o teste foi corrigido para preparar v1 sintético e a repetição integral passou.
- `git diff --check` e validação JSON PASS. Nenhum segredo real, produção, VPS, push ou deploy foi acessado. Backup v1 sem assinatura permanece preservado e sem restauração direta; recuperação controlada exige procedência confiável preexistente, verificação AEAD e identidade independente ou recuperação pela fonte autoritativa.
- Segunda revisão independente pós-correção ainda pendente; SEC-002 segue `IN_PROGRESS`, pronto para esse gate.

## Agent Sync — segunda validação com migrations — 2026-10-17T19:57:38Z

- Validação no PostgreSQL descartável `jarvis_agent_sync_test`, container local `jarvis-agent-sync-postgres-test`, publicado somente em `127.0.0.1:55433`.
- Seis migrations versionadas aplicadas por `prisma migrate deploy`; banco sem volume persistente, com credenciais sintéticas aleatórias.
- Agent Sync: TypeScript strict aprovado, 7/7 testes aprovados, dry-run `DRY_RUN_OK`, `MEM-001` elegível, Codex CLI autenticado, scheduler desabilitado e OpenAI ausente. Nenhum modelo foi chamado.
- O runner agora migra somente o DB local de teste antes da validação backend/frontend, tanto no pré-voo quanto no ciclo. `DATABASE_URL` é restaurada ao valor anterior depois da migração.
- A tentativa inicial com caminho de schema incorreto terminou antes de executar validações; o caminho foi corrigido e a repetição completa passou. Nenhum serviço preexistente foi tocado.

- O runner completo foi iniciado depois do checkpoint: migrations já estavam aplicadas, 7 testes passaram novamente, dry-run apontou `MEM-001`, branch limpa no commit `621c1af` e Codex autenticado. A sessão chegou ao prompt PowerShell mascarado para `OPENAI_API_KEY`, mas foi interrompida antes da entrada; não houve chamada GPT/Codex de desenvolvimento.

## Agent Sync — Git/PATH corrigido — 2026-10-17T20:24:45Z

- Git foi resolvido em PowerShell e iniciado pelo Node por caminho absoluto, sem modificar PATH global.
- `run-cycle.ps1 -ValidateOnly` passou: seis migrations já aplicadas no DB descartável, TypeScript, 7/7 testes, dry-run `DRY_RUN_OK`, `MEM-001` elegível, Codex autenticado e worktree limpa. Nenhuma chamada de modelo foi realizada.
- Runner captura a instalação local do Git para `JARVIS_AGENT_SYNC_GIT_EXECUTABLE`; a variável e a alteração process-local do PATH são restauradas no `finally`. O Codex SDK herda a mesma configuração.
- Removidas do histórico PSReadLine salvo cinco linhas que continham padrões de chaves OpenAI; as demais entradas foram mantidas. Nenhum segredo foi impresso ou armazenado em backup.
- O commit local `f487c3c` contém a correção. O ciclo ainda aguarda chave nova pelo prompt oculto e segue limitado a uma execução.

## Agent Sync — CLI Codex no Windows PowerShell — 2026-10-17T20:31:00Z

- O runner agora usa `CODEX_CLI_PATH` para localizar a CLI no PowerShell padrão e valida login por spawn Node; `Get-Command codex.exe` é fallback. Não depende do PATH global nem da saída stderr da CLI.
- Pré-validação executada pelo comando Windows PowerShell que o usuário usará: Git/Node OK, DB de teste saudável e migrations em dia, TypeScript, 7 testes, Codex autenticado e dry-run passaram em worktree limpa.
- A falha anterior ocorreu na checagem de CLI e antes da entrada da chave. Nenhum modelo foi chamado. Commit local `3670870`; árvore limpa.
- Aguardar usuário inserir chave OpenAI nova e rotacionada pelo prompt mascarado. Não reusar chave exposta.

## Agent Sync — resolvedor Codex independente de PATH — 2026-10-17T20:49:03Z

- `npm run validate`: TypeScript concluído e 7/7 testes aprovados.
- `npm run dry-run` sem `CODEX_CLI_PATH` e com o diretório do Codex removido do PATH encontrou a instalação integrada em `%LOCALAPPDATA%\OpenAI\Codex\bin`; `codexCliAvailable=true`, `codexCliAuthenticated=true`, `MEM-001` elegível.
- `run-cycle.ps1 -ValidateOnly` no mesmo cenário: Git/Node OK, PostgreSQL local saudável, seis migrations sem pendências, validate aprovado e dry-run autenticado. Nenhuma chamada de modelo. O caso sem CLI e sem caminho local retornou `DRY_RUN_BLOCKED`.
- A validação comum do Codex é compartilhada entre dry-run e ciclo. Commit local `c4895d4`, ainda sem push.
- O ciclo supervisionado aguarda uma nova chave OpenAI no prompt mascarado. Agendamento pausado; sem merge, deploy ou alterações VPS.
## Agent Sync — correção da validação interna do ciclo — 2026-10-17

- Run anterior `bd7e5e0d-5641-4be8-a88f-9b32b56fb59d` em `MEM-001` parou em `test-database-migrations: ENOENT`; o lock foi liberado e não houve alterações parciais de MEM-001.
- Causa confirmada: `execFile("npm", ...)` não resolve `npm.ps1`/`npm.cmd` pelo ambiente Windows sanitizado. O preflight usava o wrapper do PowerShell, portanto as duas fases executavam comandos de forma diferente.
- Correção: resolver `npm-cli.js` uma vez e iniciá-lo com `process.execPath` tanto no `validate-local` como nas validações do ciclo. O runner usa esse mesmo fluxo e inclui migrations, seed sintético, backend, frontend e `git diff --check`.
- A configuração de validação isolada permite o login demo sintético e configura uma chave Gemini fictícia porque as chamadas externas são mockadas. Nenhum provedor real recebe requisições. A fixture de criptografia agora modifica o authentication tag, evitando alteração apenas de bits não significativos em Base64URL.
- Validação completa `run-cycle.ps1 -ValidateOnly`: migration PASS, seed PASS, backend 82/82 e build PASS, frontend 49/49 e build PASS, Agent Sync 8/8, `git diff --check` PASS. Dry-run `DRY_RUN_OK`; Codex autenticado; `MEM-001` elegível; OpenAI ausente e scheduler desativado.
- Nenhum ciclo de modelo foi iniciado porque as correções ainda precisavam de checkpoint limpo; nenhuma chave foi solicitada/recebida. Próximo passo após commit local: iniciar exatamente um ciclo e aguardar chave nova no prompt mascarado.

## Agent Sync — diagnóstico da rejeição MEM-001 — 2026-10-17T21:18:22Z

- Runs registrados em `.state/runs.json`: `41178b4b-841a-40bb-b759-fcd20146fdd1` e `3a2d0831-27d0-4dc3-8eac-8734463001cc`; ambos `review_rejected`, sem diff, `testsPassed=true`. O primeiro alegou DB de teste ausente; o segundo repetiu isso e reportou que retenção não estava definida.
- Causa confirmada: o preflight executa no coordenador host com PostgreSQL local; o Codex sandbox usa `networkAccessEnabled=false` e não recebe variáveis de DB. Logo, o desenvolvedor não pode conectar ao banco, mesmo que o host o tenha validado. Isso é uma fronteira de segurança intencional, e as mensagens anteriores generalizaram incorretamente essa limitação.
- O segundo comentário sobre retenção não indica falha operacional: schema sem `expiresAt`/job encontrado. MEM-001 especifica comportamento sem TTL e não inventa política nova.
- Mudanças locais nesta revisão: prompt de desenvolvimento com evidência sanitizada e limites host/sandbox; preflight executado antes do planner; prompt de revisão separa evidência do host de acesso do Codex, exigindo diff/aceite; especificação testável MEM-001; testes de regressão para prompt/contexto e exclusão de credenciais.
- Validação `run-cycle.ps1 -ValidateOnly` (exit 0): migrations e seed PASS; Agent Sync 11/11; backend 82/82 + build; frontend 49/49 + build; `git diff --check` PASS; `DRY_RUN_OK`, PostgreSQL isolado true, Codex autenticado, OpenAI ausente e scheduler false. Nenhum modelo/ciclo iniciado.
- Estado ao final: lock ausente. PIDs PowerShell 10232 e 88452 permanecem abertos sem filhos diretos; buffer não verificável, não encerrados. Nenhuma alteração remota ou de produção.

## Agent Sync — estados do ciclo — 2026-10-17T22:02:40Z

- A configuração confirma que o Codex sandbox recebe um ambiente allowlist sem variáveis de banco e que a thread usa rede desativada. O teste de unidade verifica que URLs de banco e chave OpenAI não são passadas. Nenhuma sondagem real ou ciclo pago foi iniciado.
- O coordenador registra validation_failed quando os testes locais falham, no_changes quando os testes passam mas não há diff, e review_rejected somente quando o revisor foi chamado e recusou. Bloqueio de planejamento continua blocked. testsPassed é o resultado da suíte do coordenador.
- npm run validate --prefix tools/agent-sync: TypeScript strict e 13/13 testes aprovados, incluindo regressões de validação falha, ausência de diff e rejeição efetiva.
- O ValidateOnly completo anterior passou migrations/seed, backend 82/82 e frontend 49/49 com builds, e dry-run com DB local/Codex autenticado. Não foi repetido nesta rodada. Sem ciclo OpenAI, push, merge, deploy ou VPS.

## SYNC-001 — preparação após correção de contexto — 2026-10-17

- `npm run validate --prefix tools/agent-sync`: TypeScript PASS, 13/13 testes. Inclui isolamento de ambiente do Codex, prompt com evidências do host sem URL do banco, validação de falha, ausência de diff e rejeição após chamada real do revisor.
- `npm run dry-run --prefix tools/agent-sync`: `DRY_RUN_OK`, `MEM-001` elegível, Codex CLI disponível/autenticada, OpenAI ausente e scheduler falso. Executado fora do runner, portanto `isolatedTestDatabaseConfigured=false`; o runner configura esse valor apenas para sua execução local.
- `run-cycle.ps1 -ValidateOnly`: migration e seed PASS; backend 82/82 + build; frontend 49/49 + build; Agent Sync 13/13; `git diff --check` PASS; dry-run `DRY_RUN_OK`, PostgreSQL descartável true e Codex autenticado. Nenhuma chamada OpenAI/Codex de desenvolvimento ocorreu.
- Inspeção Git: branch `codex/agent-sync-v1-20261017`; alterações locais restritas aos documentos e arquivos Agent Sync listados no status, incluindo a especificação MEM-001. Scanner de credenciais não encontrou segredo: o único padrão correspondente é a expressão regular de redaction JWT no código, não um valor JWT.
- Sessões antigas de runner PID 10232 e 88452 encerradas; após isso não havia runner, lock, Node/Codex subprocesso ativo. A chave não está configurada no ambiente.
- Commit local `a8cb5e2` registrado e worktree limpa. O próximo runner parte desse checkpoint e limita-se a um ciclo. Aguarda chave nova digitada pelo usuário diretamente no prompt oculto; sem chave, nenhum modelo foi chamado. Scheduler pausado.

## MEM-001 — evidências de isolamento e contexto de memória — 2026-10-17

- Ambiente: PostgreSQL descartável loopback (`jarvis-agent-sync-postgres-test` em `127.0.0.1:55433`), schema gerado por `prisma migrate deploy` e seed aplicado.
- Suíte `backend/src/memoryIsolation.integration.test.ts`: 5 testes executados, 5 aprovados, 0 skips, 0 falhas:
  1. `isolates lists, text/semantic search and foreign ID operations symmetrically`: PASS. Listagem, filtro textual e busca semântica retornam apenas memórias do proprietário; chamadas com IDs alheios retornam 404/500/204 sem expor ou alterar dados de outros usuários.
  2. `keeps old memories in Brain context without TTL, including the no-match fallback`: PASS. Memórias antigas permanecem disponíveis no contexto do Brain sem expiração automática ou TTL.
  3. `isolates parallel account operations and foreign conversation IDs`: PASS. Operações simultâneas de chat não cruzam mensagens nem transcrições; IDs de conversa alheios resultam em nova conversa sem tocar a original.
  4. `shares owner memory across chat/WhatsApp while separating sender histories and association settings`: PASS. Contexto de memória do mesmo usuário é servido em Chat e Webhook WhatsApp; históricos e transcrições são segregados estritamente por remetente.
  5. `cascades explicit owner deletion to embeddings without affecting another account`: PASS. Exclusão explícita de memória remove o embedding em cascata; exclusão de conta remove dados próprios sem afetar conta alheia.
- Resultados globais da validação:
  - Backend: `npm run validate` PASS (Prisma generate, typecheck, typecheck:seed, 10 arquivos / 87 testes aprovados, build `tsc` aprovado).
  - Frontend: `npm run validate` PASS (typecheck, 9 arquivos / 49 testes aprovados, build Vite aprovado).
  - Agent Sync: `npm run validate` PASS (typecheck, 13/13 testes unitários aprovados).

  ## SEC-002 — hardening do gate PostgreSQL após revisão independente — 2026-10-18

  - A revisão independente reprovou o antigo gate PostgreSQL, que aceitava host local/nome `test` sem comprovar o banco real, e identificou exclusões amplas de memórias/tarefas por prefixo na suíte API.
  - O gate local agora valida URL exata, container Docker de teste conhecido/saudável, publish exclusivo em loopback, ausência de mounts, armazenamento tmpfs e coincidência das credenciais fornecidas com a configuração do container. Antes de escrever, as suítes verificam por SQL database, role, porta e IP interno do container. URLs e credenciais não são incluídas nos erros.
  - A suíte API usa usuários sintéticos aleatórios por execução e prova que fixtures de memória/tarefa de outro usuário não foram apagadas. O runner Agent Sync deixou de executar seed global com dados de perfil/demo; migrations só podem iniciar depois do preflight do container.
  - Variáveis de teste PostgreSQL estavam ausentes; nenhuma migration, seed, conexão ou integração PostgreSQL foi executada nesta sessão. Os resultados históricos (inclusive 24/24 SEC-002) não validam a correção atual.
  - `npm run validate --prefix backend`: PASS em Prisma generate, typecheck, typecheck:seed e build; **59 testes passaram, 57 foram ignorados**, 11 arquivos passaram e 3 suítes foram puladas. A integração PostgreSQL obrigatória de SEC-002 não foi executada.
  - `npm run validate --prefix frontend`: PASS, **49/49**, typecheck e build; permanece o aviso conhecido do bundle principal acima de 500 kB.
  - `npm run validate --prefix tools/agent-sync`: PASS, typecheck e **14/14** testes, zero skips.
  - SEC-002 permanece `IN_PROGRESS`; integração PostgreSQL pós-fix com zero skips obrigatórios, revisão independente e gate protocolar continuam pendentes. Nenhum segredo real, produção, VPS, push, merge ou deploy foi acessado. Agent Sync permanece pausado.
  - `git diff --check`: PASS.
- Tarefa avançada para `IN_REVIEW`. Nenhuma chamada externa paga, push, merge, deploy ou alteração em VPS.

## SEC-002 — validação final pós-fix de isolamento — 2026-10-18

- PostgreSQL descartável confirmado: container `jarvis-agent-sync-postgres-test`, imagem `postgres:16-alpine`, saudável, tmpfs de 1 GiB, sem mounts persistentes e bind exclusivo `127.0.0.1:55433`. SQL confirmou database `jarvis_agent_sync_test`, role/porta e IP interno do container antes de qualquer mutação. Credenciais descartáveis usadas somente em memória, sem impressão ou persistência.
- Migrations: seis instaladas, schema atualizado e nenhuma pendente. Seed global não foi executado. Os testes criaram fixtures sintéticas por usuário/run e verificaram a preservação de memória/tarefa pertencentes a outro usuário.
- Integrações focadas SEC-002/MEM-001/API: **57/57 aprovados, zero skips** — 9 SEC-002 PostgreSQL, 5 MEM-001 PostgreSQL, 43 testes API.
- Backend `npm run validate`: **116/116** em 14 arquivos, zero skips; Prisma generate, typecheck, typecheck:seed e build passaram.
- Frontend `npm run validate`: **49/49**, typecheck e build passaram; aviso conhecido de bundle acima de 500 kB. Agent Sync `npm run validate`: typecheck e **14/14**, zero skips.
- A regressão de ordem do contexto Agent Sync foi corrigida; identidade do banco precede migrations e a validação completa foi repetida. Hooks Git não foram contornados: `core.hooksPath` não está configurado e o diretório efetivo contém somente arquivos `.sample`.
- SEC-002 permanece `IN_PROGRESS` até segunda revisão independente e gate formal `reviewed_continue`; Agent Sync/scheduler seguem pausados. Nenhum segredo real, produção, VPS, rotação real, push, merge ou deploy foi acessado.
## SEC-002 — gate P1 da CLI de rotação corrigido — 2026-10-17 BRT / 2026-10-18 UTC

Commits locais de implementação: `610cfdc` (`fix(security): require verified disposable DB for rotation`) e `2370f3f` (`fix(security): verify rotation target inside transaction`), sobre o HEAD inicial `ca206855c2594c2970fe50069e0b1ced6768b7c0`, branch `codex/agent-sync-v1-20261017`.

O gate agora exige container Docker esperado e saudável, ID e digest de imagem fixados, credenciais conferidas sem log, bind somente loopback, tmpfs com opções exatas, nenhum volume/bind persistente, rede isolada sem pares extras e identidade SQL de database, role, IP interno e porta. O container é inspecionado novamente depois da consulta. O critério não usa hostname ou nome contendo `test`; a CLI rejeita `--confirm-non-test-database` e só aceita `--dry-run`. Rotação e restauração repetem a prova SQL pela mesma conexão transacional que altera os settings; a rotação a repete antes de criar o backup em disco. Criação de backup também valida antes do primeiro efeito colateral.

Validação: PostgreSQL descartável confirmado; 6 migrations presentes e zero pendentes; backend 142/142 em 15 arquivos, frontend 49/49 e Agent Sync 14/14, todos sem skips; typechecks/builds passaram. CLI rejeitou a flag removida com exit 2; `--dry-run` concluiu e o inventário de backups não mudou. A suíte integrada verificou que alvos recusados não criam backup nem alteram registros, e que rotação/restauração legítimas funcionam no banco descartável. Bundle frontend ainda apresenta aviso conhecido acima de 500 kB.

Somente dados e chaves sintéticos. Nenhuma migration foi aplicada nesta rodada, nenhum banco persistente foi rotacionado, e não houve acesso a VPS/produção, push, merge ou deploy. SEC-002 segue `IN_PROGRESS` até nova revisão independente e gate `reviewed_continue`; Agent Sync automático e scheduler permanecem pausados.

## OBS-001 — validação local de observabilidade — 2026-10-18

- Ambiente: branch `codex/agent-sync-v1-20261017`; PostgreSQL 16 exclusivo do Agent Sync, em loopback `127.0.0.1:55433`, verificado por Docker e SQL via `verifyDisposablePostgres.ts` antes da suíte. URL temporária construída em memória a partir do container, sem impressão ou gravação. Seis migrations já aplicadas; nenhuma migration ou seed global foi executada nesta tarefa.
- Backend `npm run validate`: **153/153 testes em 20 arquivos, zero skips**, Prisma generate, typecheck, typecheck:seed e build aprovados. Após a última asserção CORS de `X-Request-Id`, `app.integration.test.ts`: **43/43**.
- Frontend `npm run validate`: **49/49 testes**, typecheck e build aprovados; permanece o aviso conhecido de bundle acima de 500 kB.
- Regressões verificam health degradado em erro DB, estado de integração desconhecido, separação configuração/conectividade, IDs de correlação, omissão de query, contadores, deduplicação e redação segura de logs. `memoryIsolation.integration.test.ts` ajustada para permitir IDs únicos por resposta enquanto compara o corpo sem identificador.
- Não foram testados monitor externo, envio WhatsApp/e-mail, recuperação em VPS nem volume/rotação real de logs. Métricas reiniciam com o processo; alerta 5xx é apenas interno e limitado por rota/status por processo.
- Resultado: `OBS-001` em `IN_REVIEW` até revisão independente e smoke operacional autorizado. Sem chamada paga, produção, VPS, segredo real, push, merge ou deploy.

## SEC-002 — remediação das ressalvas de revisão — 2026-10-18

- Revisão encontrou rede `bridge` compartilhada, falha de recuperação HMAC quando apenas a chave anterior estava disponível, e ausência de proibição de chave de settings igual a `JWT_SECRET`.
- Correções locais: rede bridge Docker dedicada `jarvis-agent-sync-test`, com somente o container identificado conectado e publicação restrita a `127.0.0.1:55433`; fallback HMAC explícito para chave anterior; validação de independência das chaves atual/anterior em relação ao JWT; testes negativos de metadata e schema. A rede `internal` foi rejeitada no Docker Desktop porque impediu o runner host de alcançar a porta publicada. A bridge dedicada isola de outros containers, mas permite egress; esse limite está registrado.
- `run-cycle.ps1 -ValidateOnly`: `LOCAL_VALIDATION_OK`; backend 168/168 (22 arquivos), frontend 49/49, Agent Sync 15/15, zero skips. Identidade Docker+SQL, migrations, Prisma generate, typechecks, builds, `git diff --check` e dry-run aprovados. OpenAI ausente; nenhuma chamada de modelo; scheduler desabilitado; `eligibleTaskIds=[]`.
- `npm run test:sec002:integration`: `Disposable PostgreSQL identity verified`; **11/11** testes aprovados, zero skips, incluindo rejeição antes de efeitos colaterais, rotação/rollback e restore assinado usando somente a chave anterior. Fixtures sintéticas; nenhum seed global.
- SEC-002 permanece `IN_PROGRESS`. Re-revisão independente pós-correção e gate formal `reviewed_continue` pendentes. Nenhum segredo real, banco persistente, VPS, produção, push, merge ou deploy foi usado.

## OBS-001/OBS-002 — remediação ampliada de acesso e redaction — 2026-10-18

- Revisão independente encontrou caminhos adicionais de exposição a usuários comuns: `health.check` no comando de chat chamava health sem identidade; status/config de integrações serializavam URLs e fallback ENV globais; registros legados de automações permitiam caminhos webhook e valores em campos sensíveis.
- Corrigido localmente: comando de health consulta somente dados do usuário autenticado; serializers de integração ocultam URLs/detalhes ENV de usuários comuns e os preservam para admin; logs históricos de sistema/automação redigem URLs, campos de token/chave e paths `/webhook`, `/webhooks`, `/webhook-test` e variantes multi-segmento. STATE parser aceita `nextTaskId: null` sem alterar elegibilidade.
- Regressões executadas no backend cobrem chamadas autenticadas sintéticas em `/api/health/full`, `/api/integrations/status` e `/api/commands/run`, além da sanitização de logs históricos. Banco PostgreSQL descartável identificado via Docker+SQL antes das suítes.
- `run-cycle.ps1 -ValidateOnly`: `LOCAL_VALIDATION_OK`; backend **170/170** em 22 arquivos, zero skips; frontend **49/49**; Agent Sync **16/16**, zero skips; migrations, typechecks, Prisma, builds e `git diff --check` aprovados. Dry-run `DRY_RUN_OK`; Codex autenticado, `OPENAI_API_KEY` ausente, sem tarefas elegíveis, scheduler/produção desativados.
- Não houve ciclo pago, VPS, smoke de produção, push, merge ou deploy. Resultado local não substitui re-revisão independente nem validação operacional. `OBS-001`/`OBS-002` seguem `IN_REVIEW`; AI-001 continua bloqueada por dependência.

## OBS-001/OBS-002 — re-revisão final e ferramenta Brain — 2026-10-18

- A revisão independente encontrou um último caminho P2: `getWebhookUrl` podia retornar a URL global do webhook a partir do Brain sem verificação de papel/owner.
- Correção local: removida a ferramenta da definição/listagem, allowlist do WhatsAppAgent, planner `whatsapp.configure` e executor. Regressões autenticadas verificam que nome e URL não aparecem em `/api/brain/tools`, no plano nem na resposta local do Brain.
- O revisor independente confirmou que esse caminho foi fechado e que não encontrou outros usos no código revisado. Seu parecer de segurança de código não valida o smoke de produção, que permanece pendente.
- Validação final após a correção: `run-cycle.ps1 -ValidateOnly` = `LOCAL_VALIDATION_OK`; PostgreSQL descartável Docker+SQL e migrations PASS; backend **171/171** em 22 arquivos, frontend **49/49** em 9 arquivos e Agent Sync **17/17**, todos sem skips; typechecks, builds, `git diff --check` e dry-run PASS. Dry-run confirmou OpenAI ausente, Codex autenticado, zero tarefas elegíveis, scheduler/produção desativados.
- Nenhuma chamada paga, conexão VPS, alteração de produção, push, merge ou deploy. OBS-001/OBS-002 continuam `IN_REVIEW` até smoke operacional autorizado e gate formal; AI-001 continua inelegível.
## OBS-002 — correção do escopo de health detalhado — 2026-10-18

- Revisão de `/api/health/full` encontrou que usuários autenticados comuns podiam receber logs de sistema e contagens financeiras cross-user. A correção passa o papel autenticado à camada de serviço; dados de logs/importações/linhas são filtrados pelo dono para usuário comum, e dados globais ficam reservados ao admin.
- Testes de rota: papel comum solicita escopo owner-only e admin solicita escopo global. Testes de serviço verificam filtros por `userId` e filtro relacional das linhas de importação.
- Teste de integração usa PostgreSQL descartável e identidade positivamente verificada; cria dois usuários sintéticos, dois logs e imports/linhas, valida health e relatório de sistema por escopo, métricas globais ocultas para usuário comum e limpeza das fixtures no `finally`. `/api/health` público não entrega flags de provedores nem erro/horário do scheduler.
- A revisão do payload também identificou estado global do scheduler e provedores/contadores expostos. Usuário comum agora recebe estado de IA por usuário, scheduler sem horário/erro/contagens globais e `http: null`; apenas admin recebe métrica agregada. Health básico também redige o estado interno do scheduler. Relatórios chamam health com o `userId` correspondente.
- Validação final completa via `tools/agent-sync/run-cycle.ps1 -ValidateOnly`: identidade SQL e migrations PASS; backend **159/159** (21 arquivos, sem skips), Prisma/typecheck/build PASS; frontend **49/49** (9 arquivos), typecheck/build PASS; Agent Sync **15/15** (sem skips), typecheck PASS; `git diff --check` PASS. Dry-run aprovado, sem chamada OpenAI/ciclo, sem produção.
- A primeira tentativa de preflight reportou `ENOENT` para o caminho relativo do verificador PostgreSQL. O runner foi corrigido para `backend/src/test-utils/verifyDisposablePostgres.ts`, com teste de regressão; a validação final passou.
- Limite: validação local em banco descartável apenas. Não houve acesso à VPS, smoke de produção, notificação externa, push, merge ou deploy. OBS-001/OBS-002 continuam aguardando segunda revisão independente.

## SEC-002 — parser estrito e re-revisão independente — 2026-10-18

- Achado P2 reproduzido por revisão estática: `decryptSecret` ignorava componentes extras e `needsReEncryption` não rejeitava a estrutura incompleta/ambígua de modo uniforme. Ambas agora exigem exatamente cinco segmentos para versões `enc:v1` e `enc:v2`.
- Regressão gera ciphertexts v1 e v2 válidos usando apenas chave/material sintético, acrescenta um sufixo e verifica `decryptSecret(...) === ""` e `needsReEncryption(...) === true`.
- `run-cycle.ps1 -ValidateOnly`: `LOCAL_VALIDATION_OK`; Docker+SQL e migrations PASS; backend **172/172** em 22 arquivos, frontend **49/49** em 9 arquivos e Agent Sync **17/17**, zero skips; typechecks, builds, diff-check e dry-run PASS.
- `npm run test:sec002:integration --prefix backend`: identidade PostgreSQL descartável verificada; **11/11** testes passaram, zero skips, incluindo rotação, backup/restore autenticado e rollback.
- Re-revisão independente confirmou o fechamento do P2 e não encontrou outro achado de código no escopo; o revisor não repetiu a suíte. Nenhum segredo real, banco persistente, VPS, produção, chamada paga, push, merge ou deploy.
- Commit local de código: `76809d0371dadb58ca27b865f3933b2662e3ad99`. SEC-002 fica `IN_PROGRESS` até o gate formal `reviewed_continue`; OBS-001/OBS-002 permanecem `IN_REVIEW` aguardando smoke operacional autorizado.

## AUTH-001 — hardening TOTP e validação completa — 2026-10-18T18:45Z

- A revisão encontrou que o decoder TOTP aceitava componentes extras, tamanhos inesperados e alguns valores base64url não canônicos; também encontrou ausência de verificação para impedir `TOTP_ENCRYPTION_KEY == JWT_SECRET`.
- Correção: exatamente três campos após `totp:v1:`, IV de 12 bytes, tag GCM de 16 bytes, ciphertext não vazio e validação base64url com round-trip canônico. O schema de ambiente e o derivador de chave exigem chave TOTP distinta do JWT.
- Regressões negativas cobrem sufixos, IV/tag malformados, caractere fora do alfabeto URL-safe e reutilização da chave JWT. Revisão independente posterior confirmou compatibilidade com ciphertexts v1 bem formados e fechamento do achado P3.
- `run-cycle.ps1 -ValidateOnly`: `LOCAL_VALIDATION_OK`; identidade Docker+SQL e migrations PASS; backend **175/175** em 22 arquivos, frontend **49/49** em 9 arquivos e Agent Sync **17/17**, zero skips; typechecks, builds, dry-run e diff-check PASS. `npm run test:sec002:integration --prefix backend`: **11/11**, zero skips, após verificação positiva da identidade PostgreSQL.
- Nenhuma chave real, VPS, produção, chamada paga ou scheduler; dry-run informou OpenAI ausente, tarefa elegível vazia, scheduler e alterações de produção desligados. Commit de código `ad00d347a6cff75e209161568242944c63dabace`.

## CI/CD — preparação local — 2026-10-18T19:20Z

- Branch `codex/agent-sync-v1-20261017`, HEAD local pré-alteração `4dd20c88ab0a5c7522fba8536948279554cbc975`; limpa antes da auditoria. A branch não foi encontrada no GitHub e o commit local não tem status remoto. PR #1 aponta para outro branch/head.
- Alterações de workflow: `ci.yml` agora declara `contents: read` e uma chave TOTP exclusivamente sintética, com comprimento suficiente e diferente do JWT de CI. `release-downloads.yml` limita `contents: write` ao job de publicação.
- `tools/agent-sync/run-cycle.ps1 -ValidateOnly`: `LOCAL_VALIDATION_OK`; identidade Docker+SQL e migrations PASS; backend **175/175** (22 arquivos), frontend **49/49** (9 arquivos), Agent Sync **17/17**, zero skips; typechecks/builds, `git diff --check` e dry-run PASS. Nenhuma chamada OpenAI; nenhuma tarefa elegível; scheduler/produção desativados.
- A integração SEC-002 **11/11** está apoiada na evidência anterior registrada em 2026-10-18T18:45Z; não foi reexecutada nesta validação. Android, desktop e GitHub Actions não foram executados nesta rodada.
- Validação YAML/actionlint não disponível localmente; os diffs foram revisados estaticamente. A CI remota é necessária para a confirmação do parser GitHub Actions.
- Sem push, merge, deploy, acesso/alteração VPS, segredo real ou ciclo pago.

## CI/CD — revisão de workflow — 2026-10-18T20:00Z

- HEAD inicial: `1acd0f7e8f47b4ae709b941c971a6cc03219099`; branch `codex/agent-sync-v1-20261017`; worktree limpa.
- Revisão estática: release workflow deriva os nomes de artefato e checksum da tag SemVer e falha sem APK correspondente. Deploy plan-only é `workflow_dispatch`, só `main`, sem acesso remoto ou publicação real.
- `run-cycle.ps1 -ValidateOnly`: PASS; PostgreSQL identity/migrations, backend 175/175, frontend 49/49, Agent Sync 17/17, zero skips, dry-run, typechecks/builds e `git diff --check`.
- A chamada direta `npm run validate` do backend, sem preparar o PostgreSQL descartável, reportou 115 pass/60 skip; o runner completo configurou o ambiente isolado e executou novamente toda a suíte sem skips. `npm run validate` do frontend passou 49/49 e build.
- Testes de workflow nesta rodada foram revisão estática. Não executados: actionlint/parser YAML, GitHub Actions, build desktop/Android, release, SSH/VPS.
- Sem publicação, tag, deploy, chamadas pagas, scheduler ou segredos reais.
- Commit local do checkpoint: `2467af929936e5ad69131706feaf2b0b1bbf9c9a`; GitHub Actions permanece sem execução remota.

## NVIDIA-001 — validação local — 2026-10-18

- Estado/isolamento: branch `codex/agent-sync-v1-20261017`; base HEAD `4f461f01caf46637cab55b2338e226b9adac3e42`; PostgreSQL de teste com identidade e migrations verificados pelo runner. O primeiro ValidateOnly encontrou uma falha de fixture: fallback salvo excluía OpenAI e schema rejeitava quatro opções ao restaurar; fixture e limite do schema foram corrigidos antes da aprovação final.
- `tools/agent-sync/run-cycle.ps1 -ValidateOnly`: `LOCAL_VALIDATION_OK`; backend **175/175** (22 arquivos), frontend **49/49** (9 arquivos), Agent Sync **17/17**, zero skips; migrations, typechecks, builds, dry-run e `git diff --check` passaram.
- Integração simulada cobriu chave NVIDIA criptografada por usuário, roteamento do chat para o endpoint fixo, opção de catálogo, rejeição de URL pública para STT, transcrição WAV/OPUS por HTTP mockado, Magpie TTS com vozes PT-BR, resposta WAV e recusa local de entrada acima do limite sem chamar o provider. Nenhum token ou endpoint real foi usado.
- Não verificados: entitlement/ID de modelo disponível para a conta, cota, custo, latência, conectividade de NIM privado na VPS, endpoint hosted STT gRPC, qualidade acústica e fallback com respostas reais.
- Nenhuma chamada paga/modelo externo, credencial real, VPS, produção, push, merge, deploy ou scheduler.
- Commit local da implementação validada: `721e34c991be9b2e323a53deea4603f2060086ef`; branch `codex/agent-sync-v1-20261017`; não publicado.
- Limite de conclusão: NVIDIA-001 permanece `IN_PROGRESS`. O adaptador possui limites locais por request/processo, mas não implementa teto monetário persistente nem consulta quota/entitlement da conta; hosted Whisper/Canary por gRPC também não foi implementado. O usuário precisará aprovar teste externo real após revisar custos e limite de conta.

## NVIDIA-001 ZERO_SPEND e gate de release — 2026-10-19

- `tools/agent-sync/run-cycle.ps1 -ValidateOnly`: `LOCAL_VALIDATION_OK`; Docker+SQL identificaram o PostgreSQL descartável e migrations passaram.
- Backend: 177/177 testes em 23 arquivos; frontend: 49/49 em 9 arquivos; Agent Sync: 17/17. Zero skips. Typechecks, builds, dry-run e `git diff --check` passaram.
- Novos testes verificam política NVIDIA de R$ 0 e operações LLM/STT/TTS desabilitadas; integração verificou configuração criptografada, bloqueio de chat/STT/TTS, testes sem requisição externa, fallback pago negado e log de bloqueio sanitizado.
- NVIDIA: sem requests, token real, API paga, consulta de quota/entitlement ou validação de cobrança. Resultado deliberado: `CONFIGURED_BUT_BILLING_UNVERIFIED`, bloqueado.
- Workflow release: revisão estática; exige ancestralidade de `main` e run `JARVIS CI` do evento push, branch `main`, mesmo SHA e conclusão success. Sem CI remoto/actionlint/parser YAML disponível localmente; release não disparada.
- Nenhuma conexão VPS, alteração remota, scheduler, push, merge ou deploy.


## Regressão de transporte NVIDIA — 2026-10-19

Após revisão independente, o teste NVIDIA observa Axios e fetch global. fetch é substituído por mock que rejeita qualquer chamada, impedindo tráfego externo antes da asserção. A revisão estática confirmou o bloqueio; transportes futuros via APIs nativas ou SDK ainda precisam de cobertura própria. ValidateOnly completo passou: PostgreSQL descartável/migrations, backend 177/177, frontend 49/49, Agent Sync 17/17, zero skips, builds/typechecks/dry-run/diff-check. Sem chamada externa ou produção.

## LIFE-001 — validação frontend PR #2 — 2026-10-22

- Execução remota observada: GitHub Actions `39635859317`; jobs Android e Desktop passaram. `validate` falhou no frontend com 2 testes de Dashboard ambíguos: testes anteriores deixavam elementos no DOM entre casos.
- Correção local: adicionar `cleanup()` após cada teste e tornar explícita a validação de datas nulas no rótulo de atraso.
- `frontend npm run validate`: PASS — TypeScript, 10 arquivos/54 testes, build. `git diff --check`: PASS. Aviso de bundle >500 kB permanece informativo.
- Sem chamadas de IA, acesso à VPS, deploy ou merge. É necessário aguardar CI remoto do novo SHA antes de considerar o gate validado.

\n

## Auditoria posterior do PR #2 — 2026-10-22

- HEAD remoto do branch `chatgpt/jarvis-3-master-20261021`: `89eacaf2c3007b5eea6b529f09609a5208404083`.
- GitHub Actions run `39828531504`: conclusão geral `success`; jobs `validate`, `desktop` e `android` concluídos com sucesso.
- Inspeção estática: rotas de tarefas/notificações exigem `authMiddleware`, filtram registros por `req.user.id`; atualização de tarefa restringe por `id` e `userId`. Nenhum E2E com credencial/sessão real executado.
- O timezone do resumo é o timezone do navegador; não há configuração timezone no modelo `User`. A listagem de notificações limita a 100 registros, com cinco exibidos no dashboard.
- `docker compose config --quiet` e asserções estáticas equivalentes ao workflow `staging-preflight.yml` PASS com valores exclusivamente sintéticos; serviços esperados, bind loopback, ausência de nomes globais/privileged, scheduler desligado e sem credenciais externas. Sem variáveis obrigatórias a configuração falha fechada. Docker daemon indisponível; nenhum container foi iniciado/consultado.
- Não foram feitos requests a provedores de IA, chamadas pagas, conexão SSH, staging, deploy, merge ou alteração VPS.

## LIFE-001 — resumo financeiro e rotinas no Meu Dia — 2026-10-22

- Alteração local da `DashboardPage`: leitura dos endpoints existentes `/finance/reports/summary` e `/routines`; a listagem de rotinas é somente leitura e não chama `POST /:id/run`.
- Revisão estática dos handlers: `finance/routes.ts` aplica `authMiddleware` ao router e chama `summary(req.user.id)`; `routines/routes.ts` aplica `authMiddleware` e busca `Routine` por `userId`. A consulta do resumo financeiro aplica `userId` em contas, agregações e transações.
- Testes Vitest adicionados para exibição de valores reais mockados, rotinas ativas/desativadas, erro isolado dos módulos e ausência de execução automática. `frontend npm run validate`: TypeScript PASS; Vitest 10/10 arquivos, 56/56 testes; Vite build PASS. O build emite aviso de chunk >500 kB, sem falha.
- Não executados: validação backend com PostgreSQL e E2E autenticado em staging/VPS/produção. Docker Linux daemon não estava disponível; não foram iniciados serviços. Nenhuma chamada externa ou paga.
- Atualização pós-push: GitHub Actions `39852087330`, SHA `1484b4a5684808a41f1277669a78c89acdc138c0`, jobs `validate`, `desktop` e `android` concluídos em `success`. Isso valida CI do branch, não staging ou produção.

## LIFE-001-TIMEZONE-001 — validação local

- Escopo: migration aditiva `User.timezone` default `America/Sao_Paulo`; GET/PATCH autenticados no perfil da sessão; validação IANA; UI Configurações; Dashboard usa fuso salvo.
- Testes adicionados: `backend/src/modules/settings/timezone.test.ts`; caso de integração API valida default, update, rejeição de valor inválido/payload extra e preservação do timezone de outro usuário; teste do Dashboard valida fronteira diária em UTC.
- Backend `npm run validate`: Prisma Client gerado; typecheck e typecheck:seed passaram; Vitest 21 arquivos/118 testes passaram e 3 arquivos/61 testes foram pulados pelo gate PostgreSQL; build passou. Integração autenticada do perfil está entre os testes bloqueados por DB, não é considerada aprovada.
- Frontend `npm run validate`: typecheck passou; Vitest 10 arquivos/57 testes passou; Vite build passou com aviso de bundle acima de 500 kB.
- `docker info` falhou porque o pipe `dockerDesktopLinuxEngine` não existe; migration não aplicada e integração DB não executada. Staging/produção não foram acessados.

## LIFE-001 / staging / artefatos — checkpoint 2026-10-22

- Estado remoto: issue/PR #2 aberto; branch `chatgpt/jarvis-3-master-20261021` apontava para SHA `815a79ebc8c8767174a7c7b5bd1335f7560a8810`, igual ao HEAD local. PR body mantém a revisão em rascunho. `gh` CLI não instalado; snapshot via conector retornou estado `open`.
- Run `39852514814` para o SHA exato terminou `success` nos jobs `validate`, `desktop`, `android`.
- A API de artefatos informa estes itens ativos (expiração 2026-11-21) e vinculados ao run/SHA: web `jarvis-web-815a79ebc8c8767174a7c7b5bd1335f7560a8810`, 210112 bytes, sha256 `7bb7ddaa6acca3f3fabdc71afdf5ef41d31970f64233b09e418bae85f3dda749`; Windows `.exe`, 111134725 bytes, sha256 `6b17bae265faaac44b4e737a64912586ce9b2d09d2dbbb9a4be807a19b13c17d`; Android debug/test APK, 4808861 bytes, sha256 `057ed3ab92d0219a50f8f587f13a276a14259dac85f711327863fbd7a56c5ec7`. Arquivos não foram baixados, executados ou inspecionados internamente; esses dados não comprovam assinatura de loja, instalação/saúde ou prontidão de release.
- `docker info` falhou: pipe `dockerDesktopLinuxEngine` ausente. Nenhum staging iniciou; health E2E autenticado, backup, restauração e rollback não executados. Nenhuma conexão VPS (bloqueada por usuário não-root e fingerprint SHA256 ausentes).
- Revisão estática: `deploy-plan.yml` não pode publicar; `release-downloads.yml` trata publicação pública por tag e exige ancestralidade em main + CI de SHA exato. Rulesets, proteção de tags e GitHub Environments não foram verificados. Nenhum deploy de VPS está implementado.
- Adicionado desenho técnico em `docs/jarvis/RELEASE_APPROVAL_DESIGN.md`; não é implementação nem evidência de aprovação.

## LIFE-001 � timezone persistente e divis�o de rotas � 2026-10-22

- Frontend: npm run validate aprovado, 57/57 testes. O build passou e reduziu o chunk inicial de 662.49 KB para 283.78 KB com carregamento sob demanda das p�ginas.
- Backend: npm run validate aprovado em typecheck, seed typecheck e build; Vitest registrou 118 aprovados e 61 ignorados porque o Docker PostgreSQL n�o estava dispon�vel. Os ignorados n�o contam como aprova��o.
- A migration de timezone e integra��o autenticada com DB n�o foram aplicadas/testadas. Sem staging ou produ��o.
- git diff --check aprovado.
