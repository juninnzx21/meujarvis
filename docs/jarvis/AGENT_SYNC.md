# JARVIS Agent Sync V1 — executor local supervisionado

## Credenciais SSH e múltiplos agentes

Agent Sync continua local e pausado. A preparação de acesso VPS para Codex/OpenCode é descrita em `docs/jarvis/VPS_ACCESS.md` e não dá acesso de produção ao Agent Sync. Cada agente deve usar sua própria worktree física e branch; nunca dividir uma pasta entre processos. SSH de diagnóstico é read-only, sem senha compartilhada, chave privada em prompts/logs, encaminhamento de agente, sudo genérico ou socket Docker. Toda operação de escrita exige autorização explícita separada.

O Agent Sync executa no computador do operador, junto do checkout Git e do Codex CLI autenticado. Ele não roda na VPS nem dentro do backend público: o Codex precisa acessar um checkout local, enquanto a aplicação da VPS não deve receber acesso ao sistema de arquivos ou ao Docker do host.

## Checkpoint local de 2026-10-18

`run-cycle.ps1 -ValidateOnly` passou após a remediação de OBS-001/OBS-002: backend 171/171, frontend 49/49 e Agent Sync 17/17, zero skips; Docker+SQL, migrations, typechecks/builds e `git diff --check` passaram. Dry-run encontrou zero tarefas elegíveis, não encontrou `OPENAI_API_KEY`, confirmou Codex autenticado e manteve scheduler/produção desativados. Nenhum ciclo pago foi executado. A validação inclui a aceitação de `nextTaskId: null` e `activeTaskId: null`, que representam backlog sem tarefa elegível e ausência de tarefa reservada. A revisão independente final fechou o achado P2 de `getWebhookUrl`; OBS-001/OBS-002 continuam em revisão até smoke operacional autorizado e gate formal. AI-001 continua bloqueada pela dependência de OBS-001 `DONE_VERIFIED`.

Checkpoint local das correções de observabilidade e remoção da ferramenta global do Brain: `a56a9516a1d014273325153cfe3877d0a5a298c3`. Sem push, ciclo de modelo ou alterações de produção.

## SEC-002 — revisão independente e parser estrito

Uma revisão estática encontrou que as funções de cifra ignoravam componentes após ciphertext válido. `decryptSecret` e `needsReEncryption` agora exigem exatamente cinco segmentos para valores `enc:v1`/`enc:v2`; regressões cobrem ambas as versões com sufixo adicional. Após a alteração, `run-cycle.ps1 -ValidateOnly` passou com backend 172/172, frontend 49/49 e Agent Sync 17/17, zero skips; a integração SEC-002 obrigatória verificou Docker+SQL e passou 11/11. A re-revisão independente confirmou o fechamento e não encontrou outro problema de código no escopo. SEC-002 permanece `IN_PROGRESS` até o gate formal; o dry-run continua sem tarefa elegível, scheduler e produção desativados. Nenhum modelo foi chamado.

## AUTH-001 — hardening TOTP local

O decoder TOTP exige envelope `totp:v1` canônico com três campos após o prefixo, IV 12 bytes, tag 16 bytes e ciphertext não vazio; `TOTP_ENCRYPTION_KEY` igual a `JWT_SECRET` é recusada no schema e no serviço. Revisão independente direcionada confirmou as correções. ValidateOnly passou com backend 175/175, frontend 49/49 e Agent Sync 17/17, zero skips; a integração SEC-002 passou 11/11. AUTH-001 segue `IN_REVIEW` aguardando CI da branch e verificação operacional protegida da chave. Dry-run não encontrou tarefa elegível; scheduler pausado, sem chamada paga ou produção.

## Ciclo

