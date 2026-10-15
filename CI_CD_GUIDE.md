# CI/CD do JARVIS

Status: CI configurado para validar e gerar artefatos de web, Windows e Android a cada push/PR para `main`. Deploy VPS e submissao das lojas continuam pendentes de acesso e credenciais do publicador.

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

O APK gerado pelo CI e somente para validacao e nao pode ser enviado a Play Store. O AAB de loja exige a chave de upload protegida e a identidade do aplicativo na Play Console. O instalador Windows atual tambem ainda nao possui assinatura confiavel nem identidade MSIX do Partner Center. Nao coloque keystore, senhas, certificado ou JSON de conta de servico no codigo; configure-os como GitHub Actions Secrets quando a publicacao for habilitada.

## Atualizacao dos clientes

O companion Windows e o app Android atuais abrem a interface hospedada do JARVIS. Assim, quando a interface web e a API forem implantadas na VPS, as alteracoes dessas partes aparecem nos clientes na proxima abertura/recarregamento. Alteracoes no codigo nativo do companion ou no invólucro TWA exigem novos instaladores/pacotes. Para receber atualizacoes nativas via Microsoft Store ou Google Play, ainda e necessario submeter a nova versao e aguardar a analise da respectiva loja.

## Deploy

O deploy automatico da VPS nao foi ativado: este checkout nao possui metadados Git nem remoto configurado, e nao ha credenciais de deploy do GitHub Actions neste ambiente. O guia de producao tambem descreve topologia e caminhos que precisam ser conferidos na VPS atualmente ativa antes de automatizar uma publicacao. Nao adicione um deploy cego que possa substituir a aplicacao errada.

Para habilitar deploy continuo depois de reconectar o repositorio, primeiro confirme o caminho do Compose e o dominio/health check da VPS ativa. Em seguida, configure uma chave SSH exclusiva de deploy como secret do ambiente GitHub `production`, conceda a ela acesso minimo ao diretorio do app e teste o deploy manual com rollback. Somente depois disso habilite o job de producao em `main`.

Para automatizar upload de builds para as lojas, crie primeiro os apps nas contas Partner Center e Play Console e conclua os metadados/identidades. Use secrets dedicados para assinatura e API; comece por trilhas de teste (Play internal testing e submissao de teste/rascunho Microsoft) e mantenha a promocao para producao sujeita a revisao.
