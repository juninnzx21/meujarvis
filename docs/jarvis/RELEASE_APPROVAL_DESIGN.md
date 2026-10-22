# JARVIS — desenho do gate de aprovação de release

**Status: REL-001 implementado localmente em revisão; deploy está desabilitado.** A migração não foi aplicada e os gates operacionais não podem ser aprovados sem staging comprovado. Não autoriza merge, release pública, conexão VPS ou deploy.

## Estado verificado em 2026-10-22

- O PR #2 permanece aberto; branch remota `chatgpt/jarvis-3-master-20261021`, HEAD `815a79ebc8c8767174a7c7b5bd1335f7560a8810`.
- CI `39852514814` passou nos jobs `validate`, `desktop` e `android` para esse SHA.
- Artefatos CI encontrados para o SHA/run: `jarvis-web-815a79e...`, `jarvis-windows-815a79e...` e `jarvis-android-test-815a79e...`. A API do GitHub informa todos ativos e seus digests SHA-256; isso confirma existência e proveniência do arquivo ZIP, não inspeção/instalação interna, assinatura de loja ou prontidão para produção.
- `.github/workflows/deploy-plan.yml` é exclusivamente plano manual fail-closed. `.github/workflows/release-downloads.yml` publica downloads públicos por tag depois de validar ancestralidade em `main` e CI do SHA exato. Esse gate de release pública não constitui aprovação de deploy da VPS.
- Rulesets, reviewers obrigatórios, proteção de tags e GitHub Environments não foram verificados remotamente.
- A revisão de implementação parte do PR #2 em `e45ba261752d09c2feb97e6644fe0bceece47497`; o trabalho REL-001 está isolado em `codex/rel-001-approval-20261022`.

## Invariantes de segurança

1. Um candidato é imutável e identificado por repositório, commit SHA completo, workflow run, branch, target, nome/ID do artefato, digest SHA-256 e tamanho. Não aceitar tags mutáveis, nomes isolados ou SHA abreviado como identidade.
2. Antes de aprovar, confirmar que o SHA está na branch protegida permitida para o target e que os checks obrigatórios do próprio SHA terminaram com sucesso. Pull requests, branches `codex/*`, OpenCode e commits que não estejam em `main` nunca podem implantar produção.
3. Aprovação é específica ao par `(SHA, digest)` e ao target. Qualquer alteração de artefato, SHA, checks, target ou metadados invalida a aprovação e exige nova revisão.
4. Somente conta administrativa autorizada, com MFA ativo e verificação step-up recente, pode aprovar. Não confiar somente no papel do JWT: verificar novamente usuário, papel, `authVersion`, MFA habilitado e expiração no momento de aprovar e consumir. A verificação step-up tem token de cinco minutos, hash armazenado e consumo transacional único.
5. A aprovação é de uso único e sua gravação é transacional. A validade operacional de uma aprovação (TTL) ainda requer política revisada antes de qualquer consumidor de deploy; atualmente o adaptador de deploy está desabilitado.
6. Registrar trilha append-only: candidato, evidências verificadas, aprovador, horário, target, expiração, resultado do consumo, identificador de execução, health check e eventual rollback. Nunca registrar tokens, chaves ou conteúdo de `.env`.
7. Aprovação do painel e aprovação do GitHub Environment são gates independentes. A implantação exige ambos, além de branch/environment protegido com revisor requerido. Nenhum branch de desenvolvimento executa deploy.
8. Backup/restore e rollback são gates próprios. Aprovar artefato não autoriza migration destrutiva, restauração de banco, exclusão ou alteração de segurança.

## Implementação local

