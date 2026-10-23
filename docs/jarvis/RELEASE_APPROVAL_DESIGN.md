# JARVIS — desenho do gate de aprovação de release

**Status: API parcial implementada localmente; proveniência GitHub, integração de interface e consumidor de deploy não implementados.** O backend aceita somente rascunhos não verificados por dados do navegador, e bloqueia pedidos de aprovação até evidência confiável de origem/CI/branch protegida. Nenhum deploy é iniciado por esta API. Este documento não autoriza merge, release pública, conexão VPS ou deploy.

## Decisões do proprietário — 2026-10-23

- Validade da aprovação: **30 minutos**.
- Quórum: **um administrador com MFA**, distinto do autor/implementador da alteração.
- Targets previstos: **QA e produção**, sempre separados; uma aprovação de QA não vale para produção. O target deve estar vinculado ao SHA/digest e aos gates correspondentes.
- A aprovação vale somente para o SHA, digest e target exatos; qualquer mudança invalida a solicitação.
- A decisão define o gate da aprovação; não autoriza deploy nem publicação.
- Retenção da trilha de auditoria continua pendente de decisão; até lá, nenhum evento será removido automaticamente.

## Estado verificado em 2026-10-22

- O PR #2 permanece aberto; branch remota `chatgpt/jarvis-3-master-20261021`, HEAD `815a79ebc8c8767174a7c7b5bd1335f7560a8810`.
- CI `39852514814` passou nos jobs `validate`, `desktop` e `android` para esse SHA.
- Artefatos CI encontrados para o SHA/run: `jarvis-web-815a79e...`, `jarvis-windows-815a79e...` e `jarvis-android-test-815a79e...`. A API do GitHub informa todos ativos e seus digests SHA-256; isso confirma existência e proveniência do arquivo ZIP, não inspeção/instalação interna, assinatura de loja ou prontidão para produção.
- `.github/workflows/deploy-plan.yml` é exclusivamente plano manual fail-closed. `.github/workflows/release-downloads.yml` publica downloads públicos por tag depois de validar ancestralidade em `main` e CI do SHA exato. Esse gate de release pública não constitui aprovação de deploy da VPS.
- Rulesets, reviewers obrigatórios, proteção de tags e GitHub Environments não foram verificados remotamente.

## Invariantes de segurança

1. Um candidato é imutável e identificado por repositório, commit SHA completo, workflow run, branch, target, nome/ID do artefato, digest SHA-256 e tamanho. Não aceitar tags mutáveis, nomes isolados ou SHA abreviado como identidade.
2. Antes de aprovar, confirmar que o SHA está na branch protegida permitida para o target e que os checks obrigatórios do próprio SHA terminaram com sucesso. Pull requests, branches `codex/*`, OpenCode e commits que não estejam em `main` nunca podem implantar produção.
3. Aprovação é específica ao par `(SHA, digest)` e ao target. Qualquer alteração de artefato, SHA, checks, target ou metadados invalida a aprovação e exige nova revisão.
4. Somente conta administrativa autorizada, com MFA ativo e verificação step-up recente, pode aprovar. Não confiar somente no papel do JWT: verificar novamente usuário, papel, `authVersion`, MFA habilitado e expiração no momento de aprovar e consumir.
5. Aprovação expira, é de uso único e é consumida atomicamente. Decisão do proprietário em 2026-10-23: TTL de 30 minutos.
6. Registrar trilha append-only: candidato, evidências verificadas, aprovador, horário, target, expiração, resultado do consumo, identificador de execução, health check e eventual rollback. Nunca registrar tokens, chaves ou conteúdo de `.env`.
7. Aprovação do painel e aprovação do GitHub Environment são gates independentes. A implantação exige ambos, além de branch/environment protegido com revisor requerido. Nenhum branch de desenvolvimento executa deploy.
8. Backup/restore e rollback são gates próprios. Aprovar artefato não autoriza migration destrutiva, restauração de banco, exclusão ou alteração de segurança.

## Contrato proposto

