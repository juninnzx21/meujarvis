# JARVIS — plano mestre de evolução supervisionada

**Fonte de verdade do backlog.** Atualizar este arquivo junto de `JARVIS_PROGRESS.md` e `docs/jarvis/STATE.json`. IDs são estáveis; nunca apagar histórico.
**Baseline inicial:** versão local auditada `v2.0.0`, SHA `eec24a6f01cd2b60da358a198da3ba32641afe1e`; branch local `codex/jarvis-2.0-platform-20261015`. Em 16/10/2026 o `main` remoto anunciava `ee4f98734257c5a56518662d5a0127f09358eb32`, divergente e com grandes diferenças de produto. O PR #1 está aberto, mergeable e aponta exatamente do branch local para `main`; usar o head do PR como base local de trabalho, sem mesclar/publicar o PR automaticamente.

## Regras de execução

- Em cada execução: obter lock exclusivo com expiração; ler este plano, progresso, estado, runbook, decisões, evidências, registro de segurança e auditorias; conferir Git/ambiente; escolher uma tarefa elegível; checkpoint antes de mudança; testar; registrar resultado atomicamente; liberar lock.
- Preservar os outros sistemas da VPS, dados, backups, volumes, repositórios e configurações. Não executar deploy/restart/migração, abrir portas, alterar DNS/SSH/firewall, apagar dados ou enviar mensagens sem autorização própria e plano de rollback.
- Não importar segredos. Usar ambientes de teste isolados. Nunca liberar credencial, payload, prompt privado ou log bruto em relatórios públicos.
- Somente `DONE_VERIFIED` após critério de aceite, evidência reproduzível e commit/artefato identificado. Distinguir código, mock, CI, staging e produção.
- Nenhum runner recorrente pode fazer deploy automático. O agendador permanecerá desabilitado até dry-run, ciclo manual supervisionado e aprovação de ativação.
- Resultados do Agent Sync distinguem `blocked` (planejamento/elegibilidade), `validation_failed` (suíte local), `no_changes` (nenhum diff; sem revisão GPT) e `review_rejected` (revisor chamado e recusou). `testsPassed` representa somente a validação local do coordenador; nunca prova implementação.

## Estado e tarefas

Status permitidos: `TODO`, `READY`, `IN_PROGRESS`, `BLOCKED`, `FAILED`, `IN_REVIEW`, `DONE_VERIFIED`, `DEFERRED`.

