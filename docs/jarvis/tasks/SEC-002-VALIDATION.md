# SEC-002 — evidências de implementação e validação

Data: 2026-10-18 UTC. Implementação/validação local concluídas; status **IN_PROGRESS** porque o gate `reviewed_continue` do Agent Sync não foi executado. Sem deploy, publicação ou acesso a produção. Todos os dados, credenciais e chaves usados nesta validação foram sintéticos.

## Implementação

- `SETTINGS_ENCRYPTION_KEY` é a única chave usada para novas cifras `enc:v2:`; sua ausência ou comprimento inferior a 32 caracteres falha sem fallback JWT. A chave anterior é validada e usada apenas durante a janela de rotação.
- `enc:v1:` mantém a leitura em ordem de chave dedicada, chave anterior e `JWT_SECRET` legado. `enc:v2:` tenta exclusivamente as chaves dedicada atual/anterior. Formato desconhecido, IV/tag/ciphertext inválido, falha de autenticação e texto não UTF-8 falham fechados. Registro v2 que não pode ser validado é pendente e aborta a rotação em vez de ser contado como atual.
- `settingsRotationService` prepara os dados dentro de uma transação serializável. Cria previamente um arquivo exclusivo, validado por Zod, com valores `enc:v2:` e HMAC derivado da chave dedicada, cobrindo contagens, identidade dos registros, ciphertexts e metadados. Segredos antigos em texto simples são cifrados para o backup e para o novo valor. Atualizações parciais são revertidas pelo PostgreSQL.
- `--dry-run` não cria diretório/arquivo nem altera dados. A CLI aceita somente `--dry-run`; não há flag capaz de liberar um banco não descartável.
- Restauração valida campos, versão, contagens, registros duplicados, chaves secretas e assinatura HMAC; também decifra todos os valores antes da transação. Alterações em ciphertext, identidade ou metadados invalidam a assinatura. Backups v1 não autenticados são rejeitados.
- `backend/storage/backups/` permanece ignorado pelo Git. Backups preexistentes foram preservados; nenhum backup existente foi restaurado, alterado ou removido.

## Evidência de ambiente

- PostgreSQL descartável identificado como `jarvis_agent_sync_test`, imagem `postgres:16-alpine`, porta publicada somente em `127.0.0.1:55433`, sem mounts/volumes. A consulta local confirmou o nome do banco e a validação de identidade do container foi exigida antes dos testes.
- A URL foi obtida em memória apenas para o processo de validação e não foi impressa nem persistida. A suíte SEC-002 valida protocolo PostgreSQL, host loopback, nome contendo `test` e igualdade com `DATABASE_URL`; sem a variável exclusiva do runner, os testes de integração são ignorados deliberadamente.
- Schema/migrations já estavam provisionados no banco descartável. Esta rodada não executou migrations nem seed; produção e VPS não foram acessadas.

## Suítes e resultados

- `encryptionService.test.ts`: **11/11** testes unitários aprovados — cifra v2, tamanho/ausência de chave, adulteração de IV/tag/ciphertext, formato desconhecido, leitura v1 via JWT legado, chave anterior, independência de JWT, classificação de rotação, configurações secretas e mascaramento.
- `settingsRotation.integration.test.ts`: **8/8** testes aprovados, sem skips no PostgreSQL descartável — dry-run sem escrita/backup, rotação v1 e texto simples, backup sem texto claro, idempotência, JWT independente, restauração do arquivo real, rejeição de backup inválido e rollback integral após falha simulada no banco.
- `backend/npm run validate`: Prisma Client, typecheck principal e do seed, **12 arquivos / 106 testes aprovados** e build TypeScript aprovado.
- `frontend/npm run validate`: typecheck, **9 arquivos / 49 testes aprovados** e build Vite aprovado. Aviso preexistente de bundle principal acima de 500 kB.
- `tools/agent-sync/npm run validate`: typecheck e **13/13** testes aprovados.
- CLI `settings:rotate --dry-run`: executou contra o PostgreSQL descartável limpo (0 configurações encontradas) sem alterar o inventário dos backups. A execução com URL sintética de banco não descartável foi bloqueada antes de conectar.
- `git diff --check`: PASS após revisão e staging seletivo dos 25 arquivos desta tarefa; nenhum backup local ignorado foi incluído no índice.
- Commit local: `38dc53b` (`feat(security): add versioned settings key rotation (SEC-002)`); sem push. Estado da tarefa permanece `IN_PROGRESS` até revisão independente protocolar.