1. Lê `JARVIS_MASTER_PLAN.md`, títulos recentes de `JARVIS_PROGRESS.md`, `docs/jarvis/STATE.json` e o estado Git.
2. Calcula localmente tarefas `TODO`/`READY` cujas dependências estejam `DONE_VERIFIED`; o GPT só pode escolher uma dessas tarefas.
3. O agente desenvolvedor Codex recebe uma tarefa de baixo risco em `workspace-write`, sem rede, com permissões auditadas e sem acesso explícito aos arquivos `.env` conhecidos.
4. Antes de chamar qualquer modelo, exige que o verificador compartilhado comprove positivamente o PostgreSQL descartável por container, ID/digest de imagem pinados, bind loopback, tmpfs sem volumes persistentes, isolamento de rede, credenciais correspondentes e consulta SQL da identidade do servidor. Hostname ou nome contendo `test` não bastam. As validações aplicam migrations somente após essa prova e depois executam backend/frontend com ambiente sintético, sem herdar `.env` do processo.
5. Envia ao revisor GPT o escopo, o diff sanitizado e limitado a 64 KiB, o relatório do agente e o resultado resumido dos testes. Arquivos sensíveis, binários e diffs grandes bloqueiam o envio.
6. Persiste metadados em `tools/agent-sync/.state/runs.json`, ignorado pelo Git. Após testes e aprovação do revisor, altera a tarefa de `TODO`/`READY` para `IN_REVIEW` em `STATE.json`, registra uma linha de progresso e só então escolhe outra tarefa elegível. Nunca marca `DONE_VERIFIED` automaticamente.

## Preparação local

Requisitos: Node.js 20+, npm, Git, Codex CLI autenticado e uma chave da OpenAI configurada somente na sessão local do operador. Não grave a chave em arquivos versionados e não cole a chave em prompts ou relatórios.

```powershell
Set-Location .\tools\agent-sync
npm install
npm run validate
npm run dry-run
```

Prepare previamente um PostgreSQL descartável em loopback com nome contendo `test` e configure `JARVIS_AGENT_SYNC_TEST_DATABASE_URL` somente na sessão. Exemplo de formato: `postgresql://agent:valor-local@127.0.0.1:55433/jarvis_agent_sync_test`. O runner recusa iniciar planejador/desenvolvedor se esse gate não passar; não use a base de desenvolvimento ou produção.

`dry-run` não chama modelos e não escreve arquivos. Antes das validações reais, o runner aplica as migrations versionadas somente no PostgreSQL descartável aprovado pelo gate; ele falha fechado se a URL não for loopback e não tiver nome de teste. A execução real começa apenas por comando explícito:

```powershell
..\..\tools\agent-sync\run-cycle.ps1
```

O script lê a credencial aleatória do container de teste sem imprimi-la, configura a URL apenas no processo do runner e solicita a chave OpenAI com entrada oculta se ela ainda não estiver no ambiente. Para validar ambiente/Codex sem solicitar chave ou iniciar ciclo, execute `..\..\tools\agent-sync\run-cycle.ps1 -ValidateOnly`.

O runner PowerShell `tools/agent-sync/run-cycle.ps1` prepara o ambiente: lê a credencial sem exibi-la do container dedicado, configura o banco apenas no processo do runner, instala dependências, valida, executa dry-run e verifica o login do Codex. Sem `-ValidateOnly`, exige worktree limpo, pede a chave da API em prompt oculto `Cole sua NOVA chave OpenAI:` se ela não estiver no ambiente, executa exatamente um ciclo e limpa as variáveis temporárias ao terminar.

Por padrão é um ciclo. `JARVIS_AGENT_SYNC_MAX_CYCLES` pode limitar a execução a 1–3 ciclos; não há timer, tarefa Windows, cron ou execução automática configurada. O worktree precisa estar limpo e em branch `codex/*`. O runner não faz commit, push, merge, deploy, reinícios nem alterações na VPS.

## Custos e limites

O planejador e o revisor usam a API da OpenAI e precisam de `OPENAI_API_KEY`; essas chamadas são faturadas separadamente da assinatura ChatGPT. O desenvolvedor usa a autenticação local do Codex CLI, sujeita a disponibilidade, limites e permissões da conta. Sem chave API, o estado é `not_configured` e apenas o dry-run funciona. O comportamento real de modelos externos não foi validado nesta branch.

## Aprovações e recuperação

Risco diferente de baixo, tarefa inelegível, falha de teste, diff sensível/grande, solicitação de aprovação do Codex ou rejeição do revisor interrompe o encadeamento. Inspecione o diff antes de continuar. Em queda abrupta, o lock em `.state/run.lock` é preservado; confirme que não há processo ativo antes de removê-lo manualmente. Não habilite scheduler até revisão deste V1, ciclo real supervisionado e autorização separada.