| ID | Prioridade | Dependências | Escopo / critério de aceite | Status inicial |
|---|---|---|---|---|
| BASE-000 | P0 | — | Baseline local, remoto, produção pública, auditorias e checkup registrados; sem alterar app | IN_REVIEW |
| BASE-001 | P0 | BASE-000 | Comparar branches/commits; preservar Android, desktop, TTS, release e trabalho não commitado. PR #1 (aberto, mergeable) documenta integração do head local para main; revisão/merge continuam decisão humana | IN_REVIEW |
| BASE-002 | P0 | BASE-001 | Mapear 12 auditorias e checkup VPS por IDs sem publicar dados operacionais sensíveis | IN_REVIEW |
| CONSOL-001 | P0 | BASE-000, BASE-001, BASE-002 | Comparar cópias do JARVIS, definir origem do código, registrar inventário privado e evitar limpeza até restore e dependências comprovados | IN_REVIEW — repositório oficial definido; branch de plataforma é candidata; inventário operacional mantido fora do GitHub público; sem limpeza |
| TEST-001 | P0 | BASE-001 | Ambiente PostgreSQL descartável e segredo de teste; suíte de integração completa e isolamento entre usuários | DONE_VERIFIED — PostgreSQL temporário local, migration/rollback, backend 82 testes |
| SEC-001 | P1 | BASE-001, TEST-001 | Autenticar webhook Evolution, instância/remetente, rate limit, replay/idempotência | IN_REVIEW — teste PostgreSQL concluído; falta validação Evolution/staging |
| SEC-004 | P1 | SEC-001, TEST-001 | Eliminar URL arbitrária de mídia com chave Evolution; aceitar mídia segura e testar regressões | IN_REVIEW — teste PostgreSQL e limites base64; falta validação Evolution/staging |
| SEC-002 | P1 | BASE-001, TEST-001 | Chave de cifragem independente de JWT, versão e rotação/re-encriptação com backup testado | IN_PROGRESS — gate Docker+SQL, HMAC, rotação/restore e parser estrito de cinco segmentos revisados; backend 172/172, frontend 49/49, Agent Sync 17/17 e integração SEC-002 11/11 sem skips; re-revisão independente de código sem achado aberto conhecido; gate formal `reviewed_continue` pendente |
| SEC-003 | P1 | BASE-001, acesso de leitura à VPS | Confirmar Compose efetivo e eliminar defaults inseguros em produção; teste de fail-closed, sem expor valores | BLOCKED |
| AUTH-001 | P1 | TEST-001 | MFA/TOTP administrativo, recuperação verificada, revogação de sessões, política de papéis e testes | IN_REVIEW — revisão independente fechou parser TOTP não canônico; cifra exige formato/base64url estritos e chave distinta de JWT; backend 175/175, frontend 49/49, Agent Sync 17/17; CI da branch e provisionamento operacional da chave ainda pendentes; sem deploy |
| OBS-001 | P1 | BASE-001 | Health de dependências, correlation ID, logs sanitizados, métricas de falhas e alertas sem falsos estados “conectado” | IN_REVIEW — revisão independente identificou e a remediação removeu o último caminho global no Brain (`getWebhookUrl`); regressões cobrem lista de ferramentas, plano e resposta; validação local passou (backend 171/171, frontend 49/49, Agent Sync 17/17, zero skips); re-revisão do código encerrada sem achado aberto conhecido; smoke operacional autorizado ainda pendente |
| OBS-002 | P1 | OBS-001, TEST-001 | Remediar autorização/isolamento cross-user em `/api/health/full`; usuário comum só consulta seus logs/contagens e status de configuração próprio; admin recebe visão global; sanitizar logs em leitura | IN_REVIEW — escopo por usuário/admin e redação de logs históricos foram revisados; último achado P2 no Brain foi fechado e re-revisado; ValidateOnly final passou (backend 171/171, frontend 49/49, Agent Sync 17/17, zero skips); smoke operacional autorizado ainda pendente; não promove OBS-001 |
| AI-001 | P1 | TEST-001, OBS-001 | Testes reais, controlados e com limite de custo de OpenAI/Gemini/Ollama; seleção, quota, fallback e circuit breaker | TODO |
| NVIDIA-001 | P2 | TEST-001 | Integrar NVIDIA NIM para conversa, STT e TTS com seleção, fallback e controles; validar sem chamadas pagas e documentar limites de cota | IN_PROGRESS — política backend `NVIDIA_ZERO_SPEND` persistida por usuário, R$ 0/mês, sem chamadas NVIDIA e fallback pago bloqueado quando NVIDIA é principal; backend 177/177, frontend 49/49, Agent Sync 17/17. Falta evidência confiável de preço/quota/entitlement sem cobrança; hosted Whisper/Canary gRPC não implementado |
| AI-002 | P2 | AI-001 | Roteamento semântico, decomposição e tool calling com schemas, limite de passos/tempo/custo e proteção a prompt injection | TODO |
| WEB-001 | P2 | AI-001 | Busca web citável, com fonte, timestamp e distinção entre fato/inferência/memória | TODO |
| MEM-001 | P1 | TEST-001 | Regressões de isolamento, exclusão, concorrência e memória cross-channel; seguir critérios em `docs/jarvis/tasks/MEM-001.md`. O PostgreSQL fica no coordenador local; o sandbox Codex não recebe URL/rede, e a suíte é repetida pelo coordenador | IN_REVIEW — 5/5 testes no PostgreSQL descartável aprovados (0 skips); backend 87 testes, frontend 49 testes, builds aprovados |
| MEM-002 | P2 | MEM-001 | Recuperação híbrida lexical+semântica, consentimento, proveniência, TTL, dedupe e limites de tokens | TODO |
| VOICE-001 | P1 | AI-001, OBS-001 | Testar STT pt-BR e TTS Piper/ElevenLabs/Fish/fallback em dispositivos reais; status de provedor/quota e erros | TODO |
| VOICE-002 | P2 | VOICE-001 | VAD, streaming, cancelamento, barge-in, latência e wake word opt-in com indicador | TODO |
| AGENT-001 | P1 | AUTH-001, TEST-001 | Preview/confirm tokenizado/expiração, executor allowlist, verificação pós-ação, auditoria e rollback | TODO |
| VPS-001 | P1 | AGENT-001, OBS-001 | API separada de operações allowlist para leitura/ações limitadas; jamais shell irrestrito/Docker socket no modelo | TODO |
| VPS-ACCESS-001 | P1 | OBS-001, BASE-001 | Preparar acesso SSH de agentes por chave dedicada, alias `jarvis-vps`, conta não-root, diagnóstico allowlist sem Docker socket, worktrees Codex/OpenCode separadas e autorização explícita para toda escrita | BLOCKED — usuário confirmou `[VPS_ENDPOINT_REDACTED]:22014` e autorizou somente leitura; faltam usuário não-root e fingerprint SHA256 da host key obtido por canal confiável. Nenhuma conexão ou alteração VPS |
| INT-001 | P1 | SEC-001, SEC-004, OBS-001 | E2E WhatsApp Evolution com número de teste, autorização de remetente, QR, webhook, áudio/resposta e estado real | TODO |
| INT-002 | P2 | OBS-001 | Importar/ativar/testar templates n8n em instância isolada com credenciais de teste | TODO |
| INT-003 | P2 | AUTH-001 | Testes Home Assistant com URL/token e entidade inofensiva, ação confirmada | TODO |
| INT-004 | P2 | AUTH-001 | Validar CRM, NFSe, frotas, marketplace, financeiro, e-mail, agenda e GitHub individualmente; mínimo privilégio | TODO |
| DEV-001 | P1 | VOICE-001 | Windows Electron em máquina limpa: mic, allowlist, atualizador, instalação/desinstalação e recovery | TODO |
| DEV-002 | P1 | VOICE-001 | APK/TWA: build reprodutível, assinatura, aparelho físico, limites de background e atualização | TODO |
| DEV-003 | P3 | Decisão de produto | Decidir e, se autorizado, desenvolver cliente iOS; não alegar suporte antes de QA | TODO |
| PERF-001 | P2 | OBS-001 | Coletar baseline de 24 h (VPS, bancos, filas, logs, containers, latência) antes de otimizar | BLOCKED |
| PERF-002 | P3 | PERF-001 | Otimizar bundle (~635 kB), CPU/RAM e recursos após medir; comparar antes/depois e rollback | TODO |
| AUTO-001 | P1 | BASE-001, BASE-000 | Runner/scheduler horario, lock, timeout, logs sanitizados, dry-run e recuperação; sem deploy; permanecer disabled até gate | IN_PROGRESS |
| SYNC-001 | P1 | BASE-001, TEST-001 | Agent Sync local GPT planejador/revisor + Codex desenvolvedor; ciclo bounded, diff sanitizado, validações, lock e aprovação; provar ciclo real antes de ativar recorrência | IN_PROGRESS — PostgreSQL 16 local saudável e runner validado; ciclo real aguarda chave OpenAI recém-rotacionada |
| QA-001 | P1 | SEC-001, TEST-001, VOICE-001, INT-001 | Executar matriz E2E real autenticada e atualizar evidências | TODO |
| REL-001 | P2 | QA-001 | Release versionada, changelog, artefatos assinados, rollback e manual | TODO |