## Recuperação e falhas

- O arquivo de backup produzido no teste de rotação foi lido e restaurado; os três registros retornaram ao estado recuperável e o segredo originalmente em texto simples permaneceu cifrado também no backup/restauração.
- Um trigger exclusivo do banco descartável simulou falha durante atualizações concorrentes. A transação reverteu todos os registros; o backup prévio ficou disponível como ponto de recuperação e foi removido junto ao diretório temporário sintético do próprio teste.
- Uma cifra adulterada causou abortamento anterior ao backup e nenhuma configuração válida foi alterada. Backups locais preexistentes não foram tocados.

## Limites e próximo gate

Nenhuma chave real foi importada, migrada ou rotacionada. Não há evidência de deploy ou estado de produção; a chave dedicada deve ser provisionada pelo operador em gestor de segredos e a janela com chave anterior só pode ser encerrada após recuperação validada. `SEC-002` segue `IN_PROGRESS` até revisão protocolar; não promover a `IN_REVIEW` sem o gate independente nem marcar `DONE_VERIFIED` automaticamente.

## Revisão técnica de segurança e correção local — 2026-10-18

- Revisão inicial somente de leitura: **APROVADO COM RESSALVAS**. Problema comprovado: antes da correção, restore aceitava um valor `enc:v1:`/`enc:v2:` pelo prefixo sem autenticar ciphertext ou metadados, permitindo backup alterado restaurar valor ilegível ou transferir cifra válida a outro registro.
- Correção: formato de backup v2 assinado com HMAC derivado por separação de domínio de `SETTINGS_ENCRYPTION_KEY`; a assinatura cobre versão, timestamp, contagens, identidade de cada registro, chave, ciphertext e `updatedAt`. Valores do backup são sempre `enc:v2:` sob a chave dedicada. Restore valida assinatura e decifra todos os valores antes de iniciar transação. Backups v1 não autenticados são rejeitados.
- A chave atual ou anterior que assinou/cifrou o backup deve continuar disponível para restauração. Backups v1 preexistentes não são importados automaticamente; mantê-los preservados, sem tentar restaurá-los por caminho não autenticado.
- Estratégia de recuperação legada documentada: backup v1 fica preservado e não pode ser restaurado diretamente. Conversão só pode ser considerada offline após prova de procedência por hash/assinatura confiável preexistente, validação AEAD de cada valor e conferência independente de cada identidade/chave; checksum calculado depois não prova autenticidade e AEAD não autentica associação a registro. Sem prova, recuperar os valores nas fontes autoritativas e cadastrá-los novamente pelo fluxo normal v2. Qualquer conversor v1->v2 requer revisão e validação próprias antes de uso; nenhum bypass foi criado.
- Testes unitários pós-correção: encryption service e backup integrity — **15 aprovados**; testes que dependem de PostgreSQL no arquivo de integração foram **9 ignorados**, pois `JARVIS_AGENT_SYNC_TEST_DATABASE_URL` não está configurada neste ambiente.
- `backend/npm run validate`: Prisma generate, typecheck, typecheck:seed e build passaram; **54 testes passaram e 57 foram ignorados** em 13 arquivos. A suíte de API e suítes que alteram PostgreSQL agora são ignoradas sem uma URL de teste explícita validada.
- `frontend/npm run validate`: **49/49** testes, typecheck e build passaram; permanece aviso de bundle maior que 500 kB.
- `git diff --check`: PASS. Não foram conectados bancos nem utilizados segredos reais. A validação integrada de rotação/restauração/rollback pós-correção permanece pendente porque nenhum banco descartável foi configurado.
- A revisão reportada não foi repetida após a correção, e o gate Agent Sync `reviewed_continue` continua não executado. `SEC-002` permanece `IN_PROGRESS`; nenhuma transição de estado foi feita.

### Validação integrada final pós-correção — 2026-10-18

