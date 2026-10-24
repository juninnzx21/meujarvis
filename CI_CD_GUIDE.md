# CI/CD do JARVIS

Status: CI valida web/API/desktop/Android debug por push. Uma tag SemVer `vMAJOR.MINOR.PATCH` em commit alcançável por `main` aciona a release pública, com nomes derivados da tag e exigência de APK assinado correspondente em `release-assets/JARVIS-MAJOR.MINOR.PATCH-Android.apk`. O deploy para VPS e submissões nas lojas são etapas separadas. Os workflows usam `contents: read` por padrão; somente o job de publicação da release recebe `contents: write`. A CI injeta uma chave TOTP sintética, distinta do JWT, apenas para validação.

O estado dos gates e o checklist de produção estão em [`docs/jarvis/CI_CD_PRODUCTION_GATE.md`](docs/jarvis/CI_CD_PRODUCTION_GATE.md). O workflow falha se a tag não for SemVer ou se não existir o APK da mesma versão. A presença e assinatura desse APK ainda devem ser verificadas por revisão antes de criar uma tag.

## O que o CI deve validar

- Backend install.
- Backend Prisma validate.
- Backend test.
- Backend build.
- Frontend install.
- Frontend test.
- Frontend build.
- Desktop companion: testes, validacao e instalador Windows.
- Android: compilacao de APK de validacao.
- Varredura basica de padroes sensiveis.

## O que acontece em cada commit

Quando o workflow estiver no repositorio GitHub e um commit chegar a `main`, o GitHub Actions valida backend/frontend/desktop e compila o frontend, o instalador Windows e um APK Android de teste. Os artefatos ficam anexados a execucao daquele commit por 30 dias. Em pull requests os mesmos checks rodam, mas isso nao publica nada.

O APK de release é produzido localmente com keystore protegida e enviado como asset versionado `release-assets/JARVIS-<versão-da-tag>-Android.apk`; a senha e o keystore não entram no Git. O workflow valida a existência do arquivo de mesma versão, mas a verificação do `versionName` interno e do certificado ainda exige revisão do APK. O EXE é compilado no workflow de release e permanece sem assinatura Authenticode, então o Windows pode exibir SmartScreen. O APK serve para instalação direta e não substitui o AAB necessário para Play Console. Não coloque keystore, senhas, certificados ou JSON de conta de serviço no código.

Para publicar downloads, envie uma tag SemVer somente após revisar assets e gates. O workflow `release-downloads.yml` compila o instalador com a versão da tag, exige o APK assinado de mesma versão, gera `SHA256SUMS.txt` e cria a release pública no GitHub. A página `/downloads` usa URLs versionados. Mudanças na página ainda precisam ser implantadas no frontend de produção.

## Atualizacao dos clientes

O companion Windows e o app Android atuais abrem a interface hospedada do JARVIS. Assim, quando a interface web e a API forem implantadas na VPS, as alteracoes dessas partes aparecem nos clientes na proxima abertura/recarregamento. Alteracoes no codigo nativo do companion ou no invólucro TWA exigem novos instaladores/pacotes. Para receber atualizacoes nativas via Microsoft Store ou Google Play, ainda e necessario submeter a nova versao e aguardar a analise da respectiva loja.

## Deploy

O deploy automático da VPS não foi ativado. `.github/workflows/deploy-plan.yml` é manual e somente de planejamento: exige `main`, não acessa secrets nem SSH e falha se `enable_real_deploy` for verdadeiro. Não executa comandos remotos.

Para habilitar deploy continuo depois de reconectar o repositorio, primeiro confirme o caminho do Compose e o dominio/health check da VPS ativa. Em seguida, configure uma chave SSH exclusiva de deploy como secret do ambiente GitHub `production`, conceda a ela acesso minimo ao diretorio do app e teste o deploy manual com rollback. Somente depois disso habilite o job de producao em `main`.

Antes de automatizar produção, configure no GitHub regras de proteção para `main`: alterações apenas por pull request, aprovação de revisor diferente do autor, checks obrigatórios `validate`, `desktop` e `android`, bloqueio de force push e restrição de quem pode alterar a branch. Configure também ruleset para tags `v*`. O estado dessas regras é externo ao repositório e não foi verificado nesta preparação.

O deploy automático ainda não está pronto. Faltam endpoint/porta atuais, usuário não-root, fingerprint SSH confiável, caminho Compose e health checks confirmados. O workflow atual não constrói nem implanta imagens; CI existente guarda artefatos de validação nomeados por SHA completo do commit, mas isso ainda não equivale a uma imagem de produção publicada por digest. A arquitetura futura deve aceitar somente `main` protegida após CI e aprovação/environment, fixar host key, criar backup verificável antes de migrations compatíveis, executar health checks e reverter a aplicação ao digest anterior. Rollback de banco exige procedimento próprio, separado da reversão de aplicação. Volumes e bancos persistentes devem ser preservados; nenhuma rotina deve executar prune ou excluir dados. Validar o procedimento em staging antes de ativar produção.

Para automatizar upload de builds para as lojas, crie primeiro os apps nas contas Partner Center e Play Console e conclua os metadados/identidades. Use secrets dedicados para assinatura e API; comece por trilhas de teste (Play internal testing e submissao de teste/rascunho Microsoft) e mantenha a promocao para producao sujeita a revisao.