Estado nesta revisão: PostgreSQL 16 descartável saudável em `127.0.0.1:55433`, container `jarvis-agent-sync-postgres-test`, dados tmpfs e limites de 1 CPU/1 GiB; o runner recupera a credencial sem exibi-la. O runner aplica migrations apenas nesse banco descartável antes de validar o backend. TypeScript, 7 testes, dry-run com o banco, e autenticação Codex passaram. O ciclo GPT→Codex→GPT aguarda uma chave OpenAI recém-rotacionada fornecida no prompt oculto do runner. Nenhuma chamada de modelo, alteração remota, publicação ou mudança de produção ocorreu.

O runner local resolve `git.exe` com `Get-Command`, testa que Node consegue iniciá-lo e passa o caminho explícito às operações Git do Agent Sync e ao subprocesso Codex. A pasta do Git é acrescentada ao PATH apenas no processo do runner e restaurada ao sair; o PATH global do Windows não é alterado.

No Windows, a verificação da CLI prioriza `CODEX_CLI_PATH` se apontar para um arquivo existente; caso contrário, procura `codex.exe` por `Get-Command`. O teste `codex login status` é iniciado via Node para evitar diferenças do tratamento de stderr do PowerShell. O valor de `CODEX_CLI_PATH` é restaurado ao fim do runner.


A revisão SYNC-001 de 2026-10-17T20:49:03Z tornou a resolução da CLI consistente entre dry-run e ciclo. A função comum verifica que o executável Windows existe e que codex login status confirma autenticação, sem imprimir o conteúdo da saída. O runner procura a instalação integrada do aplicativo quando a variável e o PATH não a informam; shims de shell não são passados diretamente ao SDK. A CLI existente foi localizada, então nenhuma instalação foi iniciada.
## Agent Sync — correção da validação interna do ciclo — 2026-10-17

- Run anterior `bd7e5e0d-5641-4be8-a88f-9b32b56fb59d` em `MEM-001` parou em `test-database-migrations: ENOENT`; o lock foi liberado e não houve alterações parciais de MEM-001.
- Causa confirmada: `execFile("npm", ...)` não resolve `npm.ps1`/`npm.cmd` pelo ambiente Windows sanitizado. O preflight usava o wrapper do PowerShell, portanto as duas fases executavam comandos de forma diferente.
- Correção: resolver `npm-cli.js` uma vez e iniciá-lo com `process.execPath` tanto no `validate-local` como nas validações do ciclo. O runner usa esse mesmo fluxo e inclui migrations, seed sintético, backend, frontend e `git diff --check`.
- A configuração de validação isolada permite o login demo sintético e configura uma chave Gemini fictícia porque as chamadas externas são mockadas. Nenhum provedor real recebe requisições. A fixture de criptografia agora modifica o authentication tag, evitando alteração apenas de bits não significativos em Base64URL.
- Validação completa `run-cycle.ps1 -ValidateOnly`: migration PASS, seed PASS, backend 82/82 e build PASS, frontend 49/49 e build PASS, Agent Sync 8/8, `git diff --check` PASS. Dry-run `DRY_RUN_OK`; Codex autenticado; `MEM-001` elegível; OpenAI ausente e scheduler desativado.
- Nenhum ciclo de modelo foi iniciado porque as correções ainda precisavam de checkpoint limpo; nenhuma chave foi solicitada/recebida. Próximo passo após commit local: iniciar exatamente um ciclo e aguardar chave nova no prompt mascarado.

## Diagnóstico de contexto de teste — runs 41178b4b e 3a2d0831 (2026-10-17)

Os dois runs foram rejeitados sem diff. O preflight verde e a alegação do agente sobre ausência de PostgreSQL não se contradizem: o PostgreSQL descartável é acessível somente ao coordenador local; o sandbox Codex tem rede desabilitada e não recebe URLs de DB. A rejeição decorreu da falta de implementação/critério, não de falha observada do banco host. O segundo run também apontou a ausência de uma política TTL; a inspeção confirma que não há `expiresAt` nem job de expiração identificado. Não inventar TTL nesta tarefa.

