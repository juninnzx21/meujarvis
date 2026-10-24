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

## ADR-0007 — TOTP incremental sem ativação prematura

- Data: 2026-10-17 UTC.
- Decisão: desenvolver e validar o algoritmo TOTP em branch isolada como primeiro incremento de AUTH-001; manter o login atual até que enrollment, proteção do segredo, recuperação, revogação e integração DB sejam implementados e testados.
- Motivo: a instância de staging Evolution e o canal de testes integrados da VPS não estão disponíveis; o helper isolado não é um segundo fator funcional.
- Consequência: AUTH-001 permanece IN_PROGRESS e nenhuma alegação de MFA ativo deve ser feita.

## ADR-0008 — Evolution de staging antes de qualquer provisionamento

- Data: 2026-10-17 UTC.
- Decisão: usuário autorizou condicionalmente o staging em 2026-10-17. Não criar containers, redes, volumes, serviços nem abrir portas até restabelecer SSH e completar o preflight aprovado.
- Plano para aprovação: stack Compose com nome próprio, backend JARVIS de teste e banco descartável, rede Docker interna sem portas publicadas, imagens fixadas por versão/digest, segredos exclusivos de teste e limites de CPU/RAM após medir a capacidade corrente. Sem credenciais da Evolution de produção, tráfego real ou ligação ao backend de produção. QR/sessão WhatsApp exige conta de teste autorizada pelo operador.
- Testes planejados: assinatura/segredo, rejeição de evento inválido, replay, duplicação, rate limit, payload de mídia e garantia de que URL de mídia externa não é buscada. Remover recursos só após registrar resultados e confirmar que pertencem exclusivamente ao staging.
- Bloqueio atual: falta restabelecer SSH para executar o preflight autorizado. Nenhum recurso foi criado.
# ADR-0009 — integrar MFA administrativo em branch isolada

- **Data:** 2026-10-17 UTC
- **Status:** aceita para implementação e revisão local; produção não autorizada nesta etapa.
- **Contexto:** AUTH-001 já possuía somente os primitivos TOTP. O acesso SSH de produção não foi restabelecido e a autorização de Evolution staging depende explicitamente desse acesso.
- **Decisão:** completar enrollment e desafio TOTP para administradores, armazenamento cifrado com `TOTP_ENCRYPTION_KEY`, códigos de recuperação hash de uso único e revogação de JWT via `authVersion`; validar em PostgreSQL temporário local. Preservar branch isolada, sem push, merge ou deploy.
- **Consequência:** backend e frontend passaram validação local; AUTH-001 permanece em revisão até CI/revisão e implantação aprovada. Evolution staging segue sem recursos e sem WhatsApp real.

# ADR-0010 — Agent Sync executa localmente e com limite supervisionado

- **Data:** 2026-10-17 UTC
- **Status:** aceita para implementação local; ciclo GPT-Codex-GPT e recorrência ainda não validados.
- **Contexto:** o Codex precisa de um checkout e CLI locais; executar esse agente a partir do backend público da VPS daria acesso desnecessário ao host. Nesta máquina o Codex CLI está autenticado, mas `OPENAI_API_KEY` não está configurada.
- **Decisão:** preparar um runner local que use OpenAI API para planejamento/revisão e Codex SDK/CLI para desenvolvimento. A seleção de tarefas é validada contra o backlog local; ciclos ficam limitados a 1 por padrão e 3 no máximo, o runner não faz commit/push/merge/deploy, executa validações fixas e bloqueia riscos/diffs sensíveis. O timer permanece desligado.
- **Consequência:** dry-run/testes locais podem ser validados sem modelo. O ciclo real depende de chave OpenAI API local e usa cobrança separada da assinatura ChatGPT. Nenhuma chamada de modelo foi feita nesta execução.

# ADR-0011 — PostgreSQL de teste isolado para o Agent Sync

