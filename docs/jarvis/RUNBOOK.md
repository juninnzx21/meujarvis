# Runbook — JARVIS e execução recorrente

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