- Identidade antes da execução: container `jarvis-agent-sync-postgres-test`, imagem PostgreSQL 16, saudável, sem mounts, publish somente `127.0.0.1:55433`; banco confirmado internamente como `jarvis_agent_sync_test`. As credenciais sintéticas do container ficaram somente em memória e não foram exibidas.
- `prisma migrate status/deploy`: seis migrations encontradas, schema já atualizado, zero migrations pendentes. O seed geral não foi executado porque inclui dados de perfil/demo que não são fixture puramente sintético; os testes criam/removem seus próprios registros sintéticos e uma fixture descartável já existia no banco de teste.
- SEC-002 focado: **24/24 passaram, zero skips** — 12 unitários de cifragem, 9 integrações PostgreSQL e 3 testes de integridade offline. Cobre backup legítimo/restauração, adulteração de ciphertext e identidade/HMAC, rejeição de backup v1, chave atual/anterior, rotação/idempotência e rollback transacional.
- Uma primeira execução expôs que o teste de rollback não preparava dados pendentes após a restauração; o fixture foi corrigido para recolocar um ciphertext v1 sintético antes de injetar falha. Repetição passou integralmente.
- Backend `npm run validate`: Prisma generate, typecheck, typecheck:seed e build PASS; **111/111 testes em 13 arquivos**, zero skips. Frontend validate: typecheck/build PASS, **49/49**; warning conhecido de bundle acima de 500 kB. Agent Sync validate: typecheck e **13/13**, scheduler pausado.
- `git diff --check` e `STATE.json` JSON validation PASS. Nenhum segredo real, produção, VPS, push ou deploy foi acessado.
- Recuperação v1: backups antigos permanecem preservados e restore direto é recusado. Conversão só é admissível com prova de procedência independente preexistente, validação AEAD de cada valor e associação independente registro/identidade; sem isso, recuperar valores em suas fontes autoritativas e gravar novamente pelo fluxo normal v2. Ferramenta conversora ainda não existe e exige revisão própria.
- `SEC-002` permanece `IN_PROGRESS` até segunda revisão independente e gate protocolar. Está pronto para segunda revisão; não marcar `DONE_VERIFIED` automaticamente.

## Correção do gate de isolamento PostgreSQL — 2026-10-18

- Achados da revisão independente que motivaram esta correção: o gate aceitava qualquer serviço PostgreSQL de loopback cujo database apenas contivesse `test`, e a suíte API removia memórias/tarefas globais por prefixo, sem restringir aos fixtures do run.
- Alteração local: preflight do backend e Agent Sync exigem URL exata do alvo, inspect do container `jarvis-agent-sync-postgres-test` saudável (imagem PostgreSQL 16, publish só em `127.0.0.1:55433`, sem mounts, data em tmpfs), credenciais da URL iguais às configurações do container e, antes de qualquer mutação, confirmação SQL do database, role, porta e IP interno do container. Diagnósticos não incluem URL nem credenciais.
- A suíte API passou a criar conta e dados de controle sintéticos com identificadores aleatórios por run, remove somente essas contas próprias e verifica no teardown que registros de outro usuário com o prefixo histórico continuam intactos. Removida a limpeza ampla de drafts, memórias, tarefas e extratos. Agent Sync não executa seed global, que contém dados de perfil/demo.
- `JARVIS_AGENT_SYNC_TEST_DATABASE_URL` e `DATABASE_URL` estavam ausentes nesta sessão. Portanto nenhum migrate/seed, conexão, restore, rotação ou teste PostgreSQL foi executado; os 9 testes SEC-002 PostgreSQL e demais suítes DB permanecem não validados e com skips. Metadados do container foram inspecionados sem exibir segredos, mas isso não substitui a autenticação e consulta SQL exigidas pelo novo gate.
- Validações locais após a correção: backend `npm run validate` PASS em geração Prisma, typecheck, typecheck:seed e build; testes **59 aprovados / 57 ignorados** (11 arquivos passaram, 3 suítes ignoradas). Frontend `npm run validate` PASS, **49/49**, build PASS com aviso conhecido de bundle >500 kB. Agent Sync `npm run validate` PASS, typecheck e **14/14**, zero skips. `git diff --check` deve ser repetido após a revisão final dos arquivos.
- As aprovações históricas registradas acima não comprovam o novo gate. `git diff --check` e validação sintática do `STATE.json` passaram após as mudanças documentais. `SEC-002` continua `IN_PROGRESS`; sem reexecutar integrações PostgreSQL pós-fix com zero skips obrigatórios não há aceite, commit desta correção, `reviewed_continue`, promoção de estado ou prontidão para produção.

