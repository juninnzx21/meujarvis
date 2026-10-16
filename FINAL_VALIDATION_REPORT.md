# FINAL_VALIDATION_REPORT

## Atualizacao 2026-05-18 - Reset seguro da Evolution

Resultado: **APROVADO** para a correcao do erro de delete no fluxo operacional.

- Implementado reset seguro da instancia Evolution pelo painel `/whatsapp`.
- O backend tenta logout/delete sem expor segredo e registra falhas com redacao.
- O frontend exige confirmacao textual `RESETAR EVOLUTION` antes da acao.
- Testes backend/frontend atualizados e aprovados: backend 41 testes, frontend 16 testes.
- Frontend `npm run validate` passou; backend `npm run validate` precisou parar processos Node por EPERM do Prisma no Windows e foi reexecutado.

Ressalva real: se a Evolution API retornar 404/405 ou bloquear remocao da instancia, o painel mostra `manual_action_required`; nesse caso a limpeza final precisa ser feita no manager/API com permissao adequada.

## Atualizacao 2026-05-18 - CMD online de logs

Resultado: **APROVADO** para melhoria de observabilidade.

- Painel `/logs` atualizado como CMD online do JARVIS.
- Backend adicionou `GET /api/logs/summary`.
- Webhook WhatsApp passou a registrar eventos redigidos para diagnosticar chegada, ignorados, processamento, previa de extrato e auto reply desativado.
- Backend: testes passaram com 41 testes.
- Frontend: testes passaram com 16 testes.
- Segredos e payload bruto nao sao exibidos no painel.

Ressalva real: WhatsApp/Evolution ainda precisa configuracao real em producao para responder mensagens. Se uma mensagem nao gerar `whatsapp.webhook_received`, a Evolution nao chamou o webhook oficial.

## Checagem publica de URLs 2026-05-17

Resultado: **APROVADO**.

Escopo restrito: apenas status HTTP basico das URLs publicas, sem login, webhook, payload, rotas privadas, pentest, fuzzing, teste ofensivo ou credenciais.

| URL | HTTP | Tipo | Observacao |
| --- | ---: | --- | --- |
| `https://jarvis.juninnzxtec.com.br` | 200 | HTML | Frontend publico respondeu. |
| `https://apijarvis.juninnzxtec.com.br/api/health` | 200 | JSON | API oficial respondeu. |
| `https://apijarvis.juninnzxtec.com.br/api/health/public` | 200 | JSON | Health publico respondeu. |
| `https://apijarvis.juninnzxtec.com.br/api/health/full` | 200 | JSON | Health full respondeu. |
| `https://n8njarvis.juninnzxtec.com.br` | 200 | HTML | n8n online; resposta HTML contem estrutura do app n8n. |

Ressalva operacional: esta checagem confirma disponibilidade publica basica, mas nao valida autenticacao, workflows, webhooks, Evolution, Home Assistant ou fluxos internos.

Data/hora: 2026-05-16 16:29:54 -03:00

Diretorio: `E:\jarvis-home-assistant`

Repositorio: `https://github.com/juninnzx21/meujarvis.git`

Branch: `main`

Commit atual validado: `b09a7d6 test: run full jarvis system validation`

Resultado final: **APROVADO COM RESSALVAS**

## Validação completa 2026-05-16 19:11

Resultado desta rodada: **APROVADO COM RESSALVAS**.

- Commit validado: `8188a4c feat: enrich personal profile memory base`.
- Tag recente: `v1.1.1-personal-memory-base`.
- Backend: audit 0 vulnerabilidades, Prisma OK, migrations OK, seed pessoal idempotente, 37 testes passando, validate e build passando.
- Frontend: audit 0 vulnerabilidades, 12 testes passando, validate e build passando.
- Produção: `https://jarvis.juninnzxtec.com.br` OK, API oficial `https://apijarvis.juninnzxtec.com.br/api` OK, health público OK, health full OK, `https://n8njarvis.juninnzxtec.com.br` OK.
- Segurança: `.env`, backups, imports, documents, n8n/data, node_modules e dist ignorados. Nenhum segredo real versionado identificado.
- WhatsApp/Evolution: testes automatizados do webhook passaram, incluindo wake phrase, fromMe/grupo e anexos. Uso real ainda depende de credenciais/configuração operacional.
- Financeiro: testes de contas, categorias, assistente, OFX/CSV, revisão obrigatória e importação aprovada passaram.
- Documentos/RAG: endpoints e frontend existem; busca textual/local preparada; IA externa/pgvector não ativados por padrão.
- PWA/mobile: manifest, service worker seguro, atalhos e `/mobile-assistant` validados por código/build.