- **ReleaseCandidate** (imutável): `id`, `repository`, `commitSha`, `sourceBranch`, `target`, `workflowRunId`, `checksSnapshot`, `artifactId`, `artifactName`, `artifactDigest`, `artifactSize`, `createdAt`, estado (`PENDING`, `APPROVED`, `EXPIRED`, `INVALIDATED`, `DEPLOYING`, `DEPLOYED`, `FAILED`, `ROLLED_BACK`).
- **ReleaseApproval** (append-only): candidato, target, usuário aprovador, `approvedAt`, `expiresAt`, versão de autenticação observada e identificador único de consumo. Uma revogação cria evento novo; não apaga o registro anterior.
- **ReleaseExecution** (append-only): candidato aprovado, digest novamente validado, execução, SHA anterior, backup de staging/prod identificado sem conteúdo sensível, resultado do health check, estado/erro sanitizado e referência de rollback.
- Criar candidato por processo confiável que valide metadados do GitHub Actions; o navegador não pode declarar checks, SHA ou digest como verdade. Para comunicação futura CI→JARVIS, preferir OIDC de curta duração com validação estrita de issuer, audience, repositório, workflow, ref, ambiente e SHA, em vez de segredo permanente no repositório.
- UI apresenta diff, SHA/digest, checks, migrações, riscos, plano de backup e rollback e validade. A confirmação exige step-up MFA; nenhuma ação é iniciada ao apenas abrir a tela.
- O job de deploy reconsulta/consome a aprovação, compara o digest do artefato baixado e valida os gates externos imediatamente antes de agir. Em falha, não tenta automaticamente rollback de banco; interrompe, mantém dados e apresenta o procedimento autorizado.

## Plano de implementação e validação

1. Fazer revisão independente deste desenho. TTL e quórum foram decididos pelo proprietário em 2026-10-23. A separação de target está definida; a retenção da auditoria continua pendente antes de habilitar qualquer consumidor de deploy.
2. **Parcial local:** migration/schema e rotas autenticadas para listar/criar rascunhos, solicitar aprovação, aprovar e rejeitar; TOTP de uso único, idempotência da solicitação, transações serializáveis, registro de auditoria e gates de SHA/digest, MFA, autoria e evidência. Testes de política e bloqueio passam localmente. Os metadados do navegador não provam proveniência; faltam integração GitHub/OIDC, vínculo OAuth de identidades, testes de banco para concorrência/expiração e revisão independente.
3. Implementar painel de revisão sem endpoint de deploy inicialmente; validar integração autenticada em staging sintético e isolamento entre usuários.
4. Implementar consumidor de aprovação com OIDC e Environment protegido. Manter `deploy-plan.yml` sem escrita remota até backup/restore/rollback em staging comprovados e revisão independente.
5. Inspecionar configurações de branch protection, tags e Environments no GitHub com permissão de leitura antes de qualquer ativação. Mudanças nessas proteções precisam de autorização própria.

## Bloqueios atuais

- Docker Desktop Linux está indisponível neste host; não foi iniciado container. E2E autenticado, backup, restauração e rollback de staging não foram executados.
- Atualização em 2026-10-23: o acesso somente de leitura foi autorizado, mas não há pin local confiável da host key. Há relato ainda não confirmado de possível sobrescrita de `/etc/ssh/ssh_host_rsa_key.pub`; nenhum SSH foi tentado nesta sessão. Primeiro validar os pares de host keys, `sshd -t` e fingerprint no console autenticado da Contabo pelo runbook `VPS_HOSTKEY_INCIDENT_RUNBOOK.md`. A instalação da conta temporária `jarvis-codex` e sua chave está autorizada somente depois dessa validação, e não foi realizada.
- Não se conhece ainda configuração remota de rulesets, reviewers de Environment ou proteção de tags.
- A revisão independente deste desenho permanece pendente. O código local contém migration e endpoints parciais; a migration não foi aplicada, a UI não consome a API, não há adapter de proveniência e nenhum workflow/consumidor de deploy foi adicionado.