O contexto do desenvolvedor agora inclui evidência resumida do preflight e deixa explícita a fronteira host/sandbox. O coordenador roda preflight antes dos modelos e executa as validações após o diff. O revisor é instruído a não confundir limitação sandbox com indisponibilidade do host, porém ainda deve rejeitar ausência de diff ou critérios não cumpridos. A tarefa MEM-001 recebeu critérios complementares em `docs/jarvis/tasks/MEM-001.md`.

Validação somente local concluída com `run-cycle.ps1 -ValidateOnly`: migrations e seed PASS; Agent Sync 11/11; backend 82/82 + build; frontend 49/49 + build; `git diff --check` PASS; dry-run PASS com PostgreSQL e Codex autenticado. OpenAI não configurada; nenhum modelo/ciclo foi iniciado. Lock ausente. Dois PowerShells antigos (10232, 88452) ainda permanecem abertos sem lock ou filhos diretos; não foram encerrados.

MEM-001 continua TODO. Próximo passo: revisão humana do diagnóstico e das alterações locais; qualquer novo ciclo real depende de solicitação explícita e chave API nova configurada localmente. Agendamento segue desligado.

## Protocolo de resultado atualizado — 2026-10-17T22:02:40Z

O histórico runs.json conserva os valores antigos. Na versão anterior, a falha de validação também podia aparecer como review_rejected. Na versão atual, blocked é planejamento/elegibilidade; validation_failed é falha da suíte local sem chamar GPT; no_changes é ausência de diff após testes aprovados, sem chamar GPT; review_rejected exige chamada real do revisor. testsPassed registra somente os testes do coordenador. Apenas reviewed_continue após diff não vazio, testes aprovados e decisão favorável promove a tarefa para IN_REVIEW.

A configuração do SDK omite as URLs do PostgreSQL do ambiente Codex e executa a thread com networkAccessEnabled=false. O coordenador roda os testes no host. Não foi sondada uma sessão real nem iniciado outro ciclo pago.

npm run validate --prefix tools/agent-sync passou TypeScript e 13/13 testes. MEM-001 continua TODO, scheduler desativado e mudanças locais ainda não commitadas.

## Transferência segura do contexto de MEM-001

O agente desenvolvedor recebe a especificação local de `docs/jarvis/tasks/MEM-001.md` e apenas os nomes/status das validações sanitizadas do coordenador. O sandbox Codex mantém rede desativada e não recebe `DATABASE_URL`, `JARVIS_AGENT_SYNC_TEST_DATABASE_URL` nem `OPENAI_API_KEY`. O coordenador local é responsável pelas migrations, seed e suítes PostgreSQL antes e depois do diff; o revisor recebe o diff e as evidências reais do host. A limitação de rede do sandbox não pode ser descrita como indisponibilidade do banco host.

Resultados têm semântica distinta: `blocked` para impedimento de planejamento; `validation_failed` se a suíte local do coordenador falhar; `no_changes` se não houver diff; `review_rejected` somente quando o revisor GPT foi executado e recusou. `testsPassed` informa exclusivamente a suíte local do coordenador. Somente diff não vazio, testes aprovados e decisão `continue` podem avançar a tarefa para `IN_REVIEW`; não se marca `DONE_VERIFIED` automaticamente.

Validação do protocolo: Agent Sync 13/13; preflight completo passou em 2026-10-17. Um único ciclo pode ser iniciado manualmente depois de commit limpo e entrada de chave OpenAI nova no prompt oculto. Agendamento continua desativado.

## Integração SEC-002 — marcador de banco de teste

As validações locais encaminham `JARVIS_AGENT_SYNC_TEST_DATABASE_URL` ao processo do backend somente após o gate do coordenador confirmar por Docker e SQL a identidade do container PostgreSQL descartável; igualdade de nome/hostname/flag não libera o destino. A URL coincide com `DATABASE_URL` dessa execução. O Vitest ignora uma `DATABASE_URL` arbitrária e substitui provedores/segredos por fixtures sintéticas. Essa variável continua fora do ambiente Codex, cuja thread segue sem rede.

## SEC-002 — gate de rotação com identidade positiva