Ressalvas reais: backend/frontend dev locais não estavam ativos, `jarvis/api` não é rota pública da API, health full ainda não reflete Settings de integrações, Home Assistant/Evolution/n8n real exigem credenciais e teste operacional, E2E Playwright completo segue planejado.

API publica oficial: `https://apijarvis.juninnzxtec.com.br/api`.

Webhook WhatsApp/Evolution oficial: `https://apijarvis.juninnzxtec.com.br/api/whatsapp/webhook`.

Atualizacao desta rodada: diagnosticos OpenAI/Gemini refinados, scheduler com erro redigido, API `apijarvis` oficializada e guia de producao WhatsApp criado.

Fase Mobile/PWA: manifest, service worker seguro, icones, prompt de instalacao, atalhos e tela `/mobile-assistant` adicionados e validados localmente.

Rodada WhatsApp/Evolution: configuracao real preparada, guia de producao ampliado e payload do webhook redigido antes de persistir.

Auditoria final: Docker Desktop foi iniciado, PostgreSQL local subiu em `127.0.0.1:5432`, a primeira tentativa de backend falhou por banco indisponivel, a validacao foi reexecutada apos subir o banco e passou.

Proximo passo operacional: backend/frontend foram revalidados, scripts operacionais foram reexecutados, producao foi validada via `apijarvis`, `DEPLOY_NEXT_STEPS.md` foi criado e Evolution/WhatsApp permanece pronto para configuracao real no painel.

Fase 10: adicionada fundacao JARVIS 100000/10 com n8n proprio em Docker, workflows importaveis, EventBus/IntegrationEvent, memoria semantica local segura, modulo de documentos/RAG preparado, CI inicial e documentacao operacional.

Base pessoal: `npm run seed:personal` foi atualizado para importar 47 memorias canonicas sobre Junior Rodrigues / Juninnzx, reconhecer aliases de titulos antigos, remover duplicatas equivalentes, bloquear padroes sensiveis e registrar apenas resumo redigido em `SystemLog`.

WhatsApp QR in-app: a tela `/whatsapp` agora permite configurar Evolution API, criar/selecionar instancia, gerar QR Code ou pairing code, fazer polling de conexao e configurar webhook automaticamente quando a Evolution suportar. API key permanece criptografada/mascarada e o webhook continua exigindo `ei jarvis`.

## Resumo

A auditoria confirmou que o projeto local esta consistente: dependencias instalam, auditoria npm nao encontrou vulnerabilidades, Prisma valida, migrations estao em sincronia, testes backend/frontend passam e builds passam.

A producao responde no frontend e na API dedicada `apijarvis`. O dominio principal ainda nao roteia `/api/*` para backend; por isso a API publica operacional deve ser considerada `https://apijarvis.juninnzxtec.com.br/api`.

## Comandos que passaram

Backend:

- `npm install`
- `npm audit --omit=dev`
- `npx prisma generate`
- `npx prisma validate`
- `npx prisma migrate status`
- `npm run test`
- `npm run validate`
- `npm run build`

Frontend:

- `npm install`
- `npm audit --omit=dev`
- `npm run test`
- `npm run validate`
- `npm run build`

Raiz/scripts:

- `docker compose ps`
- `Test-NetConnection localhost -Port 5432`
- `.\status-jarvis.ps1`
- `.\validate-jarvis.ps1`
- `.\backup-jarvis.ps1`

Producao:

- GET `https://jarvis.juninnzxtec.com.br`
- GET `https://apijarvis.juninnzxtec.com.br/api/health`
- GET `https://apijarvis.juninnzxtec.com.br/api/health/full`

PWA/local:

- GET `http://127.0.0.1:5174/manifest.webmanifest`
- GET `http://127.0.0.1:5174/sw.js`
- Browser local em `http://127.0.0.1:5174/`

Seguranca:

- `.env`, `backend/.env`, backups, node_modules, dist e imports estao ignorados.
- Varredura nao identificou segredo real versionado.