## Riscos e rollback global

- **Risco imediato de código:** webhook público e URL de mídia não confiável no auditado; não presumir que produção está vulnerável/exposta sem verificar a versão/config efetiva. Mitigação é bloquear qualquer rollout, fixar primeiro em branch isolada e testar staging.
- **Divergência de código:** `main` remoto remove arquivos/componentes existentes no SHA local. Rollback: não alterar checkout atual; manter branch e ref remota separadas até revisão independente. Nunca `reset --hard`, `clean`, merge ou cherry-pick automático.
- **Deploy e dados:** cada tarefa futura exige backup verificado, plano/critério de rollback e autorização separada; não é parte deste baseline.
- **Automação:** timer atual não registrado/ativo; runner em dry-run por padrão. Limites de uso do Codex/ChatGPT continuam aplicáveis; não contornar quotas.

## Fontes de baseline

- 12 relatórios em `docs/audits/jarvis-v2-functional/` (ainda não commitados; preservar).
- Checkup de VPS: relatório detalhado mantido em armazenamento local privado; registrar no repositório público somente conclusões sanitizadas, sem inventários operacionais.
- Estado público atualizado em 16/10/2026 16:38 UTC; detalhes e limites em `docs/jarvis/TEST_EVIDENCE.md`.

## Execução de segurança atual — 2026-10-16 17:14 UTC