A rotação de settings, gravação de backup e restauração chamam o mesmo verificador Docker/SQL antes de qualquer efeito colateral. A identidade exige container e digest de imagem fixados, health, credenciais coincidentes, porta exposta apenas em loopback, tmpfs de dados com opções exatas, nenhum mount persistente e rede bridge Docker dedicada com apenas o container de teste. Essa rede não bloqueia egress; fixtures são sintéticas. Rotação e restauração confirmam SQL pela conexão transacional que executa a operação; a rotação repete o gate antes do backup em disco. A CLI aceita somente `--dry-run` como argumento; sem argumento inicia operação real que continua bloqueada para qualquer alvo que não passe a prova positiva do banco descartável. `--confirm-non-test-database` foi removida e não existe bypass genérico. A revisão local de 2026-10-18 adicionou separação obrigatória das chaves de settings e JWT, recuperação da integridade do backup via chave anterior e regressões. Validação: backend 168/168, frontend 49/49 e Agent Sync 15/15, sem skips; integração SEC-002 dedicada 11/11. Commits anteriores `610cfdc` e `2370f3f`; correções atuais ainda locais. SEC-002 segue `IN_PROGRESS` aguardando revisão independente pós-correção.
## ValidateOnly OBS-002 — 2026-10-18

- `run-cycle.ps1 -ValidateOnly` executou as validações com o PostgreSQL descartável identificado por container Docker e SQL. Backend 158/158, frontend 49/49 e Agent Sync 15/15; zero skips; typecheck/builds e `git diff --check` passaram.
- O dry-run confirmou `DRY_RUN_OK`, Codex disponível/autenticado, ausência de `OPENAI_API_KEY`, nenhuma tarefa elegível e scheduler/produção desabilitados. Nenhum ciclo de modelo foi chamado.
- O preflight também corrigiu a resolução do script de identidade SQL, usando caminho relativo à raiz do repositório; há teste de regressão.
- Validação repetida após correção do escopo dos campos globais de health: backend 159/159 (21 arquivos), frontend 49/49, Agent Sync 15/15, todos sem skips; migrations, typechecks, builds e dry-run aprovados. Nenhuma chave OpenAI presente; nenhuma chamada de modelo ou ciclo real.

## Checkpoint NVIDIA-001 — 2026-10-18

O ValidateOnly concluiu com `LOCAL_VALIDATION_OK`: PostgreSQL descartável e migrations aprovados; backend 175/175, frontend 49/49, Agent Sync 17/17, zero skips; build/typecheck/dry-run/diff-check passaram. NVIDIA chat/STT/TTS foram exercitados apenas por mocks e credencial sintética. Sem chamada externa, custo, quota ou entitlement validados. Nenhum ciclo Agent Sync, scheduler, VPS, push, merge ou deploy foi iniciado.

## ValidateOnly local — NVIDIA ZERO_SPEND e release gate — 2026-10-19

`run-cycle.ps1 -ValidateOnly` terminou `LOCAL_VALIDATION_OK`: PostgreSQL descartável identificado por Docker+SQL, migrations aprovadas; backend 177/177 (23 arquivos), frontend 49/49 (9 arquivos), Agent Sync 17/17; zero skips; typechecks/builds/dry-run/diff-check PASS. Nenhuma OPENAI_API_KEY, tarefa elegível, chamada paga ou operação de produção. NVIDIA Zero Spend bloqueia LLM/STT/TTS/probes e fallback pago. Workflow release agora exige CI push success para o SHA exato em main; permanece somente revisão local, sem GitHub Actions remoto. VPS sem conexão; conta não-root e fingerprint confiável continuam pendentes. Scheduler pausado.


## Continuidade master — estado do runner — 2026-10-19

Revisão independente estática confirmou que o teste NVIDIA mocka e bloqueia fetch antes da rede, além de verificar Axios. Não encontrou impacto nas outras provas; SDKs/transporte nativo futuros exigem cobertura própria. ValidateOnly passou após a alteração e o dry-run reporta zero tarefas elegíveis, scheduler e produção desligados. Não publicar a branch sem revisão/sanitização do histórico de 93 commits. Nenhum push, PR, merge, deploy, acesso VPS ou ação paga.

\n