## Comandos com ressalvas

- Primeira tentativa de `npm run test`/`npm run validate` no backend: falhou porque Docker/PostgreSQL estavam parados. Corrigido com abertura do Docker Desktop e `docker compose up -d postgres`; reexecutado com sucesso.
- `.\status-jarvis.ps1`: executou, mas backend/frontend locais nao estavam ativos nas portas 3001/5173.
- `Test-NetConnection localhost -Port 3001`: falhou porque backend local nao estava iniciado.
- `Test-NetConnection localhost -Port 5173`: falhou porque frontend local nao estava iniciado.
- GET `https://jarvis.juninnzxtec.com.br/api/health`: HTTP 200, mas retornou HTML do frontend.
- GET `https://jarvis.juninnzxtec.com.br/api/health/full`: HTTP 200, mas retornou HTML do frontend.

## Evidencias principais

- Backend: 34 testes aprovados.
- Frontend: 10 testes aprovados.
- Backend validate: typecheck, seed typecheck, testes e build aprovados.
- Frontend validate: typecheck, testes e build aprovados.
- PWA: manifest com nome, atalhos e icone maskable validado.
- Service worker: guardas para nao cachear `/api`, `Authorization` e `cookie` validadas.
- Browser: tela local carregou com JARVIS/Login.
- WhatsApp/Evolution: endpoints revisados, API key criptografada em `Setting`, frontend mostra apenas mascara/flags e webhook exige `ei jarvis`.
- Anexos: OFX/CSV tratados como documento/anexo e fluxo de importacao exige revisao antes de gravar transacoes.
- Producao: health dedicado retornou app/database OK, scheduler running e WhatsApp `not_configured` sem quebrar.
- PostgreSQL: healthy em `127.0.0.1:5432`.
- API dedicada health: app OK, database OK.
- Scheduler producao: enabled/running.
- n8n/WhatsApp/Home Assistant: `not_configured`, sem quebrar.
- OpenAI/Gemini: configurados e com status atual `configured` em producao.

## Modulos validados por testes

- Auth/login.
- Auth me.
- Health/full health.
- Chat e conversas.
- Memorias.
- Tarefas.
- Automacoes e bloqueio de acao perigosa.
- Fallbacks n8n/WhatsApp/Home Assistant.
- Configuracoes de n8n/WhatsApp/financeiro.
- Home Assistant seguro/mock.
- Comandos.
- Rotinas.
- Relatorios.
- Notificacoes.
- Tarefas vencidas/lembretes.
- Financeiro.
- Assistente financeiro.
- Importacao OFX/CSV.
- WhatsApp webhook com exigencia de `ei jarvis`.
- WhatsApp OFX/CSV sem legenda nao e tratado como audio.
- Diagnosticos OpenAI/Gemini para quota, chave invalida e modelo inexistente.

## Pendencias reais

1. Corrigir ou oficializar roteamento de API no dominio principal.
2. Monitorar OpenAI e Gemini para queda de quota/chave/modelo.
3. Configurar Evolution API real em producao.
4. Configurar n8n real em producao.
5. Configurar Home Assistant real em producao.
6. Rotacionar todos os segredos compartilhados anteriormente.
7. Validar deploy do commit atual na VPS/Fabweb.
8. Criar testes E2E com navegador real.
9. Implementar monitoramento externo e backup offsite.
10. Revisar/automatizar start do Docker Desktop no ambiente local.

## Proximo passo recomendado

1. Rotacionar chaves e senhas compartilhadas.
2. Definir oficialmente a API publica como `https://apijarvis.juninnzxtec.com.br/api` ou corrigir Caddy para `/api/*` no dominio principal.
3. Configurar Evolution API e testar: `ei jarvis status do sistema`.
4. Testar OFX/CSV com legenda `ei jarvis importar esse extrato do Inter`.
5. Rodar novo deploy com o commit final desta rodada e revalidar health, login e WhatsApp.

## Conclusao

**APROVADO COM RESSALVAS**

O sistema esta em bom estado tecnico para evolucao e uso pessoal controlado. Para uso diario real sem supervisao, ainda depende de credenciais/configuracao das integracoes e confirmacao de deploy do commit atual. Para producao comercial, precisa hardening operacional, monitoramento, E2E, backup offsite, politicas de privacidade e governanca de usuarios.

