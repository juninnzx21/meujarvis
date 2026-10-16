# JARVIS — plano mestre de evolução supervisionada

**Fonte de verdade do backlog.** Atualizar este arquivo junto de `JARVIS_PROGRESS.md` e `docs/jarvis/STATE.json`. IDs são estáveis; nunca apagar histórico.
**Baseline inicial:** versão local auditada `v2.0.0`, SHA `eec24a6f01cd2b60da358a198da3ba32641afe1e`; branch local `codex/jarvis-2.0-platform-20261015`. Em 16/10/2026 o `main` remoto anunciava `ee4f98734257c5a56518662d5a0127f09358eb32`, divergente e com grandes diferenças de produto. O PR #1 está aberto, mergeable e aponta exatamente do branch local para `main`; usar o head do PR como base local de trabalho, sem mesclar/publicar o PR automaticamente.

## Regras de execução

- Em cada execução: obter lock exclusivo com expiração; ler este plano, progresso, estado, runbook, decisões, evidências, registro de segurança e auditorias; conferir Git/ambiente; escolher uma tarefa elegível; checkpoint antes de mudança; testar; registrar resultado atomicamente; liberar lock.
- Preservar os outros sistemas da VPS, dados, backups, volumes, repositórios e configurações. Não executar deploy/restart/migração, abrir portas, alterar DNS/SSH/firewall, apagar dados ou enviar mensagens sem autorização própria e plano de rollback.
- Não importar segredos. Usar ambientes de teste isolados. Nunca liberar credencial, payload, prompt privado ou log bruto em relatórios públicos.
- Somente `DONE_VERIFIED` após critério de aceite, evidência reproduzível e commit/artefato identificado. Distinguir código, mock, CI, staging e produção.
- Nenhum runner recorrente pode fazer deploy automático. O agendador permanecerá desabilitado até dry-run, ciclo manual supervisionado e aprovação de ativação.

## Estado e tarefas

Status permitidos: `TODO`, `READY`, `IN_PROGRESS`, `BLOCKED`, `FAILED`, `IN_REVIEW`, `DONE_VERIFIED`, `DEFERRED`.

| ID | Prioridade | Dependências | Escopo / critério de aceite | Status inicial |
|---|---|---|---|---|
| BASE-000 | P0 | — | Baseline local, remoto, produção pública, auditorias e checkup registrados; sem alterar app | IN_REVIEW |
| BASE-001 | P0 | BASE-000 | Comparar branches/commits; preservar Android, desktop, TTS, release e trabalho não commitado. PR #1 (aberto, mergeable) documenta integração do head local para main; revisão/merge continuam decisão humana | IN_REVIEW |
| BASE-002 | P0 | BASE-001 | Mapear 12 auditorias e checkup VPS por IDs sem publicar dados operacionais sensíveis | IN_REVIEW |
| TEST-001 | P0 | BASE-001 | Ambiente PostgreSQL descartável e segredo de teste; suíte de integração completa e isolamento entre usuários | DONE_VERIFIED — PostgreSQL temporário local, migration/rollback, backend 82 testes |
| SEC-001 | P1 | BASE-001, TEST-001 | Autenticar webhook Evolution, instância/remetente, rate limit, replay/idempotência | IN_REVIEW — teste PostgreSQL concluído; falta validação Evolution/staging |
| SEC-004 | P1 | SEC-001, TEST-001 | Eliminar URL arbitrária de mídia com chave Evolution; aceitar mídia segura e testar regressões | IN_REVIEW — teste PostgreSQL e limites base64; falta validação Evolution/staging |
| SEC-002 | P1 | BASE-001, TEST-001 | Chave de cifragem independente de JWT, versão e rotação/re-encriptação com backup testado | TODO |
| SEC-003 | P1 | BASE-001, acesso de leitura à VPS | Confirmar Compose efetivo e eliminar defaults inseguros em produção; teste de fail-closed, sem expor valores | BLOCKED |
| AUTH-001 | P1 | TEST-001 | MFA/TOTP administrativo, recuperação verificada, revogação de sessões, política de papéis e testes | TODO |
| OBS-001 | P1 | BASE-001 | Health de dependências, correlation ID, logs sanitizados, métricas de falhas e alertas sem falsos estados “conectado” | TODO |
| AI-001 | P1 | TEST-001, OBS-001 | Testes reais, controlados e com limite de custo de OpenAI/Gemini/Ollama; seleção, quota, fallback e circuit breaker | TODO |
| AI-002 | P2 | AI-001 | Roteamento semântico, decomposição e tool calling com schemas, limite de passos/tempo/custo e proteção a prompt injection | TODO |
| WEB-001 | P2 | AI-001 | Busca web citável, com fonte, timestamp e distinção entre fato/inferência/memória | TODO |
| MEM-001 | P1 | TEST-001 | Cobrir isolamento, retenção, exclusão, concorrência e contexto cross-channel em DB | TODO |
| MEM-002 | P2 | MEM-001 | Recuperação híbrida lexical+semântica, consentimento, proveniência, TTL, dedupe e limites de tokens | TODO |
| VOICE-001 | P1 | AI-001, OBS-001 | Testar STT pt-BR e TTS Piper/ElevenLabs/Fish/fallback em dispositivos reais; status de provedor/quota e erros | TODO |
| VOICE-002 | P2 | VOICE-001 | VAD, streaming, cancelamento, barge-in, latência e wake word opt-in com indicador | TODO |
| AGENT-001 | P1 | AUTH-001, TEST-001 | Preview/confirm tokenizado/expiração, executor allowlist, verificação pós-ação, auditoria e rollback | TODO |
| VPS-001 | P1 | AGENT-001, OBS-001 | API separada de operações allowlist para leitura/ações limitadas; jamais shell irrestrito/Docker socket no modelo | TODO |
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
| QA-001 | P1 | SEC-001, TEST-001, VOICE-001, INT-001 | Executar matriz E2E real autenticada e atualizar evidências | TODO |
| REL-001 | P2 | QA-001 | Release versionada, changelog, artefatos assinados, rollback e manual | TODO |

## Riscos e rollback global

- **Risco imediato de código:** webhook público e URL de mídia não confiável no auditado; não presumir que produção está vulnerável/exposta sem verificar a versão/config efetiva. Mitigação é bloquear qualquer rollout, fixar primeiro em branch isolada e testar staging.
- **Divergência de código:** `main` remoto remove arquivos/componentes existentes no SHA local. Rollback: não alterar checkout atual; manter branch e ref remota separadas até revisão independente. Nunca `reset --hard`, `clean`, merge ou cherry-pick automático.
- **Deploy e dados:** cada tarefa futura exige backup verificado, plano/critério de rollback e autorização separada; não é parte deste baseline.
- **Automação:** timer atual não registrado/ativo; runner em dry-run por padrão. Limites de uso do Codex/ChatGPT continuam aplicáveis; não contornar quotas.

## Fontes de baseline

- 12 relatórios em `docs/audits/jarvis-v2-functional/` (ainda não commitados; preservar).
- Checkup de VPS: `C:\Users\junin\OneDrive\Documentos\ChatGPT\Migration this vps hpedagem\CHECKUP_VPS_JARVIS_2026-10-16.md` (snapshot 16/10/2026 03:17 UTC; não copiar integralmente a repositório público, pois contém inventário operacional).
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