- **Data:** 2026-10-17 UTC.
- **Decisão:** usar um container PostgreSQL 16 exclusivo, sem volume persistente, dados em tmpfs, limites de 1 CPU/1 GiB e publicação apenas em `127.0.0.1:55433`. O runner lê a credencial aleatória do container em memória e configura `JARVIS_AGENT_SYNC_TEST_DATABASE_URL` apenas durante sua execução. A chave OpenAI, se ausente, é solicitada por prompt PowerShell oculto e removida do ambiente ao final.
- **Consequências:** a base descartável pode ser perdida ao parar/remover o container; nenhum banco de produção ou container preexistente é usado. Não guardar credenciais em arquivos do projeto.

## ADR-0012 — aplicar migrations no banco descartável antes das validações do ciclo

- **Data:** 2026-10-17 UTC.
- **Decisão:** o runner aplica migrations versionadas com `prisma migrate deploy` no banco PostgreSQL local validado como descartável antes dos testes backend/frontend. O comando recebe somente `DATABASE_URL` sintética apontando a `127.0.0.1` e nome contendo `test`; o valor anterior da variável é restaurado imediatamente.
- **Motivo:** os testes integrados do backend acessam tabelas Prisma e falham em um DB recém-criado sem schema. As mesmas garantias precisam valer no pré-voo e dentro do ciclo real.
- **Consequência:** primeira execução cria schema apenas no container tmpfs dedicado; alterações de produção/VPS seguem fora do alcance do runner.

## ADR-0013 — resolver Git no runner sem alterar PATH global

- **Data:** 2026-10-17 UTC.
- **Decisão:** `run-cycle.ps1` localiza `git.exe` por `Get-Command`, passa o caminho completo via `JARVIS_AGENT_SYNC_GIT_EXECUTABLE`, testa o spawn do Node e acrescenta o diretório ao PATH somente durante o runner; as variáveis são restauradas ao final. O Agent Sync usa o executável configurado para todas as operações Git.
- **Motivo:** o erro `spawn git ENOENT` ocorre quando o ambiente entregue ao Node não resolve o executável pelo nome.
- **Consequência:** PowerShell, Node e Codex SDK usam a instalação já existente sem mudança persistente de PATH.

## ADR-0014 — resolver CLI Codex a partir de CODEX_CLI_PATH

- **Data:** 2026-10-17 UTC.
- **Decisão:** o runner usa `CODEX_CLI_PATH` quando aponta para arquivo existente; se ausente/inválido, procura `codex.exe` via `Get-Command`. A autenticação é verificada por `spawnSync` do Node e a variável de ambiente original é restaurada ao sair.
- **Motivo:** `Get-Command codex` falhou em Windows PowerShell embora o Agent Sync dry-run detectasse a CLI por `CODEX_CLI_PATH`.
- **Consequência:** a verificação de login e o Codex SDK usam o caminho já configurado sem alterar PATH global.

## ADR-0015 — um resolvedor autenticado para Codex CLI

- **Data:** 2026-10-17T20:49:03Z.
- **Decisão:** resolver codex.exe/.com a partir da variável configurada, PATH e local conhecido do app; usar a mesma verificação de existência e codex login status no dry-run e antes do ciclo. O runner também procura Git em D:\Git\bin e locais comuns sem editar o PATH global.
- **Motivo:** uma janela PowerShell pode não herdar variáveis ou PATH da sessão do aplicativo, fazendo o preflight falhar apesar da CLI estar instalada.
- **Consequência:** o dry-run marca bloqueio se o executável faltar ou não estiver autenticado; o mesmo caminho validado é entregue ao SDK. Shims .cmd/.ps1 são recusados porque o SDK inicia um executável diretamente.
## Agent Sync — correção da validação interna do ciclo — 2026-10-17