## Fase 10 - JARVIS 100000/10

Status final: **APROVADO COM RESSALVAS**.

Implementado:

- n8n proprio em Docker com banco separado, porta local, scripts operacionais e guia de producao.
- 10 workflows n8n JSON sem credenciais reais.
- EventBus interno com persistencia de eventos, logs redigidos e disparo opcional para n8n.
- Estrutura de memoria semantica local e busca semantica/textual.
- Modulo Documentos/RAG com upload seguro, chunks e busca.
- Melhorias nas telas de n8n, documentos e assistente mobile.
- CI basico, guias de hardening, monitoramento, offsite backup e documentacao final.

Comandos aprovados:

- Backend: `npm audit --omit=dev`, `prisma generate`, `prisma validate`, `prisma migrate status`, `npm run test`, `npm run validate`, `npm run build`.
- Frontend: `npm audit --omit=dev`, `npm run test`, `npm run validate`, `npm run build`.
- Scripts: `status-jarvis`, `validate-jarvis`, `backup-jarvis`, `start-n8n`, `status-n8n`, `backup-n8n`.
- Producao: frontend 200, API oficial health 200 JSON, health full 200 JSON.

Pendencias reais:

1. Configurar `N8N_ENCRYPTION_KEY`, Basic Auth forte, DNS/Caddy e HTTPS do n8n em producao.
2. Importar workflows no n8n e configurar credenciais dentro do painel n8n.
3. Configurar Evolution API, n8n e Home Assistant reais.
4. Ativar monitoramento externo.
5. Implementar Playwright E2E completo.
6. Avaliar pgvector real e embeddings externos com consentimento.
7. Rotacionar segredos que ja foram compartilhados anteriormente.

Conclusao: a Fase 10 elevou o JARVIS para uma plataforma pessoal de automacao e conhecimento com n8n local funcional, mas a parte comercial/producao plena ainda depende de acoes manuais seguras.

## Central de Configuracoes e Integracoes

Status: **APROVADO COM RESSALVAS**.

Criado:

- `INTEGRATIONS_CONTROL_CENTER.md`.
- `IntegrationConfigService`.
- `/api/integrations/status`, `/config`, `/test/:provider`, `/bootstrap/:provider`, `/logs`, `/setup-wizard` e `/events`.
- `/integrations`, `/settings/integrations`, `/integrations/setup-wizard` e `/integrations/events`.
- Endpoints n8n para workflows locais.
- Endpoint WhatsApp para tentar configurar webhook.

Validado por testes:

- Configuracao segura nao retorna segredo.
- Segredo salvo em `Setting` nao fica plaintext.
- Wizard responde etapas.
- Workflows n8n locais sao listados.
- Configure webhook retorna status seguro.
- Frontend renderiza central, settings e wizard.


## Assistente Universal - validacao

Adicionado assistente universal para configurar e validar API publica, IA, n8n, WhatsApp/Evolution, Home Assistant, financeiro, documentos/RAG, monitoramento, backup, mobile/PWA e seguranca. O resumo final fica em `/integrations/setup-summary`.

Complemento aplicado: o painel agora mostra informativos de orientacao para cada pendencia operacional real, explicando o que cada etapa faz, como configurar e como validar sem expor credenciais.


## Voz premium original 2026-05-17

Implementado o modo `JARVIS BR Premium`, uma voz original do projeto, sem clonagem de ator/personagem e sem uso de amostras protegidas. A experiencia usa SpeechSynthesis local, configuracoes em `/settings/voice`, modo conversa em `/voice`, central `/jarvis-mode` e integracao com `/mobile-assistant`.

Ressalva: a qualidade final depende das vozes disponiveis no navegador/sistema. Para resultado mais grave/elegante, usar rate `0.90` a `0.95`, pitch `0.75` a `0.88`, volume `1` e selecionar voz masculina/neutra pt-BR ou en-GB quando disponivel.

## Fase 14 - JARVIS Super Intelligence Core

O JARVIS agora possui um Brain interno em `/api/brain/*` e painel em `/brain`, com agentes especialistas, roteador de intencoes, ferramentas internas seguras, contexto por memorias/documentos/financeiro/status, feedback/aprendizado e verificador de resposta. O Brain nao treina modelo do zero; ele orquestra OpenAI/Gemini/fallback local com limites de seguranca.