- Worktree persistente: `E:/jarvis-home-assistant/.codex-worktrees/jarvis-sec-20261016`; branch `codex/sec-001-004-webhook-media-20261016`, no head do PR #1. `E:/jarvis-home-assistant` não tem `.git`; não sobrescrever o código não versionado.
- SEC-001/SEC-004 implementadas localmente e em revisão, sem deploy. TEST-001 bloqueada sem PostgreSQL descartável; ver evidências em `docs/jarvis/TEST_EVIDENCE.md`.
- Commit local de implementação `2932b70` foi criado para revisão; não publicado. Próximo passo: disponibilizar DB isolado, executar migration e integração; revisar antes de push/merge/deploy. Automação segue pausada.

## Atualização da validação integrada — 2026-10-16 19:14 UTC

- Docker Desktop permaneceu parado para proteger containers/volumes existentes. O PostgreSQL instalado localmente estava incompleto (faltava `dict_snowball.dll`); a validação usou binários portáteis PostgreSQL 15.19 da EDB, extraídos em `%TEMP%`, cluster temporário na porta 55432 e bind em `127.0.0.1`.
- Migration aplicada, testada sobre duas mensagens legadas sem `externalMessageId`, revertida apenas no banco descartável e reaplicada. Os registros legados permaneceram e os IDs nulos passaram pelo índice único.
- Backend `npm run validate`: Prisma generate, typechecks, 9 arquivos/82 testes e build passaram; frontend `npm run validate`: 8 arquivos/47 testes e build passaram; desktop `npm run validate`: 4 testes, typecheck e build passaram.
- Mídia não é buscada por URL externa. O parser HTTP global do Express limita JSON a 1 MiB; portanto, o limite de 8 MiB da mídia é apenas um teto interno e requests maiores que o limite HTTP são rejeitados antes da rota. Não ampliar esse limite sem revisão de memória/DoS.
- SEC-001/SEC-004 permanecem IN_REVIEW até E2E autenticado em Evolution/staging. VPS/produção inalteradas. Agendamento Codex segue PAUSED e template Windows disabled.
- Próximo item elegível: SEC-002 (chave de cifragem dedicada e rotação), após registrar a revisão desta branch.

## Consolidação de código e auditoria de armazenamento — 2026-10-16

- Repositório oficial do código versionado: `https://github.com/juninnzx21/meujarvis`. `codex/jarvis-2.0-platform-20261015` é a candidata a base do produto; PR #1 segue aberto para revisão. SEC-001/004 permanecem sob revisão até E2E autenticado em staging Evolution.
- Cópias locais foram comparadas por hashes de código, sem integrar ou sobrescrever arquivos. As diferenças e cópias de trabalho permanecem preservadas. O inventário operacional detalhado foi mantido fora deste repositório público.
- Staging de migração contém conteúdo de vários sistemas e apresentou sobreposição parcial em código/documentação. Nenhum backup foi validado por restauração; por isso, nenhum candidato foi considerado seguro para remoção.
- Resultado: 0 arquivos removidos, 0 GiB liberados, sem mudança em VPS/Docker/serviços, sem merge/deploy. O agendamento horário continua pausado/desabilitado.
- Relatórios sanitizados: `docs/jarvis/CONSOLIDATION_MAP.md`, `docs/jarvis/VPS_STORAGE_AUDIT.md` e `docs/jarvis/CLEANUP_REPORT.md`. Manifestos e relatório detalhado ficam em armazenamento local privado.

## Gates e preparação CI/CD — 2026-10-18