- Prisma adiciona `ReleaseCandidate`, `ReleaseApproval`, `ReleaseAuditEvent` e `MfaStepUpGrant`, com SHA completo, run, artefato, digest, gates, status e ator.
- `POST /api/releases/candidates` aceita somente admin e registra atomicamente candidato e auditoria. `POST /:id/validate` consulta a API pública do GitHub para confirmar run, branch `main`, SHA, checks `validate`/`desktop`/`android`, ID e digest do artefato e proteção de branch. Status desconhecido não é classificado como branch inválida; falta de evidência bloqueia.
- Validações concorrentes usam token de posse; resultados obsoletos não podem sobrescrever uma aprovação ou uma tentativa mais recente. Candidatos aprovados/implantados são imutáveis.
- `POST /api/auth/mfa/step-up` consome um contador TOTP dentro da mesma transação que cria uma concessão curta. `/api/releases/:id/approve` exige admin diferente de quem abriu o candidato, MFA recente, todos os gates, reconsulta GitHub e faz consumo/aprovação/auditoria em transação serializável.
- A UI administrativa está em `/releases`, exibe gates bloqueados e não oferece ação de deploy. O adaptador backend sempre retorna `enabled: false` e falha fechado.
- `READY_FOR_APPROVAL` e `APPROVED` são inalcançáveis enquanto staging, backup/restore, rollback e health continuarem sem evidência. `EXPIRED` representa artefato expirado. Nenhum destes status indica deploy.
- O bloqueio de autoaprovação atualmente vincula o autor de implementação ao administrador que abre o candidato (`createdById`). O fluxo não tem identidade GitHub verificada do agente; uma revisão independente deve avaliar se essa identidade precisa de campo/integração própria antes de liberar aprovação real.

## Validação e pendências

- Validação local final: Prisma schema válido/generate; backend `npm run validate` passou, com **131 testes aprovados e 60 pulados** por falta de PostgreSQL Docker; **14 testes focados** em releases/MFA passaram; frontend `npm run validate` passou com **56 testes** e build.
- Testes PostgreSQL de migration/API, cross-user autenticado, consumo de concessão no banco, backup/restore/rollback e staging não foram executados. Docker Desktop Linux não está acessível.
- Revisão independente do código, verificação do workflow no GitHub Actions e confirmação de branch protection ainda são gates obrigatórios.
- Aprovação de deployment tem política de expiração ainda por decidir; qualquer futuro consumidor deverá verificar a validade no momento do consumo.
- A validação completa da branch protection exige `GITHUB_RELEASE_READ_TOKEN` com permissões GitHub de leitura limitadas; sem a variável, o backend bloqueia a checagem. O teste usou token sintético mockado, não uma credencial real.
- O endpoint de leitura de proteção de branch falha fechado; API pública sem acesso às configurações de proteção mantém o candidato bloqueado.
- Criar consumidor de aprovação com OIDC e Environment protegido somente depois de revisão, staging e backup/restore/rollback comprovados. `deploy-plan.yml` continua sem escrita remota.

## Bloqueios atuais

- Docker Desktop Linux está indisponível neste host; não foi iniciado container. E2E autenticado, backup, restauração e rollback de staging não foram executados.
- Acesso SSH permanece somente leitura autorizado, mas está bloqueado até receber nome de usuário não-root existente e fingerprint SHA256 da host key confirmada por canal confiável. Não houve conexão.
- Não se conhece ainda configuração remota de rulesets, reviewers de Environment ou proteção de tags.
- A migration está apenas no branch local e não foi aplicada; nenhum workflow de deploy, VPS, staging ou produção foi alterado.

### Configuração de leitura do GitHub

`GITHUB_RELEASE_READ_TOKEN` é opcional e fica somente no ambiente do backend. Sem ele, a consulta de branch protection não é autenticada e o candidato permanece bloqueado. Configure um GitHub App installation token ou fine-grained token limitado ao repositório `juninnzx21/meujarvis` e às permissões de leitura `Actions`, `Checks` e `Administration`; não use token clássico amplo. O backend envia o token somente para `https://api.github.com` e nunca o retorna ao frontend ou registra em logs. Os endpoints de artifacts exigem Actions read, check runs exigem Checks read e branch protection exige Administration read segundo a documentação oficial do GitHub ([artifacts](https://docs.github.com/en/rest/actions/artifacts), [branch protection](https://docs.github.com/en/rest/branches/branch-protection), [check runs](https://docs.github.com/en/rest/checks/runs)).