Rotas principais: `/brain`, `/brain/agents`, `/brain/tools`, `/brain/memory`, `/brain/feedback`. Chat e voz usam o Brain mantendo compatibilidade. WhatsApp continua exigindo `ei jarvis` e OFX/CSV continuam exigindo revisao.

## Fase Suprema - consolidacao 2026-05-17

Status final: **APROVADO COM RESSALVAS**.

Validacao executada:

- Docker/PostgreSQL: `jarvis-postgres` healthy em `127.0.0.1:5432`.
- n8n local: `jarvis-n8n` ativo em `127.0.0.1:15678`, HTTP 200.
- Backend: audit sem vulnerabilidades, Prisma OK, seed pessoal OK, **41 testes passaram**, validate OK, build OK.
- Frontend: audit sem vulnerabilidades, **15 testes passaram**, validate OK, build OK.
- Scripts: `status-jarvis.ps1`, `validate-jarvis.ps1`, `backup-jarvis.ps1`, `status-n8n.ps1` executados; backup local criado em pasta ignorada pelo Git.
- Smoke visual local: `/tasks`, `/n8n`, `/whatsapp`, `/documents`, `/finance/import`, `/smart-home`, `/integrations/setup-wizard`, `/brain` e `/voice` carregaram sem crash.

Ressalvas reais:

1. Evolution API/WhatsApp real depende de credenciais e pareamento QR real.
2. Home Assistant real depende de URL/token.
3. n8n producao depende de `.env`, Basic Auth, Caddy/DNS e importacao real de workflows.
4. E2E Playwright completo segue planejado.
5. pgvector/embeddings externos seguem preparados, mas nao ativados por padrao.
6. Deploy remoto deve ser feito somente por canal seguro, sem imprimir credenciais.

## Fase 3.0 - producao real, integracoes reais, E2E e uso diario

Status: **APROVADO COM RESSALVAS**.

Validado/preparado:

- Backend: audit, Prisma, seed pessoal, testes, validate e build.
- Frontend: audit, testes, validate e build.
- PostgreSQL local: healthy.
- n8n local: ativo em `127.0.0.1:15678`.
- Backup local: executado em pasta ignorada pelo Git.
- Deploy real: documentado em `DEPLOY_REAL_PRODUCTION_PHASE.md`.
- n8n producao: checklist de Caddy, Basic Auth, `N8N_ENCRYPTION_KEY`, `WEBHOOK_URL` e workflows.
- WhatsApp/Evolution: fluxo QR/webhook preparado, depende de credencial real para pareamento.
- Financeiro: OFX/CSV continuam exigindo revisao.
- Home Assistant: documentado em `HOME_ASSISTANT_SETUP.md`, depende de token real.
- Monitoramento e backup offsite: preparados, dependem de servicos externos.
- E2E Playwright: plano atualizado; script ainda nao ativo.

Ressalvas: credenciais reais, deploy remoto, Caddy/DNS, Home Assistant, backup offsite e monitoramento externo exigem acao manual segura.

## 2026-10-15 - Health detalhado protegido

- Implementado middleware JWT em `/api/health/full` e status das integrações por usuário.
- Teste cobre HTTP 401 sem sessão e HTTP 200 autenticado. `npm run validate` executado: typecheck passou; teste de integração local não iniciou por ausência de `DATABASE_URL` e `JWT_SECRET`; frontend passou typecheck, 35 testes e build.
- O pipeline CI fornece PostgreSQL e executa os testes de integração completos antes do deploy.

### Deploy e smoke em produção — 2026-10-15

- GitHub Actions CI `38732564543`: validate, desktop e android concluídos com sucesso.
- Deploy `d9487c4` em release isolada da VPS; imagem anterior retida para rollback. Apenas `jarvis-backend` foi recriado.
- Verificações públicas: site 200, health resumido 200; health detalhado 401 sem sessão. Teste interno autenticado do health detalhado 200, banco/app OK, versão 2.0.0 e sem segredo detectado na resposta.
- n8n e WhatsApp/Evolution estão configurados nas preferências persistidas do usuário autenticado; a conectividade desses provedores não foi chamada nesta verificação. Home Assistant ainda não configurado e seu hostname público não resolve.

