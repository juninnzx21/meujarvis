# Decisões arquiteturais e autorizações

## ADR-0001 — manter checkout auditado e não mesclar `main`

- **Data:** 2026-10-16 UTC
- **Status:** aceita para o baseline
- **Contexto:** local `codex/jarvis-2.0-platform-20261015` aponta para `eec24a6`; `origin/main` aponta para `ee4f987`, não descendente. A comparação registra diferenças de 174 arquivos/10.580 linhas, incluindo Android, desktop e TTS. GitHub PR #1 está aberto, mergeable, base `main`, head exatamente no branch local; seu propósito descrito é integrar essas atualizações.
- **Decisão:** manter checkout e untracked intactos, usar ref de auditoria separada. Não resetar/mesclar/trocar branch; tratar o head atual como base local de trabalho e deixar o merge do PR sob decisão humana.
- **Consequência:** mudanças podem ser preparadas em branch isolada a partir do head do PR sem perder funcionalidades; nada será enviado/mesclado automaticamente.

## ADR-0002 — automação horária permanece desligada

- **Data:** 2026-10-16 UTC
- **Status:** aceita
- **Contexto:** usuário pediu preparo horário. Prompt mestre exige dry-run, ciclo supervisionado, lock, sandbox e runner validado antes de ligar timer. JARVIS não está cadastrado como projeto Codex; CLI local é `0.163.0-alpha.10.2`.
- **Decisão:** criar script e tarefa template somente em modo dry-run/desabilitado; não ativar nem apontar ao projeto C: “Migration this vps hpedagem”. Automatização ativa só depois de gates e associação correta do repositório.
- **Consequência:** nenhuma tarefa automática modifica o sistema. Uso futuro consome limites da conta Codex/ChatGPT; não promete gratuidade.

## ADR-0003 — sem alteração na VPS neste ciclo

- **Data:** 2026-10-16 UTC
- **Status:** aceita
- **Contexto:** chave SSH temporária foi removida; checkup mais recente disponível é snapshot de 03:17 UTC. Os endpoints públicos não autenticados não permitem conferir config efetiva.
- **Decisão:** apenas leitura pública e documentos locais. Nada de restart, deploy, migrations, prune, mudanças de configuração, chaves ou DNS.
- **Consequência:** estado de containers, credenciais, logs privados e sessões de integração permanecem não confirmados.

## Autorizações registradas

- Preparar backlog, diagnóstico inicial, runner e timer em estado desligado: autorizado neste pedido.
- Execução horária de alterações: solicitada, mas gated; não ativa até dry-run e um ciclo manual supervisionado.
- Deploy/restart/alteração em produção e publicação no GitHub: não autorizados neste ciclo.

## ADR-0004 — cron Codex criado em pausa e sem associação de projeto

- **Data:** 2026-10-16 16:42 UTC
- **Status:** aceita para preparação; não ativar
- **Contexto:** ferramenta Codex aceitou a automação horária com `projectId=null`, mas o checkout JARVIS não consta como projeto cadastrado. O prompt aponta caminho local absoluto.
- **Decisão:** manter `jarvis-revis-o-hor-ria-pausada` em `PAUSED`; não apontar a outro projeto nem despausar até vincular o repositório correto e revisar o diff de `main`.
- **Consequência:** a automação não executa tarefas enquanto pausada. Ainda falta provar que o executor projectless tem acesso controlado e correto ao repo.

## ADR-0005 — branch isolada para SEC-001/SEC-004

- **Data:** 2026-10-16 17:14 UTC
- **Status:** aceita para implementação local; integração pendente
- **Contexto:** a pasta principal indicada por `AGENTS.md` não contém `.git`; a cópia versionada é o head do PR #1. O webhook não tinha autenticação visível e o download podia encaminhar a chave Evolution a URL de mídia do evento.
- **Decisão:** usar worktree `E:/jarvis-home-assistant/.codex-worktrees/jarvis-sec-20261016`, branch `codex/sec-001-004-webhook-media-20261016`, base `eec24a6f01cd2b60da358a198da3ba32641afe1e`. Segredo aleatório criptografado e configurado em header, allowlist de remetentes, validações de evento/instância/ID, rate limit, ID idempotente persistido. Não requisitar URL de mídia arbitrária; limitar base64 inline a 8 MiB.
- **Consequência:** migration e integração real dependem de PostgreSQL descartável. Tarefas permanecem IN_REVIEW; nenhum commit/push/deploy; automação horária permanece pausada.

## ADR-0006 — PostgreSQL temporário local em diretório isolado

- **Data:** 2026-10-16 UTC
- **Status:** aceita para testes locais
- **Contexto:** Docker Desktop estava parado e não foi iniciado para não reativar os containers existentes. A instalação local PostgreSQL 15.19 estava sem `dict_snowball.dll` e o `initdb` falhou.
- **Decisão:** usar binários portáteis PostgreSQL 15.19 da EDB extraídos em pasta própria de `%TEMP%`; criar cluster fictício com trust local, escutando somente em `127.0.0.1:55432`, e removê-lo após validação. Sem alterar instalação de sistema, serviços, firewall ou arquivos de produção.
- **Consequência:** migration, compatibilidade com linhas legadas, rollback/reaplicação e suíte backend foram validados; E2E Evolution/staging permanece pendente.