- Run anterior `bd7e5e0d-5641-4be8-a88f-9b32b56fb59d` em `MEM-001` parou em `test-database-migrations: ENOENT`; o lock foi liberado e não houve alterações parciais de MEM-001.
- Causa confirmada: `execFile("npm", ...)` não resolve `npm.ps1`/`npm.cmd` pelo ambiente Windows sanitizado. O preflight usava o wrapper do PowerShell, portanto as duas fases executavam comandos de forma diferente.
- Correção: resolver `npm-cli.js` uma vez e iniciá-lo com `process.execPath` tanto no `validate-local` como nas validações do ciclo. O runner usa esse mesmo fluxo e inclui migrations, seed sintético, backend, frontend e `git diff --check`.
- A configuração de validação isolada permite o login demo sintético e configura uma chave Gemini fictícia porque as chamadas externas são mockadas. Nenhum provedor real recebe requisições. A fixture de criptografia agora modifica o authentication tag, evitando alteração apenas de bits não significativos em Base64URL.
- Validação completa `run-cycle.ps1 -ValidateOnly`: migration PASS, seed PASS, backend 82/82 e build PASS, frontend 49/49 e build PASS, Agent Sync 8/8, `git diff --check` PASS. Dry-run `DRY_RUN_OK`; Codex autenticado; `MEM-001` elegível; OpenAI ausente e scheduler desativado.
- Nenhum ciclo de modelo foi iniciado porque as correções ainda precisavam de checkpoint limpo; nenhuma chave foi solicitada/recebida. Próximo passo após commit local: iniciar exatamente um ciclo e aguardar chave nova no prompt mascarado.

# ADR-0016 — evidência de teste host versus sandbox do desenvolvedor

- **Data:** 2026-10-17 UTC.
- **Status:** aceita para corrigir a comunicação e preservar o sandbox isolado.
- **Contexto:** runs `41178b4b-841a-40bb-b759-fcd20146fdd1` e `3a2d0831-27d0-4dc3-8eac-8734463001cc` reportaram ausência de DB após preflight local verde; ambos não produziram diff. O coordenador possui URL temporária do PostgreSQL; o processo Codex não recebe variáveis de DB e não tem rede.
- **Decisão:** passar ao agente somente o resumo sanitizado de validações do coordenador; explicar que o sandbox não tem acesso direto e que o coordenador repetirá a suíte após a edição. Rodar preflight imediatamente antes dos modelos. Orientar o revisor a distinguir os dois contextos, mantendo diff e critérios como requisitos.
- **Consequência:** o banco e credenciais continuam fora do processo Codex. Um preflight verde prova o estado daquele host no instante da checagem, não a conectividade a partir do sandbox. Ausência de `DATABASE_URL` no sandbox não é evidência de indisponibilidade do serviço.

# ADR-0017 — sem política de expiração implícita para MEM-001

- **Data:** 2026-10-17 UTC.
- **Status:** aceita como limite da tarefa.
- **Contexto:** o segundo run indicou que não encontrou política de retenção. No schema consultado, `Memory` não tem `expiresAt` e não foi localizado job de expiração.
- **Decisão:** tratar memória como persistente até exclusão explícita ou cascata de exclusão da conta; testar a ausência de TTL sem adicionar comportamento de expiração.
- **Consequência:** TTL, retenção por idade e exclusão automática exigem decisão de produto em tarefa separada; não podem ser inventados pelo agente.

# ADR-0018 — estados do ciclo não podem confundir teste geral com implementação

- **Data:** 2026-10-17 UTC.
- **Status:** implementada e validada localmente; sem ciclo pago nesta revisão.
- **Contexto:** dois runs foram registrados review_rejected com testsPassed=true e sem diff. A versão anterior também usava review_rejected para falha da suíte antes da chamada do GPT.
- **Decisão:** blocked representa bloqueio do planejador/elegibilidade; validation_failed representa falha na suíte local; no_changes representa ausência de diff após testes aprovados; review_rejected só ocorre após o revisor ser chamado e recusar. testsPassed registra exclusivamente a suíte do coordenador. Só reviewed_continue com diff e validação aprovada pode avançar para IN_REVIEW.
- **Consequência:** runs antigos mantêm seus registros e significados originais. O protocolo atual pode ser testado sem chamadas de modelo.

# 2026-10-17 — Retenção de memória em MEM-001

Não adicionar TTL, exclusão por idade, campo `expiresAt`, migration ou job de expiração em MEM-001. A inspeção não encontrou política de expiração existente. Esta tarefa cobre isolamento, uso de memória do mesmo usuário em chat/WhatsApp, exclusão explícita e cascata de conta; as conversas continuam isoladas por conversa/remetente. Se uma política de retenção automática for desejada, ela requer decisão explícita de produto em tarefa separada.

# 2026-10-17 — PostgreSQL no Agent Sync