Verificação segura da Evolution: GET de estado da instância retornou sucesso e sessão `open`, sem enviar mensagem. Esse teste confirma a conexão atual; não valida webhook, resposta automática ou execução de workflows.

### Voz no navegador — seleção masculina

A seleção local não considera mais “Brasil” como indicador de voz masculina e prioriza nomes masculinos pt-BR como Antonio/Antônio. Um teste garante que a voz Google genérica não tenha prioridade sobre uma voz masculina brasileira instalada. Naquela verificação, não havia chave nem voice ID salvos nos provedores remotos; a consulta real de cotas retornou `not_configured`. A aplicação não consegue criar a voz natural do JARVIS até que uma credencial válida e um ID de voz sejam configurados em `/settings/integrations`.

### Confirmação de produção da seleção de voz

Frontend da release `91d297c` publicado após CI verde. Página e bundle públicos HTTP 200; bundle conferido com o seletor novo e sem a regra antiga de gênero baseada em “Brasil”. Health público permanece 200 e health detalhado 401 sem autenticação. Em tempo de execução, o usuário ainda está selecionado em `browser`; a consulta de cotas retornou `not_configured` para os três serviços externos porque faltam as chaves e os voice IDs. Não foi possível validar síntese premium. Configure em `/settings/integrations` e use `auto`; a chave Fish Audio anteriormente compartilhada precisa ser rotacionada antes de voltar a ser usada.

### Correção da seleção automática e dos testes de voz — 2026-10-15

Frontend: `npm run validate` passou (8 arquivos, 37 testes e build). Backend: typecheck, build e teste isolado do parser passaram (3 testes). A suíte completa local não pôde rodar porque este checkout não tem `DATABASE_URL` e `JWT_SECRET`; o teste de integração depende também de um PostgreSQL disponível. A alteração reconhece crédito grátis da Fish Audio sem saldo numérico e faz os botões de carregar vozes/testar persistirem a configuração atual antes de consultar o provedor. A síntese real ainda não foi confirmada porque nenhuma chave/voice ID foi fornecida à produção.

CI do GitHub para `1cd1170` concluída com sucesso (validate, desktop e android). Release implantada em `/opt/jarvis-home-assistant/releases/jarvis-1cd1170`; frontend/backend foram recriados sem dependências, e PostgreSQL/n8n permaneceram ativos. Testes de produção: `/settings/integrations` 200, `/api/health/public` 200, e o bundle compilado contém as novas mensagens/rotina. Naquela versão, o status TTS era `browser` e não havia configuração remota Fish Audio ou ElevenLabs. Assim, validação real de síntese premium aguardava chaves e voice IDs válidos fornecidos pelo painel.

Auditoria posterior do OpenAPI oficial Fish Audio confirmou que a elegibilidade de crédito grátis requer `check_free_credit=true`. Backend `116225f` passou na CI completa (validate, desktop e android) e foi publicado em `/opt/jarvis-home-assistant/releases/jarvis-116225f`, recriando somente o backend. Health público e página de integrações retornaram HTTP 200; os containers frontend, backend, PostgreSQL e n8n estão rodando. Typecheck/build backend, 3 testes focados do parser e frontend validate (37 testes) passaram localmente. A conta de produção não tem chave, portanto não foi feita requisição autenticada à Fish Audio nem teste real de áudio.

### Seleção automática de voz por cota confirmada — 2026-10-15

O modo automático agora só tenta provedores remotos quando a cota está confirmada como disponível e suficiente para o texto. Uma cota desconhecida, indisponível ou insuficiente faz o sistema seguir para o próximo provedor, evitando chamadas remotas sem confirmação de saldo. Adicionado teste unitário para os quatro estados relevantes.

Validação local nesta alteração: backend typecheck/build e 4 testes focados passaram; frontend validate passou com 37 testes e build. A suíte completa de backend depende do PostgreSQL e das variáveis de teste providas pela CI. CI do GitHub `38765847066` concluiu com sucesso nos jobs validate, desktop e android. Release `bb72343` publicada em `/opt/jarvis-home-assistant/releases/jarvis-bb72343` após build Docker sem cache; somente backend e frontend foram recriados, sem migrations. Smoke tests: integração pública 200, health API público 200, health interno 200 e bundle frontend contém o texto atualizado. Backend, frontend, PostgreSQL e n8n continuam ativos. Síntese remota real permanece pendente de novas chaves e voice IDs válidos configurados em produção.

