# Runbook — JARVIS e execução recorrente

## Acesso SSH de agentes à VPS

- Consulte `docs/jarvis/VPS_ACCESS.md` antes de configurar qualquer agente. O acesso padrão é somente leitura e usa uma conta dedicada não-root; nunca compartilhar senha em texto simples, copiar chave privada ou conceder o grupo `docker`/socket Docker.
- Não inferir IP, usuário ou host key de relatórios antigos. Confirmar endpoint e fingerprint por canal confiável antes de criar `Host jarvis-vps` ou conectar.
- Use `~/.ssh/jarvis_vps` somente no perfil Windows em que ela foi encontrada. `BatchMode yes`, `IdentitiesOnly yes`, verificação estrita de host e encaminhamentos desativados são requisitos. Não registrar chave, URL com segredo, saída de ambiente ou conteúdo bruto de logs.
- Se leituras privilegiadas forem necessárias, usar wrapper root-owned allowlist e sudoers limitado ao caminho fixo; revisar/redigir a saída antes de disponibilizar a agentes. Sem shell arbitrário ou sudo genérico.
- Codex e OpenCode devem usar diretórios worktree distintos e branches separadas. Não basta trocar branch na mesma pasta. Uma worktree integradora revisa e integra as alterações sequencialmente.
- SSH não autoriza mutações de produção. Restart/stop, exclusão, configuração, segurança, firewall, SSH, SSL, dados e deploy exigem autorização específica e rollback. Agent Sync permanece pausado até autorização independente.
- Estado desta preparação (2026-10-18): chave dedicada presente; config SSH inexistente; endpoint, usuário não-root e host key não confirmados; nenhuma tentativa de conexão ou alteração na VPS.

## Agent Sync local V1

- Use somente `tools/agent-sync` no PC que contém o checkout e o Codex CLI autenticado. O serviço não roda na VPS.
- Rode `npm install`, `npm run validate` e `npm run dry-run` dentro de `tools/agent-sync`. Dry-run não usa modelos e não escreve estado.
- Para um ciclo real, primeiro prepare PostgreSQL descartável local com nome contendo `test`, configure `JARVIS_AGENT_SYNC_TEST_DATABASE_URL` e `OPENAI_API_KEY` apenas na sessão local, então rode `npm run cycle`. O padrão é um ciclo; até três podem ser solicitados por `JARVIS_AGENT_SYNC_MAX_CYCLES`.
- O ciclo exige branch `codex/*` e worktree limpo. O runner chama validações fixas de backend/frontend, limita diff de revisão a 64 KiB, bloqueia caminhos de segredos, não comita nem publica e interrompe em risco/approval.
- Antes de qualquer chamada de modelo, o runner exige URL PostgreSQL local descartável e executa testes com ambiente sintético sem credenciais/provedores externos. Uma tarefa aprovada fica `IN_REVIEW`, nunca `DONE_VERIFIED` automaticamente.
- OpenAI API tem faturamento independente do ChatGPT. Sem chave configurada, o resultado é `not_configured`; não marque o ciclo completo.
- Não crie timer nem despausa a automação horária antes de um ciclo real revisado e autorização própria. Para logs do runner, consulte `tools/agent-sync/.state/runs.json` local (não versionado).

## Estado inicial

Em 16/10/2026 o runner e definição de tarefa estão preparados, porém **não existe tarefa Windows registrada nem timer ativo**. O arquivo `scheduler/JARVIS-Hourly-Disabled.xml` tem o trigger horário desativado. A automação `jarvis-revis-o-hor-ria-pausada` foi criada no Codex com status **PAUSED** e execução local projectless, pois o checkout JARVIS não está cadastrado em `list_projects`; seu prompt usa o caminho absoluto do repo. Não a despausar até associar/verificar o projeto correto, concluir os gates e revisar a divergência de branches. Não associar ao projeto “Migration this vps hpedagem” por engano. O CLI disponível é alpha e o login reportou ChatGPT; isso não garante execução gratuita ou ilimitada.

## Protocolo antes de cada execução

1. Adquirir lock atômico em `%LOCALAPPDATA%\JARVIS\CodexAutomation\run.lock`, TTL de 90 minutos. Se existir lock válido, registrar `SKIPPED_LOCKED`, encerrar sem editar arquivos. Não tomar lock de outro processo.
2. Ler integralmente `JARVIS_MASTER_PLAN.md`, `JARVIS_PROGRESS.md`, `docs/jarvis/STATE.json`, este runbook, decisões, evidências, registro de segurança e os 12 relatórios da auditoria.
3. Conferir branch, SHA, `git status`, remotes, arquivos de terceiros, autenticação e ambiente. Nunca resetar/limpar checkout ou mudar para `main` sem revisão.
4. Rever bloqueios e risco; escolher apenas uma tarefa elegível e registrar checkpoint, plano de teste e rollback.
5. Usar branch de trabalho, sandbox `workspace-write`, aprovação padrão; nunca passar flags de bypass, não fazer deploy nem tocar em outros serviços.
6. Testar no ambiente isolado, atualizar evidências/estado/progresso, salvar logs sanitizados e soltar lock.

## Dry-run manual

Por enquanto, a definição Task Scheduler está desabilitada e chama `scripts/jarvis-hourly.ps1 -DryRun`. O dry-run é somente diagnóstico local: valida documentos, estado, branch/SHA e lock; não inicia Codex nem altera código/produção. Execute com PowerShell 7 quando o executor estiver validado:

```powershell
pwsh -NoProfile -File .\scripts\jarvis-hourly.ps1 -DryRun
```

Depois revisar saída e registrar resultado em `JARVIS_PROGRESS.md`. Rodar um ciclo manual supervisionado pelo Codex na branch isolada antes de qualquer ativação.