- CI local atual passou em backend 175/175, frontend 49/49 e Agent Sync 17/17, sem skips. AUTH-001 ainda não tem CI remoto: a branch local atual não foi encontrada no GitHub e não foi publicada. O PR #1 testa outra branch/commit.
- Workflows endurecidos localmente: permissões `contents: read` por padrão, `contents: write` somente no job de publicação da release e chave TOTP sintética distinta do JWT na CI. Nenhum workflow de deploy existe; regras de proteção do GitHub não foram verificadas.
- Release atual usa assets/nome v2.0.0 fixos apesar do gatilho `v*`; não usar em novas versões até corrigir o fluxo de assets/tag.
- SEC-002 segue `IN_PROGRESS` até `reviewed_continue`; OBS-001/OBS-002 seguem `IN_REVIEW` até smoke operacional read-only; AUTH-001 segue `IN_REVIEW` até CI remoto e verificação protegida da chave TOTP. AI-001 continua inelegível até OBS-001 `DONE_VERIFIED`.
- Preparação e bloqueios de produção em `docs/jarvis/CI_CD_PRODUCTION_GATE.md`. Deploy não está pronto: faltam destino/host key/conta, Compose efetivo, health check confirmado, regras/environment GitHub e backup/restore/rollback comprovados em staging.
- CI/CD follow-up (2026-10-18): release tags are now SemVer-derived and fail closed without a same-version Android APK. `.github/workflows/deploy-plan.yml` is manual and no-op only; real deployment remains unimplemented pending verified VPS and staging evidence.

## SEC-002 — gate positivo de identidade para rotação — 2026-10-17 BRT

- HEAD inicial confirmado: `ca206855c2594c2970fe50069e0b1ced6768b7c0` na branch `codex/agent-sync-v1-20261017`; preservadas as alterações locais da tarefa.
- A CLI e os serviços de rotação exigem identidade positiva do container descartável por metadados Docker, imagem/digest fixados, bind exclusivamente loopback, tmpfs exato sem volumes persistentes, rede sem pares adicionais, credenciais do container e consulta SQL com database/role/IP interno/porta corretos. A identidade é inspecionada novamente após a consulta.
- Removida `--confirm-non-test-database`; `--dry-run` é a única flag. Sem flag, a CLI inicia operação real, ainda estritamente condicionada ao gate positivo Docker+SQL do banco descartável. O gate ocorre antes de backup, restauração ou escrita. URL local e nome contendo `test` não autorizam o alvo. Rotação/restauração repetem a prova SQL usando a mesma conexão transacional da operação; a rotação repete-a antes do backup em disco.
- Backend `npm run validate`: 142/142, zero skips; frontend 49/49; Agent Sync 14/14. PostgreSQL descartável positivamente verificado, seis migrations em dia. CLI rejeitou a flag antiga e dry-run terminou sem alterar inventário de backups. Commits locais `610cfdc` e `2370f3f`. Nenhum segredo real, rotação persistente, VPS, produção, push, merge ou deploy.
- SEC-002 permanece `IN_PROGRESS` para revisão independente; scheduler/Agent Sync automático pausados. Evidências em `docs/jarvis/tasks/SEC-002-VALIDATION.md`.

## SEC-002 — ressalvas de revisão e remediação local — 2026-10-18

- Revisão local encontrou: rede padrão compartilhada; recuperação HMAC dependente indevidamente da chave atual; ausência de validação para impedir a reutilização de JWT como chave de settings.
- O container de teste foi movido para uma bridge Docker dedicada, única rede conectada e único membro; o bind continuou em loopback. Uma bridge dedicada não bloqueia egress, limitação documentada. A rede `internal` foi testada e descartada porque o Docker Desktop impediu o acesso host ao PostgreSQL publicado em loopback.
- O código agora tenta a chave anterior explicitamente configurada para autenticar backups quando a chave atual não está disponível; validação da chave JWT/settings rejeita ambas as chaves de settings se igualarem JWT. Foi adicionado comando obrigatório `npm run test:sec002:integration`, que primeiro exige identidade Docker+SQL e falha fechado sem banco verificado.
- `run-cycle.ps1 -ValidateOnly`: `LOCAL_VALIDATION_OK`; backend **168/168** (22 arquivos, zero skips), frontend **49/49**, Agent Sync **15/15**; migrations, typechecks, builds e dry-run aprovados. Teste dedicado SEC-002: **11/11**, zero skips. Nenhum modelo pago, segredo real, banco persistente, VPS ou produção usado.
- SEC-002 continua `IN_PROGRESS`; esta implementação ainda requer re-revisão independente pós-correção e gate formal. OBS-001/OBS-002 permanecem `IN_REVIEW`; AI-001 permanece inelegível; VPS-ACCESS-001 segue bloqueada pelos dados de conexão que faltam.