### Voz Google feminina e teste de reprodução — publicada em 2026-10-15

Causa identificada: o seletor local tinha a primeira voz pt-BR como fallback e mantinha prioridade para uma Google voiceURI salva. Agora uma voz salva só é aceita se o nome identifica uma voz masculina; a seleção procura primeiro pt-BR, depois outras vozes portuguesas e por fim vozes masculinas de outros idiomas. Sem voz reconhecível, não chama a voz Google genérica.

A página `/settings/voice` corrige a preferência local antiga, lista somente vozes masculinas identificáveis e explica quando nenhuma está instalada. O botão de teste aguarda `onend` e mostra conclusão, erro, timeout ou ausência de voz. Testes simulam a Google antiga salva com uma voz masculina disponível, apenas Google disponível, e os eventos `onstart`/`onend`.

Validação frontend: `npm run validate` passou, 8 arquivos/43 testes e build. Backend permaneceu sem alterações; seu `npm run validate` local concluiu Prisma e typechecks, e 22 testes independentes passaram, mas a suíte de integração interrompeu por ausência de `DATABASE_URL` e `JWT_SECRET`. A CI `38772235880` passou nos jobs validate, desktop e android, com suíte completa de backend e frontend. Release `73dec7f` publicada em `/opt/jarvis-home-assistant/releases/jarvis-73dec7f`, recriando só o frontend. Página `/settings/voice`, bundle público, health API público, frontend interno e API interna retornaram HTTP 200; bundle conferido com a proteção nova. Backend, PostgreSQL e n8n permaneceram ativos. O navegador desta sessão está deslogado e a VPS não tem chaves/voice IDs remotos, portanto não foi possível ouvir áudio real do usuário; os testes automatizados simulam os eventos de início/fim e garantem que a Google genérica não seja chamada como substituta masculina.

### Piper local — publicada em 2026-10-15

- O fluxo ativo aceita Piper local e mantém Fish Audio/ElevenLabs. Seleções antigas de navegador passam para modo automático, que prioriza Piper.
- Foi criado serviço Docker privado com pt_BR-cadu-medium, geração WAV, texto limitado a 1.000 caracteres e limite de 1 CPU/512 MB. /api/voice/speech preserva MP3 remoto e responde audio/wav para Piper. Nenhuma porta do serviço é publicada no host.
- Validação local: build TypeScript backend passou; 4 testes focados do cliente Piper passaram; frontend validate passou (43 testes e build). CI `38775757022` concluiu com sucesso nos jobs validate, desktop e android.
- VPS: 4 vCPUs, 7.8 GiB RAM, nenhum GPU, 3.7 GiB disponíveis e 2.1 GiB de swap usada. Kokoro e Chatterbox não foram instalados para proteger os demais sistemas; precisam de benchmark e limites comprovados.
- Release `c3899e0` publicada em `/opt/jarvis-home-assistant/releases/jarvis-c3899e0`, recriando apenas Piper, backend e frontend; PostgreSQL, n8n e outros projetos não foram reiniciados. A rota autenticada `/api/voice/speech` retornou HTTP 200 com `audio/wav`, provedor `piper` e WAV válido; health interno, API pública e site público retornaram HTTP 200. Uma fala de validação foi sintetizada em 2,19 s; Piper ficou saudável, com cerca de 260 MiB de RAM de 512 MiB e 0,34% de CPU no momento da coleta. A reprodução física no dispositivo do usuário não pôde ser ouvida nesta sessão.
- Piper é GPL-3.0; o repositório da voz cadu atualmente informa MIT para os artefatos e CC0 para o dataset, mas registra fine-tuning sobre Lessac. Ver `tts/piper/NOTICE.md` e confirmar direitos antes de redistribuir ou usar comercialmente.

### Diagnóstico do teste de voz — 2026-10-15

