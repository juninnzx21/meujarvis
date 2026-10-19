# Gates para CI/CD de produção do JARVIS

## Estado auditado em 2026-10-18

- Branch local: `codex/agent-sync-v1-20261017`, HEAD local `4dd20c88ab0a5c7522fba8536948279554cbc975` antes desta preparação.
- A branch local não foi encontrada no GitHub e não tem status/checks remotos. O PR #1 está aberto para `codex/jarvis-2.0-platform-20261015` (`eec24a6`), não contém os commits locais atuais e não substitui CI do AUTH-001.
- `ci.yml` executa jobs `validate`, `desktop` e `android`; artefatos de CI já recebem SHA no nome. Nenhum workflow faz deploy da VPS.
- `release-downloads.yml` publica quando uma tag `v*` é enviada. O nome/título e o APK de entrada continuam fixos em 2.0.0; portanto, a esteira não está pronta para releases de versões futuras sem atualização desse fluxo.
- Esta preparação restringiu permissões Actions e adicionou chave TOTP sintética isolada na CI. Nenhum workflow foi executado no GitHub, pois não houve push.

## Gates de segurança antes de avançar

| Gate | Evidência local | Falta |
|---|---|---|
| SEC-002 | Parser estrito, separação de chaves e backup autenticado revisados; backend 172/172, frontend 49/49, Agent Sync 17/17 e integração dedicada 11/11 sem skips | Decisão formal `reviewed_continue` registrada pelo protocolo. Não disparar ciclo pago enquanto a API estiver ausente e sem autorização específica. Não houve rotação real |
| OBS-001/OBS-002 | Revisão independente do código sem achado P2 aberto conhecido; backend 171/171, frontend 49/49, Agent Sync 17/17 | Smoke read-only no ambiente ativo. Faltam endpoint/porta SSH, conta não-root e fingerprint SHA256 confiável. Não testar por Docker socket ou shell root |
| AUTH-001 | Hardening TOTP local revisado; backend 175/175, frontend 49/49, Agent Sync 17/17; chave sintética da CI será distinta do JWT | CI remota no commit da branch e confirmação no runtime ativo de que `TOTP_ENCRYPTION_KEY` está definida, possui pelo menos 32 caracteres e difere de `JWT_SECRET`, sem imprimir nenhum dos valores |
| AI-001 | Nenhuma implementação iniciada | Dependência OBS-001 ainda não é `DONE_VERIFIED`; manter bloqueada. Chaves/quota de provedores e limite de custo também precisam de configuração de teste explícita |

## Smoke read-only de OBS

Executar somente depois de validar a host key por canal confiável e conectar com a conta não-root aprovada. O primeiro teste HTTP pode ser feito sem autenticação:

```sh
curl --fail-with-body --silent --show-error --dump-header - \
  https://apijarvis.juninnzxtec.com.br/api/health/public
```

Registrar apenas status HTTP, `X-Request-Id`, readiness, disponibilidade do banco e versão. Não copiar tokens, cookies, corpos de logs ou configurações. Não provocar falhas em produção. Para `/api/health/full`, usar somente conta de diagnóstico autorizada e registrar apenas resultado redigido; validar isolamento entre usuários apenas com contas/fixtures de teste autorizadas. Se a conta SSH não tiver acesso seguro a métricas Docker, parar e solicitar um wrapper root-owned de leitura, com saída revisada e sem acesso ao socket Docker para o agente.

Esse smoke confirma o estado observado naquele instante; não demonstra entrega de WhatsApp/e-mail, funcionamento integral dos provedores nem disponibilidade contínua.

## Verificação protegida da chave TOTP

O operador pode executar no container/backend ativo um teste booleano que não revela valor, comprimento exato nem hash da chave:

```sh
if [ -z "${TOTP_ENCRYPTION_KEY:-}" ]; then
  echo TOTP_KEY_ABSENT
elif [ "$TOTP_ENCRYPTION_KEY" = "${JWT_SECRET:-}" ]; then
  echo TOTP_KEY_REUSES_JWT
elif [ "${#TOTP_ENCRYPTION_KEY}" -lt 32 ]; then
  echo TOTP_KEY_TOO_SHORT
else
  echo TOTP_KEY_PRESENT_DISTINCT_AND_LENGTH_OK
fi
```

O comando deve ser executado em processo não interativo já dentro do container; não usar `docker inspect`, `env`, `printenv`, `set -x` ou logs que imprimam o ambiente. O resultado ainda precisa ser correlacionado ao serviço/container correto, sem publicar seu ambiente.

## Requisitos para deploy automático futuro