## SYNC-001 checkpoint — 2026-10-17

O PostgreSQL 16 descartável local recebeu as seis migrations Prisma versionadas através do runner antes da validação backend/frontend. O runner passou no typecheck do Agent Sync, 7 testes, dry-run com `MEM-001` elegível e autenticação Codex. O checkpoint local limpo é `621c1af`. A chave OpenAI está ausente; nenhum ciclo de modelos foi chamado. Sem publicação externa ou acesso à produção.

## SYNC-001 — Git/PATH resolvido — 2026-10-17

O runner localiza `git.exe` sem alteração persistente do PATH, e tanto o PowerShell quanto o spawn do Node foram verificados. O PostgreSQL descartável, migrations, 7 testes e dry-run passaram; `MEM-001` continua elegível. O ciclo real aguarda uma chave OpenAI nova no prompt oculto; scheduler desativado.

## SYNC-001 — preflight em Windows PowerShell — 2026-10-17

O Git/Node e a CLI Codex agora são resolvidos por caminhos locais explícitos. A pré-validação em Windows PowerShell passou com worktree limpa, PostgreSQL descartável saudável, migrations em dia, 7 testes aprovados, Codex autenticado e `MEM-001` elegível. O ciclo real ainda aguarda chave nova no prompt seguro; agendamento continua desativado.

## SYNC-001 — resolução unificada da CLI Codex — 2026-10-17T20:49:03Z

A CLI real fornecida pelo aplicativo Codex foi localizada como executável Windows e autenticada. Não foi necessária instalação adicional. O runner agora encontra codex.exe por CODEX_CLI_PATH, comando disponível ou diretório conhecido do aplicativo; usa Git configurado, resolvido no ambiente ou instalações comuns, incluindo D:\Git\bin. O mesmo codexCliStatus() resolve o arquivo e valida codex login status tanto no dry-run quanto antes do ciclo. Testado com CODEX_CLI_PATH vazio e o diretório da CLI removido do PATH; a resolução local e a autenticação passaram. Nenhuma chamada de modelo foi feita.
## Agent Sync — correção da validação interna do ciclo — 2026-10-17

- Run anterior `bd7e5e0d-5641-4be8-a88f-9b32b56fb59d` em `MEM-001` parou em `test-database-migrations: ENOENT`; o lock foi liberado e não houve alterações parciais de MEM-001.
- Causa confirmada: `execFile("npm", ...)` não resolve `npm.ps1`/`npm.cmd` pelo ambiente Windows sanitizado. O preflight usava o wrapper do PowerShell, portanto as duas fases executavam comandos de forma diferente.
- Correção: resolver `npm-cli.js` uma vez e iniciá-lo com `process.execPath` tanto no `validate-local` como nas validações do ciclo. O runner usa esse mesmo fluxo e inclui migrations, seed sintético, backend, frontend e `git diff --check`.
- A configuração de validação isolada permite o login demo sintético e configura uma chave Gemini fictícia porque as chamadas externas são mockadas. Nenhum provedor real recebe requisições. A fixture de criptografia agora modifica o authentication tag, evitando alteração apenas de bits não significativos em Base64URL.
- Validação completa `run-cycle.ps1 -ValidateOnly`: migration PASS, seed PASS, backend 82/82 e build PASS, frontend 49/49 e build PASS, Agent Sync 8/8, `git diff --check` PASS. Dry-run `DRY_RUN_OK`; Codex autenticado; `MEM-001` elegível; OpenAI ausente e scheduler desativado.
- Nenhum ciclo de modelo foi iniciado porque as correções ainda precisavam de checkpoint limpo; nenhuma chave foi solicitada/recebida. Próximo passo após commit local: iniciar exatamente um ciclo e aguardar chave nova no prompt mascarado.