O teste em Configurações > Voz agora exibe a mensagem segura retornada pela API TTS quando a geração falha, incluindo status HTTP quando disponível. Se o navegador bloquear a reprodução ou o dispositivo não conseguir tocar o áudio gerado, a interface apresenta essa causa separadamente. A seleção do navegador continua recusando fallback para a voz Google genérica. Frontend `npm run validate` passou com 45 testes e build; backend Prisma/typechecks/build e 26 testes sem a suíte de integração passaram. A suíte integrada local exige `DATABASE_URL` e `JWT_SECRET`; a CI executada no push valida com PostgreSQL descartável.

### Downloads JARVIS 2.0.0 — 2026-10-15

A Central de Downloads foi preparada para oferecer o EXE Windows x64 e o APK Android assinado como assets da release pública `v2.0.0`, com checksums e QR code direto para o APK. O APK recompilado a partir desta revisão foi validado com apksigner; package `br.com.juninnzxtec.jarvis.twa`, versão `2.0.0` (code `20000`) e fingerprint compatível com o `assetlinks.json`. O workflow de release compila o instalador Windows e publica os arquivos no GitHub. Frontend foi validado com 47 testes e build; backend typecheck/build e 3 testes focados passaram. A suíte de integração backend depende de `DATABASE_URL` e `JWT_SECRET`. A página ainda precisa de deploy na VPS; SSH de produção não autenticou nesta sessão.

Deploy da melhoria de diagnóstico — commit `13cf8af`, CI `38783407549` concluída com sucesso nos jobs validate, desktop e android. Release criada em `/opt/jarvis-home-assistant/releases/jarvis-13cf8af`; apenas o frontend foi compilado e recriado. A imagem anterior foi preservada como `jarvis-home-assistant-frontend:rollback-13cf8af`. Site e API pública retornaram HTTP 200; health reportou aplicação, banco e scheduler `ok`; Piper permaneceu saudável; backend, PostgreSQL e n8n não foram recriados. O bundle publicado contém os diagnósticos de falha de TTS e bloqueio de reprodução pelo navegador.
# Revisão de prosódia TTS — 15/10/2026

- Os controles de prosódia do ElevenLabs são persistidos por usuário, limitados no backend e aplicados na chamada oficial de síntese.
- Teste audível real permanece necessário no painel para avaliar timbre e pronúncia da voz disponível na conta.
- Não se promete reprodução idêntica da atuação vocal dos filmes; a configuração busca um estilo original, masculino e cinematográfico.

## Diagnóstico de interações — 15/10/2026

- Health público da API: HTTP 200; banco `ok`; OpenAI/Gemini configurados; n8n/WhatsApp/Home Assistant não configurados no health público.
- Corrigido o uso de configurações por usuário pelas ferramentas do Brain para Home Assistant e n8n.
- O chat não engole mais erros de solicitação; o texto fica disponível para nova tentativa. Chat e voz recebem timeout específico de 90 segundos.
- A suíte completa do backend local precisa de `DATABASE_URL` e `JWT_SECRET`, ausentes neste ambiente. Os testes locais de integração autenticada com IA/Home Assistant não puderam ser executados.
- SSH de produção recusou autenticação; alterações ainda não implantadas.

## Validação isolada SEC-001/SEC-004 — 16/10/2026

Implementação local em revisão; não implantada. PostgreSQL 15.19 temporário aplicou a migration sobre uma base com duas mensagens legadas; rollback e reaplicação preservaram os dois registros. Schema Prisma válido. Backend `npm run validate` passou (9 arquivos/82 testes), frontend passou (8/47) e desktop passou (4); builds e typechecks passaram.

Os casos verificam segredo ausente/incorreto/correto, evento inválido, instância e remetente, replay/idempotência persistida, rate limit, segredo cifrado, isolamento de usuário, base64 válida/excessiva e rejeição de URL externa sem fetch. Não houve mensagem WhatsApp real, chamada a provedor de IA, E2E Evolution ou teste na VPS. O parser HTTP do Express permanece com limite JSON de 1 MiB; o teto de 8 MiB pertence ao decodificador interno.

Auditoria `npm audit --omit=dev --audit-level=moderate` retornou zero vulnerabilidades de produção em backend, frontend e desktop. `npm ci` do desktop reportou oito advisories moderados na árvore de desenvolvimento; dependências não foram atualizadas. Android não foi validado localmente por falta de JDK/SDK e depende da CI. A automação horária permanece PAUSED. Evidências completas em `docs/jarvis/TEST_EVIDENCE.md`.