## Ativação (não executar ainda)

Ative somente após: (1) reconciliar `main`/branch de trabalho; (2) runner passar dry-run; (3) uma execução manual supervisionada concluir e passar testes; (4) operador confirmar que o checkout correto foi associado ao agendador; (5) atualizar `STATE.json` com decisão datada e `executionEnabled=true`; (6) aprovar separadamente qualquer commit/push/deploy. Use Windows Task Scheduler apenas no host local. A tarefa deve permanecer sem privilégios elevados, `IgnoreNew`, timeout 30 min e ação `-Execute`, com sandbox e aprovações intactas.

O JARVIS não pode executar deploy, restart, migrations, firewall/SSH/DNS, compras, exclusões ou enviar mensagens a terceiros de modo horário. Não copiar credenciais pessoais à VPS.

## Pausar e retomar

- Pausar: desabilitar `JARVIS Hourly — JARVIS repo` no Task Scheduler (se vier a ser registrado) e definir `scheduler.enabled=false` em `STATE.json`.
- Retomar: seguir todos os gates de ativação; conferir lock/processos antes de retomar.
- Agora: a automação Codex existente está pausada e o XML é apenas um template disabled. Não há Scheduled Task Windows registrada.

## Lock preso / falhas

O runner não rouba lock. Se TTL venceu, confira PID e horário do processo, finalize normalmente se necessário, arquive o lock com runId em vez de apagar cegamente e registre a ocorrência. Em falha, não repetir automaticamente ações; verificar progress/STATE e eventos Codex. Timeout e custo de uso continuam sujeitos à conta e limites do Codex; não há orçamento de tokens configurado/garantido.

## Rollback

Não alterar produção. Para mudanças futuras, reverter somente commit atômico da tarefa após preservar logs/evidência; fazer backup e teste de restauração antes de alteração de banco. Nunca restaurar dump sobre produção sem autorização expressa e janela combinada.

## Checkout e branch de segurança — 2026-10-16

- Diretório indicado por `AGENTS.md`: `E:\jarvis-home-assistant`; não possui `.git`.
- Checkout versionado usado: worktree `E:\jarvis-home-assistant\.codex-worktrees\jarvis-sec-20261016`, branch `codex/sec-001-004-webhook-media-20261016`, no head do PR #1 `eec24a6f01cd2b60da358a198da3ba32641afe1e`.
- A raiz não versionada e a cópia de auditoria não foram sobrescritas. Revisar diferenças entre snapshots antes de integrar código ou estabelecer raiz definitiva.
- Automação Codex segue PAUSED/projectless; Scheduled Task segue template disabled. Não ativar sem associação correta e ciclo supervisionado completo.
- Testes DB usam somente PostgreSQL descartável. Não apontar suíte ou migration para produção.

## Validação integrada SEC-001/SEC-004 — 2026-10-16

- PostgreSQL temporário executado em `127.0.0.1:55432` com dados sob `%TEMP%`; não é serviço registrado nem deve ficar ligado. Docker permaneceu parado.
- Após validar, encerre `pg_ctl` do diretório temporário com `pg_ctl -D <TEMP\jarvis-pg15-test-*\data> -m fast -w stop`. Só remova o diretório gerado quando o caminho absoluto estiver sob `%TEMP%` e o nome começar por `jarvis-pg15-test-`. Nunca remova outro diretório.
- Não há rollback versionado para a migration. A reversão foi testada manualmente somente na base descartável; em banco real, exija backup verificado e plano aprovado. Coluna nullable, índice único e reaplicação foram validados.
- Backend `npm run validate` (82 testes), frontend `npm run validate` (47) e desktop `npm run validate` (4) passaram. Android depende da CI por ausência de JDK/SDK local.
- Parser `express.json` limita request a 1 MiB. Decodificador inline rejeita input bruto acima do teto de 8 MiB antes de normalizar; envelope HTTP é mais restritivo. Não aumentar o parser global sem sizing e proteção DoS.
- A automação `jarvis-revis-o-hor-ria-pausada` continua PAUSED e `scheduler/JARVIS-Hourly-Disabled.xml` continua disabled.
- Validação do runner (2026-10-16): `-DryRun` retorna `DRY_RUN_OK`; lock futuro retorna `SKIPPED_LOCKED`; `-Execute` bloqueia quando scheduler ou executionEnabled estão desativados. A leitura de expiry aceita `DateTime` parseado ou texto ISO.
# Validação local AUTH-001 — 2026-10-17

- Use somente um banco PostgreSQL descartável, bind loopback e valores de configuração sintéticos. Nunca rode migrations de teste em produção.
- Configure `TOTP_ENCRYPTION_KEY` como segredo backend exclusivo e aleatório, com pelo menos 32 caracteres; gere material criptográfico (por exemplo, `openssl rand -base64 48`), não use frase escolhida por pessoa e não reutilize `JWT_SECRET` ou `SETTINGS_ENCRYPTION_KEY`.
- Guarde uma cópia protegida da chave no gestor de segredos e teste o procedimento de recuperação fora de produção. A perda da chave torna os segredos TOTP já cifrados irrecuperáveis; rotação exige re-enrollment ou um processo de re-cifragem testado.
- Antes de deploy, defina procedimento protegido para backup/recuperação dessa chave: perder a chave impede decifrar segredos MFA existentes.
- Primeiro login admin solicita QR; confirme o código no app TOTP e salve os recovery codes fora do navegador. Cada recovery code é de uso único.
- O usuário admin desativa MFA em Configurações após autenticar novamente; essa ação exige senha e TOTP/recovery code e invalida sessões antigas.
- Revisão independente, CI da branch, migração em cópia de produção, smoke test autenticado e plano de rollback continuam gates separados. Não publicar sem aprovação.