## SYNC-001 — contexto MEM-001 e checkpoint — 2026-10-17

A causa das rejeições anteriores foi corrigida no protocolo: o desenvolvedor recebe a especificação local de MEM-001 e evidências sanitizadas do preflight; PostgreSQL e migrations são validados pelo coordenador no host antes e depois do trabalho, sem fornecer URL de banco ou rede ao sandbox Codex. O revisor recebe o diff e a evidência do coordenador. Falha de teste vira `validation_failed`; ausência de diff vira `no_changes`; `review_rejected` só é usado após revisão real.

Validação nesta rodada: Agent Sync 13/13, migrations e seed PASS, backend 82/82 + build, frontend 49/49 + build, `git diff --check` PASS, PostgreSQL descartável saudável e Codex autenticado no `run-cycle.ps1 -ValidateOnly`. `dry-run` selecionou `MEM-001`; a chave OpenAI não está configurada e nenhum modelo foi chamado. Dois runners antigos sem lock nem subprocessos foram encerrados. `MEM-001` continua TODO; não foi criada política TTL. Checkpoint local `a8cb5e2` registrado e worktree limpa. Próximo passo: iniciar o runner normal, refazer o preflight e deixá-lo no prompt mascarado para uma chave nova; isso autorizará somente um ciclo supervisionado. Scheduler permanece desligado.


## Checkpoint de continuidade — 2026-10-19

ValidateOnly passou com PostgreSQL descartável identificado, migrations, backend 177/177, frontend 49/49 e Agent Sync 17/17 sem skips. NVIDIA permanece bloqueada sob orçamento de R$ 0; SEC-002/OBS/AUTH não foram promovidos. A branch de desenvolvimento está 93 commits à frente de origin/main, não existe no remoto, e há outras worktrees com alterações que foram preservadas. Revisar o histórico por dados operacionais privados antes de publicar. VPS sem conexão até confirmar conta não-root e fingerprint confiável. Dry-run sem tarefa local elegível; scheduler pausado.

\n

## JARVIS 3.0 — plano de expansão publicado em 2026-10-21

O documento de execução consolidado desta evolução está em [docs/jarvis/JARVIS_SUPER_PROMPT_MASTER_3_0.md](docs/jarvis/JARVIS_SUPER_PROMPT_MASTER_3_0.md). **É especificação, não evidência de implementação/CI/deploy.** Abrange a experiência funcional pública do Néctar (LIFE-001 a LIFE-015), PoCs opcionais Hermes/Honcho, multi-IA com orçamento zero, skills/MCP, memória, voz, multicanal, agentes, multiusuário, segurança e CI/CD.

**Não sobrescrever tarefas legadas nem promover gates existentes.** LIFE-001 pode começar como MVP de leitura com dados das rotas autenticadas atuais `/tasks`, `/notifications` e `/finance`, sem novos provedores nem acesso administrativo. Diferenciar dados ausentes de valores zero, verificar timezone e autorização, usar carregamento/falhas por módulo e adicionar testes antes do PR. LIFE-002 a LIFE-015 e as PoCs aguardam inventário/dependências no backlog vinculado. A branch `chatgpt/jarvis-3-master-20261021` é **apenas desenvolvimento**, criada a partir de `codex/publish-reviewed-20261019`; nenhum merge ou deploy autorizado por esta anotação.

**Estado LIFE-001 em 2026-10-22:** implementação parcial no DashboardPage atual: tarefas, notificações, resumo financeiro mensal e leitura de rotinas, usando endpoints existentes autenticados. O painel não executa rotinas e distingue falha de consulta de resultado vazio. Usa o fuso horário do navegador porque o perfil `User` não possui configuração de timezone. Revisão de produto, agenda, hábitos dedicados, fuso configurável e validação autenticada em staging continuam pendentes. Frontend local e CI remota passaram (GitHub Actions `39852087330`, SHA `1484b4a5684808a41f1277669a78c89acdc138c0`, validate/desktop/android). PR #2 segue draft e aguardando revisão; não marcar `DONE_VERIFIED`.
