# JARVIS — desenho do gate de aprovação de release

**Status: desenho técnico; nenhum fluxo de aprovação ou deploy foi implementado.** Este documento define o contrato para uma implementação local futura. Não autoriza merge, release pública, conexão VPS ou deploy.

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
5. Aprovação expira, é de uso único e é consumida atomicamente. Definir o TTL exato como decisão de produto/segurança antes da implementação; sugestão inicial para revisão: 15 minutos.
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

1. Fazer revisão independente deste desenho e decidir TTL, política de aprovador (uma ou duas pessoas), targets e retenção da auditoria.
2. Implementar schema/API de candidatos e aprovações com transações serializáveis, idempotência, autorização por função e step-up MFA. Testar expirado, replay, SHA/digest alterado, aprovador revogado, cross-user, concorrência e rejeição de branch experimental.
3. Implementar painel de revisão sem endpoint de deploy inicialmente; validar integração autenticada em staging sintético e isolamento entre usuários.
4. Implementar consumidor de aprovação com OIDC e Environment protegido. Manter `deploy-plan.yml` sem escrita remota até backup/restore/rollback em staging comprovados e revisão independente.
5. Inspecionar configurações de branch protection, tags e Environments no GitHub com permissão de leitura antes de qualquer ativação. Mudanças nessas proteções precisam de autorização própria.

## Bloqueios atuais

- Docker Desktop Linux está indisponível neste host; não foi iniciado container. E2E autenticado, backup, restauração e rollback de staging não foram executados.
- Acesso SSH permanece somente leitura autorizado, mas está bloqueado até receber nome de usuário não-root existente e fingerprint SHA256 da host key confirmada por canal confiável. Não houve conexão.
- Não se conhece ainda configuração remota de rulesets, reviewers de Environment ou proteção de tags.
- A implementação deste fluxo fica pendente de revisão deste desenho; nenhum endpoint, migration ou workflow de deploy foi adicionado.