## Resultado final da validação integrada — 2026-10-18

- O bloqueio de banco ausente acima descreve o estado **antes** desta execução e foi resolvido para a validação local. O container `jarvis-agent-sync-postgres-test` foi confirmado como `postgres:16-alpine`, saudável, em tmpfs de 1 GiB, sem mounts persistentes e com o único bind `127.0.0.1:55433`. A conexão SQL confirmou `jarvis_agent_sync_test`, porta PostgreSQL interna e IP do container antes de qualquer mutação; as credenciais descartáveis ficaram apenas em memória e não foram registradas.
- Migrations: seis presentes e schema atualizado, zero pendentes. Nenhum seed global executado. As integrações usaram dados e chaves sintéticos, fixtures limitadas ao usuário/run próprio e teste explícito de preservação dos registros de outro usuário.
- Testes focados de SEC-002, MEM-001 e API: **57/57 aprovados, zero skips** (9 integrações SEC-002, 5 de isolamento MEM-001, 43 testes de API). A validação completa do backend aprovou **116/116 em 14 arquivos, zero skips**, com Prisma generate, typecheck, typecheck:seed e build aprovados.
- Frontend `npm run validate`: **49/49**, typecheck e build aprovados; permanece o aviso conhecido de bundle acima de 500 kB. Agent Sync `npm run validate`: typecheck e **14/14**, zero skips. A regressão de ordem do texto de contexto foi corrigida na fixture (identidade do DB antes de migrations) e a bateria foi repetida.
- Revisão do caminho de hooks: `core.hooksPath` não está explicitamente configurado; o diretório efetivo contém somente arquivos `.sample`, portanto nenhum hook ativo foi ignorado ou contornado. Nenhum processo Node associado a esta worktree permaneceu ativo na inspeção.
- SEC-002 permanece `IN_PROGRESS` até segunda revisão independente e gate protocolar `reviewed_continue`. O estado não foi avançado; Agent Sync/scheduler seguem pausados. Nenhum segredo real, produção, VPS, rotação real, push, merge ou deploy foi acessado. Backups v1 antigos continuam preservados e não são restaurados por bypass; a estratégia documentada exige proveniência confiável preexistente e validação offline independente, ou recuperação nas fontes autoritativas.

## Correção P1 — identidade positiva da CLI de rotação — 2026-10-17 BRT / 2026-10-18 UTC

- A regra anterior baseada em loopback e database contendo `test` foi removida. O verificador compartilhado exige o container `jarvis-agent-sync-postgres-test`, imagem `postgres:16-alpine` com ID e digest imutáveis pinados, estado saudável, credenciais correspondentes à URL, publish único em `127.0.0.1:55433`, tmpfs de dados com exatamente `rw,noexec,nosuid,size=1g`, nenhum bind/mount persistente, rede `bridge` com somente o container e nenhuma capacidade adicional/modo host.
- Antes de operações, SQL confirma database `jarvis_agent_sync_test`, role configurada, IP interno do container e porta 5432. Docker é inspecionado novamente após a consulta, e a operação aborta se o ID/imagem mudar. Essa verificação protege a CLI, rotação, criação de backup e restauração antes de efeitos colaterais.
- Na rotação e restauração, a identidade SQL também é verificada pela mesma conexão transacional que lê/altera os settings; a rotação repete o gate imediatamente antes do primeiro backup em disco. A criação de backup independente valida o alvo antes de criar diretório/arquivo.
- `--confirm-non-test-database` e qualquer autorização genérica foram removidas. Argumentos extras são rejeitados antes do serviço; o único argumento funcional é `--dry-run`.
- Testes negativos verificam nomes parecidos, porta errada, aliases locais/túnel, credenciais, outro container/imagem/digest, publish público/extra, volume/bind persistente, tmpfs inseguro/conflitante, modo host e membro adicional na rede. A integração prova que recusas não criam backup nem modificam registros.
- Verificação real: Docker/SQL PASS; 6 migrations presentes e nenhuma pendente. `backend/npm run validate`: **142/142**, 15 arquivos, zero skips, Prisma generate/typecheck/typecheck:seed/build PASS; `frontend/npm run validate`: **49/49**, typecheck/build PASS; `tools/agent-sync/npm run validate`: **14/14**, typecheck PASS. CLI recusou a flag antiga com exit 2; `--dry-run` passou e o inventário de backups não mudou.
- Rotação, backup, restauração e rollback legítimos passaram apenas no PostgreSQL descartável com dados/chaves sintéticos. Nenhuma migration foi executada nesta rodada, nenhum banco persistente foi alterado e nenhuma credencial real, VPS ou produção foi acessada.
- Commits locais: `610cfdc` e `2370f3f`; o segundo repete a prova SQL na conexão transacional para reduzir a janela entre gate e mutação. Ambos permanecem sem push.
- SEC-002 permanece `IN_PROGRESS`, aguardando nova revisão independente e gate formal `reviewed_continue`. O pin de imagem falha fechado se o container/imagem mudar; atualizar ID/digest exige inspeção e revisão deliberadas.