Manter PostgreSQL e URLs de teste exclusivamente no coordenador local. O sandbox Codex continua sem rede e sem credenciais de banco; o coordenador executa e encaminha resultados sanitizados ao revisor. Não ampliar permissões do sandbox para contornar uma rejeição causada por contexto incompleto.

# ADR-0021 — acesso SSH de agentes à VPS com privilégio mínimo

- **Data:** 2026-10-18.
- **Status:** proposta documentada; leitura SSH autorizada pelo usuário, conexão bloqueada até confirmar endpoint, conta não-root e host key.
- **Decisão:** usar chave SSH dedicada existente no perfil local, alias `jarvis-vps`, autenticação por chave e `BatchMode`; sem senha em texto simples, cópia da chave privada, encaminhamento de agente/portas, shell root ou acesso direto ao socket Docker. Diagnósticos privilegiados deverão passar por wrapper fixo, root-owned, com saída sanitizada e sudoers limitado.
- **Acesso e mudanças:** acesso inicial somente leitura. Toda alteração em produção, restart de container crítico, exclusão ou mudança de segurança requer autorização explícita específica, revisão de impacto e rollback; autorização de SSH não implica autorização de mutação.
- **Concorrência:** Codex e OpenCode trabalham em branches e worktrees físicas diferentes. A integração ocorre por worktree dedicada, após revisão; não compartilhar diretório de trabalho.
- **Automação:** Agent Sync/scheduler continuam pausados até autorização própria.
- **Consequência:** preparar o alias operacional depende da confirmação do IP/DNS/porta, usuário não-root, fingerprint confiável do host e permissão de primeiro acesso. Não assumir valores históricos nem tentar login antes desses gates.

# ADR-0019 — rotação versionada e segura de chaves de settings

- **Data:** 2026-10-18 UTC.
- **Status:** implementada e validada em ambiente descartável; revisão independente pendente.
- **Decisão:** novas cifras `Setting` usam `SETTINGS_ENCRYPTION_KEY` em `enc:v2:` e nunca dependem de JWT. `enc:v1:` mantém fallback JWT apenas para leitura/migração histórica. A chave anterior é temporária; rotação cria backup cifrado validado antes de escrita e atualiza/restaura em transação serializável. Dry-run não grava. Testes PostgreSQL exigem URL de loopback/teste aprovada pelo coordenador e não são expostos ao sandbox.
- **Consequência:** nenhum segredo real foi migrado ou rotacionado. Backups permanecem ignorados pelo Git e exigem proteção operacional. SEC-002 permanece `IN_PROGRESS` até o gate `reviewed_continue`; não implica estado mitigado em produção.

# ADR-0020 — gate de rotação exige identidade positiva do PostgreSQL descartável

- **Data:** 2026-10-17 BRT / 2026-10-18 UTC.
- **Status:** implementado localmente; segunda revisão independente pendente.
- **Contexto:** revisão P1 mostrou que loopback e database contendo `test` permitiam classificar incorretamente um banco como descartável; uma flag da CLI podia liberar o bloqueio.
- **Decisão:** usar o verificador comum de Docker/SQL antes de backup, rotação e restauração. Fixar container, digest de imagem, credenciais, publish loopback, tmpfs exato, ausência de mounts persistentes e uma rede bridge Docker dedicada, com apenas o container de teste. Essa bridge permite egress e o limite é documentado; a publicação permanece somente em loopback. SQL confirma database, role, IP interno e porta. Reinspecionar o container depois da consulta e confirmar via a conexão transacional que realizará a mutação; repetir antes do backup em disco. Remover `--confirm-non-test-database`; manter `--dry-run` como única flag, sem tornar a execução normal um bypass do gate.
- **Consequência:** qualquer desvio falha fechado e não executa efeitos colaterais. Atualização legítima do digest requer inspeção e revisão. Nenhum modo de rotação real em ambiente persistente está disponível; eventual operação real precisa de fluxo separado, autorização específica, backup verificado e revisão própria. Implementação registrada localmente em `610cfdc` e `2370f3f`.

# ADR-0022 — chaves criptográficas independentes e recuperação autenticada