1. Confirmar em GitHub Rulesets/Branch protection: `main` exige pull request, aprovação independente, checks `validate`, `desktop`, `android`, bloqueia force push/deleção e limita bypass. Proteger tags `v*`. A configuração externa não foi inspecionada.
2. Restringir o Environment `production` a `main`; guardar credencial SSH dedicada somente nesse environment. Host key fixada por fingerprint confiável; conta sem root, Docker socket ou sudo genérico.
3. Produzir imagens Docker imutáveis etiquetadas pelo SHA completo do commit, guardar digests e reter artefato de rollback. O workflow atual não constrói/publica imagens Docker.
4. O job de deploy deve depender dos três jobs de CI e aceitar somente evento `push` para `main` protegida. PRs, tags e branches `codex/*`/OpenCode nunca implantam.
5. Antes de migrations: snapshot consistente do banco e backup de volumes/dados necessários, checksum, teste recente de restauração e retenção sem `prune`/exclusão.
6. Deploy atômico para release identificada pelo SHA, migrations apenas compatíveis, health check da API e dos containers, janela de observação e rollback para o digest anterior sem remover volumes.
7. Testar o procedimento em staging com restore e rollback observados. Só então configurar secrets/environment e ativar o workflow, com autorização de produção própria.

## Situação de ativação

Pronto: CI local das alterações atuais (`ValidateOnly`) passou em backend 175/175, frontend 49/49 e Agent Sync 17/17, sem skips; migrations, typechecks, builds, dry-run e `git diff --check` passaram. A validação focal SEC-002 anterior permanece em 11/11. A sintaxe das alterações YAML foi revisada estaticamente, mas não foi validada por GitHub Actions nem por actionlint neste ambiente.

Pendente: publicar branch para obter CI remoto; regras externas de proteção e Environment; smoke de OBS; verificação protegida da chave TOTP no runtime; identificar e verificar VPS, Compose e health endpoint atuais; desenvolver e testar a publicação de imagens por SHA com backup/rollback em staging. Não há deploy pronto para ativação nem alegação de prontidão total para produção.

## Atualização de CI/CD — 2026-10-18T20:00Z

- HEAD inicial desta rodada confirmado em `1acd0f7e8f47b4ae709b941c971a6cc03219099`, branch `codex/agent-sync-v1-20261017`, worktree limpa.
- `release-downloads.yml` valida tags `vMAJOR.MINOR.PATCH`, deriva o número de versão do tag para o instalador, título e checksum, e falha se não houver APK assinado com o mesmo nome de versão. A versão interna e o certificado do APK ainda requerem validação na revisão do asset. A publicação de releases por tags continua ativa quando o workflow estiver no repositório padrão; nenhum tag foi criado nesta tarefa.
- Adicionado `deploy-plan.yml`, somente `workflow_dispatch`, restrito a `main`, sem secrets, SSH, migrations ou comandos remotos. Tentativas com publicação real falham fechadas. É um plano executável sem efeitos, não um workflow de deploy.
- O CI existente nomeia artefatos pelo SHA completo do commit. Não há build/push de imagem Docker por SHA/digest, deploy real, teste de health remoto ou rollback operacional implementado.
- Validação remota GitHub Actions continua pendente: branch ainda não publicada. YAML foi revisado estaticamente; actionlint e parser YAML não estão disponíveis localmente. Builds de desktop/Android e release não foram executados nesta rodada.
- Nenhuma regra GitHub, branch protection, environment ou required reviewer foi verificada. A proteção de tags e do workflow de release também permanece externa.
- Estados preservados: SEC-002 `IN_PROGRESS` aguardando gate formal; OBS-001/OBS-002 `IN_REVIEW` aguardando smoke read-only; AUTH-001 `IN_REVIEW` aguardando CI remota e prova booleana TOTP protegida; AI-001 bloqueada por OBS-001. Não há tarefa funcional local elegível liberada pelos gates atuais.
- VPS: endpoint legado conhecido `[VPS_ENDPOINT_REDACTED]`; porta atual, usuário não-root e fingerprint confiável não confirmados. Nenhuma conexão foi feita. A autorização existente cobre apenas leitura.
- Sem push, merge, deploy, secrets reais, banco de produção, scheduler ou ciclo pago.

## Revisão local adicional — 2026-10-19

- Commits preservados no histórico: `2467af9` e `4f461f0`; branch atual `codex/agent-sync-v1-20261017`, base desta rodada `e98b677`.
- Workflow `release-downloads.yml` continua acionado por tags `v*` e publica uma release pública. Além de exigir tag alcançável por `main`, o job agora exige um run `JARVIS CI` disparado por `push` em `main`, para o SHA exato da tag, com conclusão `success`. O job declara `actions: read` e `contents: write` apenas no job publicador. Revisão local não substitui validação no GitHub.
- GitHub Actions remoto, rulesets/branch protection, restrições de criação de tags, required reviewers e settings do `GITHUB_TOKEN` não foram inspecionados. Antes de uso real, proteger `main` e tags, revisar permissões do publicador e validar o workflow em branch/repositório seguro.
- Não existe deploy operacional: `deploy-plan.yml` é somente plano manual fail-closed. Staging, health remoto, backup/restore operacional e rollback ainda não validados. Não pronto para deploy automático na VPS.
- A validação local atual passou: backend 177/177, frontend 49/49, Agent Sync 17/17, zero skips; build/typecheck/dry-run e diff-check. Nenhum CI remoto ou release executado.
- Endpoint VPS confirmado: `[VPS_ENDPOINT_REDACTED]:22014`; ainda faltam conta não-root e fingerprint SHA256 por canal confiável. Sem tentativa de conexão.