## Re-revisão de ressalvas e correções — 2026-10-18

- Auditoria encontrou três ressalvas: a rede padrão `bridge` era compartilhada; a autenticação do backup não usava a chave anterior se a atual estivesse ausente; e a configuração aceitava reutilizar `JWT_SECRET` como chave de settings.
- Correções: gate exige bridge Docker dedicada `jarvis-agent-sync-test`, com somente o container descartável conectado, e preserva publicação em `127.0.0.1:55433`; `verifySettingsBackupIntegrity` pode verificar a HMAC usando somente a chave anterior configurada; schema e serviço rejeitam chave de settings igual a JWT. Novo `backend/src/config/env.test.ts` cobre as duas chaves. Novo `npm run test:sec002:integration` verifica primeiro Docker+SQL e falha fechado se a identidade não for confirmada.
- A opção de rede Docker `internal` foi testada, mas o Docker Desktop não permitiu conectar o runner Windows à publicação loopback. A bridge dedicada usada para integração isola o PostgreSQL de outras redes de containers, porém permite egress; não há fixtures/credenciais reais.
- `run-cycle.ps1 -ValidateOnly`: `LOCAL_VALIDATION_OK`; backend **168/168 em 22 arquivos**, frontend **49/49**, Agent Sync **15/15**, todos sem skips. Migrations e identidade SQL passaram; Prisma/typechecks/builds passaram; dry-run confirmou OpenAI ausente, nenhuma tarefa elegível, scheduler e produção desabilitados.
- `npm run test:sec002:integration`: identidade PostgreSQL verificada e **11/11 passaram, zero skips**, incluindo restore de backup HMAC autenticado com apenas a chave anterior configurada. Os dados de fixture originais foram restaurados no `finally`; testes exercitam exclusivamente o container de teste.
- Limites: nenhuma chave real, banco persistente, VPS, produção, push, merge ou deploy foram acessados. A bridge permite egress; SEC-002 continua `IN_PROGRESS`, aguardando re-revisão independente posterior a estas mudanças e gate formal.

## Validação de parser após re-revisão — 2026-10-18

- A revisão independente identificou que `enc:v1`/`enc:v2` com um segmento adicional eram aceitos por `decryptSecret`, pois o parser ignorava sufixos. `needsReEncryption` e `decryptSecret` agora exigem exatamente cinco segmentos.
- Teste de regressão gera ciphertext válido para as duas versões, anexa segmento extra e verifica que decifragem falha fechada; a rotação sinaliza ambos como não atuais.
- `run-cycle.ps1 -ValidateOnly`: Docker+SQL e migrations PASS; backend **172/172** (22 arquivos), frontend **49/49** (9 arquivos), Agent Sync **17/17**, zero skips; typechecks, builds, dry-run e `git diff --check` PASS.
- `npm run test:sec002:integration --prefix backend`: identidade do PostgreSQL descartável verificada; **11/11** testes aprovados, zero skips, incluindo rotação, restore autenticado e rollback.
- Re-revisão independente confirmou o fechamento do P2 e não encontrou outro achado de código no escopo. A inconsistência P3 no registro de segurança foi corrigida na tabela; a evidência antiga 142/142 foi explicitamente rotulada como histórica.
- SEC-002 permanece `IN_PROGRESS` aguardando gate formal `reviewed_continue`. Nenhuma rotação com credenciais reais, banco persistente, produção, VPS, push, merge, deploy, ciclo pago ou scheduler foi usada.