- **Data:** 2026-10-18 UTC.
- **Status:** correções locais implementadas, validadas e re-revisadas; gate formal pendente.
- **Decisão:** rejeitar `SETTINGS_ENCRYPTION_KEY` ou `SETTINGS_ENCRYPTION_KEY_OLD` se reutilizar `JWT_SECRET`; quando a chave atual não estiver disponível durante recuperação, permitir validar HMAC de backup somente com a chave anterior explicitamente configurada, mantendo a validação do ciphertext e da identidade dos registros antes de qualquer gravação. Um comando dedicado de integração falha fechado se o PostgreSQL descartável não for positivamente verificado.
- **Consequência:** recuperação durante rotação continua possível sem afrouxar autenticação do backup. A chave anterior ainda precisa decifrar cada valor. O parser de enc:v1/v2 exige cinco campos exatos. SEC-002 permanece `IN_PROGRESS` até o gate formal `reviewed_continue`.
- **Validação pós-revisão:** backend 172/172, frontend 49/49, Agent Sync 17/17, integração SEC-002 11/11, zero skips; a revisão independente fechou o achado de formato malformado. Sem credenciais reais ou produção.

# ADR-0023 — envelope e chave independentes para MFA TOTP

- **Data:** 2026-10-18 UTC.
- **Status:** implementado localmente, validado e re-revisado; AUTH-001 permanece `IN_REVIEW`.
- **Decisão:** `TOTP_ENCRYPTION_KEY` deve ser distinta de `JWT_SECRET`; o schema e o derivador do serviço falham fechados se houver reutilização. O envelope `totp:v1` é estrito: três componentes após o prefixo, base64url canônico, IV de 12 bytes, tag AES-GCM de 16 bytes e ciphertext não vazio.
- **Consequência:** alterações malformadas não são aceitas e o formato canônico existente permanece compatível. Antes de qualquer ativação, confirmar sem revelar valores que a chave independente está provisionada e tem backup protegido; perda da chave impede leitura dos segredos MFA.
- **Validação:** backend 175/175, frontend 49/49, Agent Sync 17/17 e integração SEC-002 11/11, zero skips; revisão independente direcionada sem achado aberto. Sem CI GitHub da branch ou validação de produção.

# ADR-0021 — observabilidade HTTP sem inferir conectividade

- **Data:** 2026-10-18 UTC.
- **Status:** implementada e testada localmente; revisão independente pendente.
- **Decisão:** cada resposta recebe ID gerado pelo servidor; somente respostas 5xx geram log operacional usando template da rota, sem URL/query/body. Health separa liveness/readiness e não marca integração conectada por haver configuração; conectividade sem probe fica `not_checked` e erro ao ler status fica `unknown`. Contadores HTTP são voláteis. Falhas 5xx gravam alerta interno genérico deduplicado por rota/status por 60 segundos.
- **Motivo:** correlacionar falhas sem expor tokens/dados e evitar falsos positivos no painel.
- **Consequência:** contadores reiniciam com o processo, deduplicação é local à instância e não há notificação externa ou garantia de detecção de recuperação. Revisão operacional e política de retenção são gates antes de produção.
## 2026-10-18 — OBS-002: dados detalhados do health são escopados por papel

- Evidência: revisão do endpoint `/api/health/full` observou que logs globais e contagens de imports/linhas eram retornados para qualquer identidade autenticada.
- Decisão local: os serviços filtram esses recursos por `userId` para usuário comum; somente admin recebe escopo global. A rota passa a decisão derivada de `req.user.role`, nunca de input do cliente.
- Validação: integração autenticada com PostgreSQL descartável, dois usuários sintéticos, logs e importações isolados. O teste comprova que nenhum marcador do outro usuário aparece na resposta comum e que admin vê o conjunto global.
- Gate: não declarar a revisão independente completa nem implantar. OBS-001 e OBS-002 permanecem `IN_REVIEW`; uma segunda pessoa deve revisar o diff e o conteúdo restante (métricas/estado global) antes de smoke de produção.

## ADR-0024 — escopo de status de integração e saneamento histórico

- **Data:** 2026-10-18 UTC.
- **Status:** remediação local validada; parecer independente pendente.
- **Contexto:** a revisão de OBS encontrou que autenticação sem autorização por papel ainda permitia ler URLs/estado de integrações globais por `/api/integrations/status|config` e que o comando JARVIS `health.check` chamava health sem identidade. Logs antigos de automação também podiam conter URL de webhook e valores de campos sensíveis.
- **Decisão:** os detalhes das integrações baseadas em ENV e URLs globais são entregues somente quando o papel autenticado é admin. Status de health e comandos passam o `userId` autenticado. Logs de sistema e automação são saneados também na leitura, incluindo chaves/tokens, URLs e paths webhook legados.
- **Validação:** PostgreSQL descartável verificado por Docker+SQL; backend 170/170, frontend 49/49 e Agent Sync 16/16, sem skips; builds, typechecks e dry-run passaram. Testes sintéticos comuns cobrem health, status de integração e comando. Nenhuma produção/VPS foi acessada.
- **Consequência:** usuário comum deixa de receber detalhes globais; integração real continua a ser indicada por status próprio e não por conectividade presumida. OBS-001/OBS-002 permanecem `IN_REVIEW` até parecer independente e smoke operacional separado.

### Fechamento da ressalva de revisão

- Em 2026-10-18, revisão independente encontrou que `getWebhookUrl` do Brain devolvia a URL global de WhatsApp sem verificar papel. A ferramenta foi removida do registro, do WhatsAppAgent e do planner; a execução direta não reconhece mais a ferramenta.
- Testes autenticados verificam que a ferramenta e a URL não aparecem na lista, plano ou resposta do Brain. Após a correção, a revisão independente confirmou o fechamento do P2 sem outros usos no código analisado.
- Validação local final: backend 171/171, frontend 49/49, Agent Sync 17/17, zero skips; builds, typechecks, identidade Docker+SQL, migrations e dry-run passaram. Smoke operacional segue pendente; status OBS não promovido.

### Complemento após revisão do payload de health

- Ajuste validado: os status OpenAI/Gemini do health detalhado são carregados por usuário; HTTP global é visível somente ao admin; detalhes/erros/horários do scheduler são redigidos para não-admin inclusive no health básico; relatórios usam o `userId` do solicitante.
- Validação final em PostgreSQL descartável: backend 159/159, frontend 49/49 e Agent Sync 15/15, sem skips; builds/typechecks e dry-run passaram.
- A segunda revisão deve verificar novamente o contrato por papel e o uso de relatórios; o conteúdo global continua disponível ao admin autenticado por decisão de produto.

## NVIDIA-001 — limites do provider — 2026-10-18

- NVIDIA foi adicionada como provider independente, preservando OpenAI, Gemini, Ollama, Fish Audio e ElevenLabs. Chat usa API OpenAI-compatible; streaming/tools não foram habilitados.
- O catálogo servido pela aplicação é curado da documentação do provider, não prova disponibilidade da chave/conta. A conectividade real permanece não verificada.
- STT liga somente a NVIDIA Speech NIM auto-hospedada num endereço privado; fallback OpenAI exige opt-in. A API hosted Whisper/Canary documentada em gRPC não é tratada como HTTP.
- TTS Magpie PT-BR fica fora do fallback automático enquanto a quota não puder ser confirmada; testes manuais informam possível consumo.
- O adaptador registra tokens/latência e limites locais. Não estima custo monetário, pois não existe preço/quota consultado no fluxo; rate limit por processo não é quota de conta nem teto financeiro distribuído. Confirmar limite no provedor antes de ativar chamadas reais.

## ADR-0025 — NVIDIA_ZERO_SPEND fail-closed — 2026-10-19

Decisão: manter R$ 0,00 como orçamento mensal e negar no backend todas as operações hospedadas NVIDIA, seus testes e fallback pago enquanto não houver evidência confiável, específica da conta/modelo/operação, de entitlement sem cobrança e limites rígidos. Persistir a política por usuário junto às configurações, sem permitir que editar uma preferência no banco habilite inference. TTS local Piper é o fallback possível para a configuração NVIDIA; os outros provedores existentes permanecem intactos para suas próprias rotas. Não realizar chamadas reais para investigar preço ou quota. Reavaliar somente com documentação/console oficial verificável e aprovação explícita de orçamento diferente de zero.
